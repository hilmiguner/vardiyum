import assert from 'node:assert/strict';
import test from 'node:test';
import { DatabaseSync } from 'node:sqlite';

import {
  INITIAL_SCHEMA, MIGRATION_2_SQL, MIGRATION_3_SQL, MIGRATION_4_SQL,
  MIGRATION_5_SQL, MIGRATION_6_SQL, MIGRATION_7_SQL, MIGRATION_8_SQL,
} from '../src/data/schema.ts';
import { writePayPeriodStartDay } from '../src/domain/pay-period-settings.ts';
import {
  appendCustomAdjustmentAttribution,
} from '../src/domain/custom-adjustment-attribution-store.ts';
import {
  appendCustomFixedBaseRevision,
} from '../src/domain/custom-fixed-base-store.ts';
import { appendFixedOvertimeRevision } from '../src/domain/custom-fixed-overtime-store.ts';
import { appendCustomPayBreakRevision } from '../src/domain/custom-pay-break-store.ts';
import {
  loadCustomPayCombinedFromStore,
} from '../src/domain/custom-pay-combined-store.ts';
import { combineCustomPayPeriodComponents } from '../src/domain/custom-pay-combined.ts';
import { loadCustomPayProfilePreviewFromStore } from '../src/domain/custom-pay-profile-preview-store.ts';
import {
  loadCustomHourlyEstimateFromStore,
} from '../src/domain/custom-hourly-work-store.ts';
import {
  loadCustomAdjustmentReportFromStore,
  readCustomAdjustmentHistory,
} from '../src/domain/custom-adjustment-attribution-store.ts';
import {
  attributionEventKey,
} from '../src/domain/custom-adjustment-attribution.ts';

const PERIOD='2026-10';
const NEXT='2026-11';
const ZONE='Europe/Istanbul';
const DAY=26;
const STAMP1='2026-11-16T08:00:00.000Z';
const STAMP2='2026-11-16T08:01:00.000Z';
const STAMP3='2026-11-16T08:02:00.000Z';

function profile(model='hourly',overrides={}){
  return {
    id:'pay_oct',effectiveFrom:'2026-10-01',model,currency:'TRY',
    baseMinorUnits:model==='hourly'?10_000:2_750_099,
    overtimeHourlyMinorUnits:model==='hourly'?0:20_000,
    overtimeAfterMinutes: model==='hourly'?180:60,
    overtimeMultiplierNumerator:3,overtimeMultiplierDenominator:2,
    revision:1,...overrides,
  };
}
function adjustment(overrides={}){
  return {
    id:'bonus_nov',periodKey:'2026-11',kind:'bonus',currency:'TRY',
    amountMinorUnits:123_456,note:'User-reported bonus',
    createdAt:'2026-11-10T10:00:00.000Z',...overrides,
  };
}
function work(overrides={}){
  return {
    id:'work_nov',localDate:'2026-11-10',endDate:'2026-11-10',
    timeZone:ZONE,startInstantUtc:'2026-11-10T05:00:00.000Z',
    endInstantUtc:'2026-11-10T07:00:00.000Z',
    breakMinutes:0,...overrides,
  };
}
function dbV8(){
  const db=new DatabaseSync(':memory:');
  db.exec('PRAGMA foreign_keys=ON');
  for(const sql of [
    INITIAL_SCHEMA,MIGRATION_2_SQL,MIGRATION_3_SQL,MIGRATION_4_SQL,
    MIGRATION_5_SQL,MIGRATION_6_SQL,MIGRATION_7_SQL,MIGRATION_8_SQL,
  ]) db.exec('BEGIN IMMEDIATE;'+sql+'COMMIT;');
  return db;
}
function store(db) {
  return {
    async getFirstAsync(sql,...values){return db.prepare(sql).get(...values)??null;},
    async getAllAsync(sql,...values){return db.prepare(sql).all(...values);},
    async runAsync(sql,...values){return db.prepare(sql).run(...values);},
  };
}
async function fixture(model='hourly',override={}){
  const db=dbV8();
  await writePayPeriodStartDay(store(db),DAY);
  insertProfile(db,profile(model,override));
  return db;
}
function insertProfile(db,p){
  db.prepare(
    'INSERT INTO earnings_profiles(id,effective_from,model,currency,base_minor_units,'+
    'overtime_hourly_minor_units,overtime_after_minutes,overtime_multiplier_numerator,'+
    "overtime_multiplier_denominator,revision,source) VALUES(?,?,?,?,?,?,?,?,?,?,'user_entered')"
  ).run(p.id,p.effectiveFrom,p.model,p.currency,p.baseMinorUnits,
    p.overtimeHourlyMinorUnits,p.overtimeAfterMinutes,
    p.overtimeMultiplierNumerator,p.overtimeMultiplierDenominator,p.revision);
}
function insertAdjustment(db,a=adjustment()){
  db.prepare(
    'INSERT INTO earnings_adjustments(id,period_key,kind,currency,amount_minor_units,'+
    "note,source,created_at) VALUES(?,?,?,?,?,?,'user_entered',?)",
  ).run(a.id,a.periodKey,a.kind,a.currency,a.amountMinorUnits,a.note,a.createdAt);
}
function insertWork(db,w=work()){
  db.prepare(
    'INSERT INTO actual_work_sessions('+
    'id,local_date,start_clock,end_date,end_clock,timezone_id,start_choice,end_choice,'+
    'start_instant_utc,end_instant_utc,break_minutes,note) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)'
  ).run(w.id,w.localDate,'08:00',w.endDate,'10:00',w.timeZone,'reject','reject',
    w.startInstantUtc,w.endInstantUtc,w.breakMinutes,'Real work entered by user');
}
async function trx(db,fn) {
  db.exec('BEGIN IMMEDIATE');
  try{const output=await fn(store(db));db.exec('COMMIT');return output;}
  catch(e){db.exec('ROLLBACK');throw e;}
}
async function allocate(db,a=adjustment(),minor=43_211,rev=0,stamp=STAMP1){
  return trx(db, s=>appendCustomAdjustmentAttribution(s,{
    adjustmentId:a.id,startDay:DAY,earlierMinorUnits:minor,expectedRevision:rev,
    reason:'Verified source portion for this custom period',recordedAt:stamp,
  }));
}
async function baseChoice(db,choice='full_base',minor=null,rev=0,stamp=STAMP1){
  return trx(db,s=>appendCustomFixedBaseRevision(s,{
    periodKey:PERIOD,startDay:DAY,scheduleTimeZone:ZONE,
    choice,partialBaseMinorUnits:minor,expectedRevision:rev,
    reason:'I expressly selected this fixed base amount',recordedAt:stamp,
  }));
}
async function consent(db,decision='include_logged_overtime',rev=0,stamp=STAMP2) {
  return trx(db,s=>appendFixedOvertimeRevision(s,{
    periodKey:PERIOD,startDay:DAY,scheduleTimeZone:ZONE,
    decision,expectedRevision:rev,
    reason:'I expressly chose my fixed overtime policy',recordedAt:stamp,
  }));
}
async function boundaryBreak(db,workId='work_cross',portionMinutes=10){
  return trx(db,s=>appendCustomPayBreakRevision(s,{
    workId,startDay:DAY,startPeriodBreakMinutes:portionMinutes,
    expectedRevision:0,reason:'I assigned this break to custom pay periods',
    recordedAt:STAMP1,
  }));
}
const report=(db,key=PERIOD,zone=ZONE)=>
  loadCustomPayCombinedFromStore(store(db),key,zone);

test('custom day 1 remains legacy calendar-month, with no independent new combined money',async()=>{
  const db=await fixture();
  try{
    await writePayPeriodStartDay(store(db),1);
    assert.deepEqual(await report(db),{status:'disabled',periodKey:PERIOD,startDay:1});
    assert.equal(db.prepare('PRAGMA user_version').get().user_version,8);
  }finally{db.close();}
});

test('one immutable hourly profile, real UTC work, no adjustments: exact base-only WORK sum',async()=>{
  const db=await fixture();
  try{
    insertWork(db);
    const r=await report(db);
    assert.equal(r.status,'estimated');
    assert.equal(r.model,'hourly_actual_work');
    assert.equal(r.currency,'TRY');
    assert.equal(r.fixedBaseMinorUnits,0);
    assert.equal(r.regularWorkMinorUnits,20_000);
    assert.equal(r.overtimeMinorUnits,0);
    assert.equal(r.adjustmentMinorUnits,0);
    assert.equal(r.totalMinorUnits,20_000);
    assert.equal(r.loggedSeconds,7200);
    assert.deepEqual(r.profiles,[{id:'pay_oct',revision:1}]);
    assert.equal(r.workLines[0].workId,'work_nov');
    assert.equal(r.workLines[0].segmentStartUtc,'2026-11-10T05:00:00.000Z');
    assert.equal(r.disclaimer,'USER_REPORTED_PRE_TAX_ESTIMATE');
    assert.equal(r.scope,'CUSTOM_USER_REPORTED_PRE_TAX_COMBINED_ESTIMATE');
  }finally{db.close();}
});

test('hourly work plus one explicitly allocated November bonus: exact signed total',async()=>{
  const db=await fixture();
  try{
    insertWork(db);
    insertAdjustment(db);
    assert.equal((await report(db)).status,'blocked');
    const audit=await allocate(db);
    const r=await report(db);
    assert.equal(r.status,'estimated');
    assert.equal(r.earningsMinorUnits,20_000);
    assert.equal(r.adjustmentMinorUnits,43_211);
    assert.equal(r.totalMinorUnits,63_211);
    assert.equal(r.adjustmentLines.length,1);
    const line=r.adjustmentLines[0];
    assert.equal(line.sourceId,'bonus_nov');
    assert.equal(line.sourceCalendarMonth,'2026-11');
    assert.equal(line.sourceAmountMinorUnits,123_456);
    assert.equal(line.selectedMinorUnits,43_211);
    assert.equal(line.laterMinorUnits,80_245);
    assert.equal(line.attributionRevision,audit.revision);
    assert.equal(line.attributionRecordedAt,STAMP1);
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM earnings_adjustments').get().n,1);
    const sibling=await report(db,NEXT);
    assert.equal(sibling.status,'blocked'); // no logged work in sibling; never invent hours
    const allocatedSibling=await loadCustomAdjustmentReportFromStore(store(db),NEXT);
    assert.equal(allocatedSibling.status,'verified');
    assert.deepEqual(allocatedSibling.totals,[{currency:'TRY',minorUnits:80_245}]);
  }finally{db.close();}
});

test('signed bonus, deduction and correction sum with exact cents and source IDs',async()=>{
  const db=await fixture();
  try{
    insertWork(db);
    const rows=[
      [adjustment(),43_211],
      [adjustment({id:'ded_nov',kind:'deduction',amountMinorUnits:-5_000}),-2_500],
      [adjustment({id:'corr_nov',kind:'correction',amountMinorUnits:-7_001}),-1_501],
    ];
    for(const [a,n] of rows){insertAdjustment(db,a);await allocate(db,a,n);}
    const r=await report(db);
    assert.equal(r.status,'estimated');
    assert.equal(r.adjustmentMinorUnits,39_210);
    assert.equal(r.earningsMinorUnits,20_000);
    assert.equal(r.totalMinorUnits,59_210);
    assert.deepEqual(r.adjustmentLines.map(l=>l.selectedMinorUnits),[43_211,-2_500,-1_501]);
    assert.equal(new Set(r.adjustmentLines.map(l=>l.sourceId)).size,3);
    assert.equal(r.adjustmentLines.reduce((s,l)=>s+l.selectedMinorUnits,0),39_210);
  }finally{db.close();}
});

test('a single pending additional monthly source blocks FULL combined amount, not merely that source',async()=>{
  const db=await fixture();
  try{
    insertWork(db);
    insertAdjustment(db);
    await allocate(db);
    assert.equal((await report(db)).status,'estimated');
    insertAdjustment(db,adjustment({id:'new_deduction',kind:'deduction',amountMinorUnits:-100}));
    const next=await report(db);
    assert.equal(next.status,'blocked');
    assert.ok(next.reasons.includes('CUSTOM_COMBINED_UNATTRIBUTED_ADJUSTMENTS'));
    assert.equal('totalMinorUnits' in next,false);
    assert.equal('adjustmentLines' in next,false);
  }finally{db.close();}
});

test('different currency source blocks combined money, EVEN if its assigned share is zero',async()=>{
  const db=await fixture();
  try{
    insertWork(db);
    insertAdjustment(db,adjustment({currency:'USD'}));
    await allocate(db,adjustment({currency:'USD'}),0);
    const r=await report(db);
    assert.equal(r.status,'blocked');
    assert.ok(r.reasons.includes('CUSTOM_COMBINED_CURRENCY_MISMATCH_NO_FX'));
    assert.equal('totalMinorUnits' in r,false);
  }finally{db.close();}
});

test('same source attribution corrected rev2 updates combined total and retains original event',async()=>{
  const db=await fixture();
  try{
    insertWork(db);insertAdjustment(db);
    await allocate(db);
    const old=await report(db);
    const eventKey=attributionEventKey(DAY,'bonus_nov',1);
    const previous=db.prepare('SELECT value FROM app_settings WHERE key=?').get(eventKey).value;
    await allocate(db,adjustment(),50_000,1,STAMP2);
    const updated=await report(db);
    assert.equal(updated.status,'estimated');
    assert.equal(updated.totalMinorUnits,70_000);
    assert.equal(updated.adjustmentLines[0].attributionRevision,2);
    assert.equal(updated.adjustmentLines[0].earlierMinorUnits,50_000);
    assert.equal(updated.adjustmentLines[0].laterMinorUnits,73_456);
    assert.equal(old.totalMinorUnits,63_211);
    assert.equal(db.prepare('SELECT value FROM app_settings WHERE key=?').get(eventKey).value,previous);
    assert.equal((await readCustomAdjustmentHistory(store(db),'bonus_nov',DAY)).length,2);
  }finally{db.close();}
});

test('calendar adjustment modified outside app invalidates combined report without mutating saved audit',async()=>{
  const db=await fixture();
  try{
    insertWork(db);insertAdjustment(db);await allocate(db);
    db.prepare('UPDATE earnings_adjustments SET amount_minor_units=? WHERE id=?')
      .run(555_555,'bonus_nov');
    const r=await report(db);
    assert.equal(r.status,'blocked');
    assert.ok(r.reasons.includes('CUSTOM_COMBINED_UNATTRIBUTED_ADJUSTMENTS'));
    assert.equal('totalMinorUnits' in r,false);
  }finally{db.close();}
});

test('fixed full base plus user-approved overtime plus allocated bonus is combined ONCE',async()=>{
  const db=await fixture('monthly_fixed');
  try{
    await baseChoice();
    await consent();
    insertWork(db);
    insertAdjustment(db);await allocate(db);
    const r=await report(db);
    assert.equal(r.status,'estimated');
    assert.equal(r.model,'monthly_fixed');
    assert.equal(r.baseRevision,1);
    assert.equal(r.overtimeConsentRevision,1);
    assert.equal(r.overtimeDecision,'include_logged_overtime');
    assert.equal(r.fixedBaseMinorUnits,2_750_099);
    assert.equal(r.regularWorkMinorUnits,0);
    assert.equal(r.overtimeMinorUnits,30_000);
    assert.equal(r.earningsMinorUnits,2_780_099);
    assert.equal(r.adjustmentMinorUnits,43_211);
    assert.equal(r.totalMinorUnits,2_823_310);
    assert.equal(r.loggedSeconds,7200);
    assert.equal(r.overtimeSeconds,3600);
    assert.equal(r.workLines[0].kind,'fixed_overtime');
    assert.equal(r.workLines[0].amountMinorUnits,30_000);
    assert.equal(db.prepare('SELECT base_minor_units FROM earnings_profiles').get().base_minor_units,2_750_099);
  }finally{db.close();}
});

test('explicit fixed overtime EXCLUDE consents to base plus signed adjustment without extra overtime',async()=>{
  const db=await fixture('monthly_fixed');
  try{
    await baseChoice('explicit_partial_base',1_234_500);
    await consent('exclude_logged_overtime');
    insertWork(db);
    insertAdjustment(db);await allocate(db);
    const r=await report(db);
    assert.equal(r.status,'estimated');
    assert.equal(r.overtimeDecision,'exclude_logged_overtime');
    assert.equal(r.fixedBaseMinorUnits,1_234_500);
    assert.equal(r.overtimeMinorUnits,0);
    assert.equal(r.loggedSeconds,0);
    assert.equal(r.workLines.length,0);
    assert.equal(r.totalMinorUnits,1_277_711);
    assert.equal(r.baseRevision,1);
    assert.equal(r.overtimeConsentRevision,1);
  }finally{db.close();}
});

test('no explicit fixed base or no explicit overtime decision never yields combined money',async()=>{
  const db=await fixture('monthly_fixed');
  try{
    insertAdjustment(db);await allocate(db);
    const a=await report(db);
    assert.equal(a.status,'blocked');
    assert.equal('totalMinorUnits' in a,false);
    await baseChoice();
    const b=await report(db);
    assert.equal(b.status,'blocked');
    assert.ok(b.reasons.some(x=>x.startsWith('CUSTOM_COMBINED_FIXED_OT_NOT_APPROVED')));
    assert.equal('totalMinorUnits' in b,false);
  }finally{db.close();}
});

test('fixed base correction makes old overtime consent stale; reapprove safely reprices',async()=>{
  const db=await fixture('monthly_fixed');
  try{
    await baseChoice();await consent();
    insertWork(db);
    insertAdjustment(db);await allocate(db);
    assert.equal((await report(db)).status,'estimated');
    await baseChoice('explicit_partial_base',1_000_000,1,STAMP2);
    const stale=await report(db);
    assert.equal(stale.status,'blocked');
    assert.equal('totalMinorUnits' in stale,false);
    await consent('include_logged_overtime',1,STAMP3);
    const current=await report(db);
    assert.equal(current.status,'estimated');
    assert.equal(current.baseRevision,2);
    assert.equal(current.overtimeConsentRevision,2);
    assert.equal(current.totalMinorUnits,1_073_211);
  }finally{db.close();}
});

test('missing source-bound custom period break blocks fixed combined pay',async()=>{
  const db=await fixture('monthly_fixed');
  try{
    await baseChoice();await consent();
    insertWork(db,work({
      id:'work_cross',
      localDate:'2026-11-25',
      endDate:'2026-11-26',
      startInstantUtc:'2026-11-25T20:00:00.000Z',
      endInstantUtc:'2026-11-26T04:00:00.000Z',
      breakMinutes:30,
    }));
    const blocked=await report(db);
    assert.equal(blocked.status,'blocked');
    assert.equal('totalMinorUnits' in blocked,false);
    await boundaryBreak(db);
    const valid=await report(db);
    assert.equal(valid.status,'estimated');
    assert.equal(valid.workLines[0].breakAuditRevision,1);
    assert.equal(valid.loggedSeconds,50*60);
    assert.equal(valid.overtimeSeconds,0);
    assert.equal(valid.totalMinorUnits,2_750_099);
  }finally{db.close();}
});

test('hourly total applies one threshold in same special period, no duplicates',async()=>{
  const db=await fixture('hourly',{overtimeAfterMinutes:60});
  try{
    insertWork(db);
    const r=await report(db);
    assert.equal(r.status,'estimated');
    assert.equal(r.regularWorkMinorUnits,10_000);
    assert.equal(r.overtimeMinorUnits,15_000);
    assert.equal(r.totalMinorUnits,25_000);
    assert.equal(r.loggedSeconds,7200);
    assert.equal(r.overtimeSeconds,3600);
    assert.deepEqual(r.workLines.map(x=>x.kind),['hourly_regular','hourly_overtime']);
    assert.equal(r.workLines.reduce((sum,l)=>sum+l.amountMinorUnits,0),25_000);
  }finally{db.close();}
});

test('two effective hourly rates in one custom period retain profile IDs, revisions and one overtime threshold',async()=>{
  const db=await fixture('hourly');
  try{
    insertProfile(db,profile('hourly',{
      id:'pay_nov',effectiveFrom:'2026-11-01',baseMinorUnits:20_000,
    }));
    insertWork(db,work({
      id:'work_oct',localDate:'2026-10-30',endDate:'2026-10-30',
      startInstantUtc:'2026-10-30T05:00:00.000Z',
      endInstantUtc:'2026-10-30T07:00:00.000Z',
    }));
    insertWork(db,work({
      id:'work_late',localDate:'2026-11-10',endDate:'2026-11-10',
      startInstantUtc:'2026-11-10T05:00:00.000Z',
      endInstantUtc:'2026-11-10T08:00:00.000Z',
    }));
    insertAdjustment(db);await allocate(db,adjustment(),2_000);
    const r=await report(db);
    assert.equal(r.status,'estimated');
    assert.deepEqual(r.profiles,[{id:'pay_oct',revision:1},{id:'pay_nov',revision:1}]);
    assert.equal(r.earningsMinorUnits,100_000);
    assert.equal(r.adjustmentMinorUnits,2_000);
    assert.equal(r.totalMinorUnits,102_000);
    assert.equal(r.loggedSeconds,5*3600);
    assert.equal(r.overtimeSeconds,2*3600);
    assert.deepEqual(new Set(r.workLines.map(x=>x.profileId)),
      new Set(['pay_oct','pay_nov']));
  }finally{db.close();}
});

test('mixed monthly_fixed profiles inside custom period require separate explicit transition policy',async()=>{
  const db=await fixture('monthly_fixed');
  try{
    insertProfile(db,profile('monthly_fixed',{
      id:'pay_nov',effectiveFrom:'2026-11-01',baseMinorUnits:3_100_000,
    }));
    const r=await report(db);
    assert.equal(r.status,'blocked');
    assert.ok(r.reasons.includes('CUSTOM_COMBINED_MIXED_FIXED_PROFILE_POLICY_REQUIRED'));
    assert.equal('totalMinorUnits' in r,false);
  }finally{db.close();}
});

test('different effective hourly/fixed models in custom period remain blocked',async()=>{
  const db=await fixture('hourly');
  try{
    insertProfile(db,profile('monthly_fixed',{
      id:'fixed_nov',effectiveFrom:'2026-11-01',
    }));
    const r=await report(db);
    assert.equal(r.status,'blocked');
    assert.ok(r.reasons.includes('CUSTOM_COMBINED_MIXED_FIXED_PROFILE_POLICY_REQUIRED'));
  }finally{db.close();}
});

test('no actual hourly work record means no invented full custom pay estimate',async()=>{
  const db=await fixture();
  try{
    insertAdjustment(db);await allocate(db);
    const r=await report(db);
    assert.equal(r.status,'blocked');
    assert.ok(r.reasons.some(x=>x.startsWith('CUSTOM_COMBINED_HOURLY_WORK_NOT_ESTIMATED')));
    assert.equal('totalMinorUnits' in r,false);
  }finally{db.close();}
});

test('signed adjustments more negative than wages are blocked, not displayed as a negative salary',async()=>{
  const db=await fixture();
  try{
    insertWork(db);
    const deduction=adjustment({
      kind:'deduction',amountMinorUnits:-50_000,id:'deduct_nov',
    });
    insertAdjustment(db,deduction);
    await allocate(db,deduction,-50_000);
    const r=await report(db);
    assert.equal(r.status,'blocked');
    assert.ok(r.reasons.includes('CUSTOM_COMBINED_NEGATIVE_TOTAL_REQUIRES_REVIEW'));
    assert.equal('totalMinorUnits' in r,false);
  }finally{db.close();}
});

test('exact integer minor-unit overflow is fail-closed before any combined amount appears',async()=>{
  const db=await fixture();
  try{
    insertWork(db);
    const big=adjustment({
      id:'huge_nov',amountMinorUnits:999_999_999_999,
    });
    insertAdjustment(db,big);
    await allocate(db,big,999_999_999_999);
    const r=await report(db);
    assert.equal(r.status,'blocked');
    assert.ok(r.reasons.includes('CUSTOM_COMBINED_MONEY_OVERFLOW'));
    assert.equal('totalMinorUnits' in r,false);
  }finally{db.close();}
});

test('pure combiner rejects forged adjustment audit line and contradictory work totals',async()=>{
  const db=await fixture();
  try{
    insertWork(db);insertAdjustment(db);await allocate(db);
    const plan=await loadCustomPayProfilePreviewFromStore(store(db),PERIOD,ZONE);
    const hourly=await loadCustomHourlyEstimateFromStore(store(db),PERIOD,ZONE);
    const adjustments=await loadCustomAdjustmentReportFromStore(store(db),PERIOD);
    const hist=await readCustomAdjustmentHistory(store(db),'bonus_nov',DAY);
    const [latest]=hist;
    const a=combineCustomPayPeriodComponents(
      plan,hourly,null,null,adjustments,[{...latest,earlierMinorUnits:4444}],
    );
    assert.equal(a.status,'blocked');
    assert.ok(a.reasons.includes('CUSTOM_COMBINED_INVALID_ADJUSTMENT_AUDIT'));
    const forged= {
      ...hourly,
      workOnlyMinorUnits:hourly.workOnlyMinorUnits+100,
    };
    const b=combineCustomPayPeriodComponents(
      plan,forged,null,null,adjustments,hist,
    );
    assert.equal(b.status,'blocked');
    assert.ok(b.reasons.includes('CUSTOM_COMBINED_HOURLY_SUM_MISMATCH'));
    const c=combineCustomPayPeriodComponents(plan,hourly,null,null,adjustments,hist);
    assert.equal(c.status,'estimated');
    assert.equal(c.totalMinorUnits,63_211);
  }finally{db.close();}
});

test('source report tampered into duplicate ID or forged currency denies total',async()=>{
  const db=await fixture();
  try{
    insertWork(db);insertAdjustment(db);await allocate(db);
    const plan=await loadCustomPayProfilePreviewFromStore(store(db),PERIOD,ZONE);
    const hourly=await loadCustomHourlyEstimateFromStore(store(db),PERIOD,ZONE);
    const valid=await loadCustomAdjustmentReportFromStore(store(db),PERIOD);
    const hist=await readCustomAdjustmentHistory(store(db),'bonus_nov',DAY);
    const badCurrency={
      ...valid,candidates:[{...valid.candidates[0],currency:'EUR'}],
    };
    const a=combineCustomPayPeriodComponents(plan,hourly,null,null,badCurrency,hist);
    assert.equal(a.status,'blocked');
    assert.ok(a.reasons.includes('CUSTOM_COMBINED_ADJUSTMENT_SOURCE_MISMATCH'));
    const duplicate={
      ...valid,candidates:[valid.candidates[0],valid.candidates[0]],
    };
    const b=combineCustomPayPeriodComponents(plan,hourly,null,null,duplicate,[hist[0],hist[0]]);
    assert.equal(b.status,'blocked');
    assert.ok(b.reasons.includes('CUSTOM_COMBINED_DUPLICATE_ADJUSTMENT'));
  }finally{db.close();}
});

test('SQLite v1→v8, 18 tables, source rows and monthly adjustment originals unchanged',async()=>{
  const db=await fixture('monthly_fixed');
  try{
    await baseChoice();await consent();
    insertWork(db);
    insertAdjustment(db);await allocate(db);
    assert.equal((await report(db)).status,'estimated');
    assert.equal(db.prepare('PRAGMA user_version').get().user_version,8);
    assert.equal(db.prepare(
      "SELECT COUNT(*) AS n FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'",
    ).get().n,18);
    assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(),[]);
    assert.equal(db.prepare('PRAGMA integrity_check').get().integrity_check,'ok');
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM earnings_adjustments').get().n,1);
    assert.equal(db.prepare('SELECT amount_minor_units FROM earnings_adjustments').get().amount_minor_units,123_456);
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM earnings_profiles').get().n,1);
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM actual_work_sessions').get().n,1);
  }finally{db.close();}
});
