import assert from 'node:assert/strict';
import test from 'node:test';
import { DatabaseSync } from 'node:sqlite';

import {
  INITIAL_SCHEMA,
  MIGRATION_2_SQL,
  MIGRATION_3_SQL,
  MIGRATION_4_SQL,
  MIGRATION_5_SQL,
  MIGRATION_6_SQL,
  MIGRATION_7_SQL,
  MIGRATION_8_SQL,
} from '../src/data/schema.ts';
import {
  createCustomFixedBaseEvent,
  decodeCustomFixedBaseHistory,
  eligibleFixedBaseProfile,
  fixedBaseChoiceMatchesPlan,
  fixedBaseEventKey,
  fixedBaseHeadKey,
  fixedBasePrefix,
} from '../src/domain/custom-fixed-base-policy.ts';
import {
  appendCustomFixedBaseRevision,
  loadCustomFixedBaseReportFromStore,
  readCustomFixedBaseHistory,
} from '../src/domain/custom-fixed-base-store.ts';
import { planCustomPayProfiles } from '../src/domain/custom-pay-profile-policy.ts';
import { writePayPeriodStartDay } from '../src/domain/pay-period-settings.ts';
import { estimateCustomHourlyWork } from '../src/domain/custom-hourly-work-estimate.ts';
import { parseMoneyMinor } from '../src/domain/money-text.ts';

const PERIOD = '2026-10';
const DAY = 26;
const ZONE = 'Europe/Istanbul';
const STAMP1 = '2026-11-15T18:00:00.000Z';
const STAMP2 = '2026-11-15T18:01:00.000Z';
const STAMP3 = '2026-11-15T18:02:00.000Z';

function profile(overrides = {}) {
  return {
    id: 'fixed_pay',
    effectiveFrom: '2026-09-01',
    model: 'monthly_fixed',
    currency: 'TRY',
    baseMinorUnits: 2_750_099, // 27,500.99 TRY
    overtimeHourlyMinorUnits: 25_000,
    overtimeAfterMinutes: 160 * 60, // still excluded from BASE-only report
    overtimeMultiplierNumerator: 3,
    overtimeMultiplierDenominator: 2,
    revision: 1,
    ...overrides,
  };
}
function plan(overrides = {}) {
  return planCustomPayProfiles(PERIOD, DAY, ZONE, [profile(overrides)]);
}
function dbV8() {
  const db = new DatabaseSync(':memory:');
  db.exec('PRAGMA foreign_keys=ON');
  for (const sql of [
    INITIAL_SCHEMA,
    MIGRATION_2_SQL,
    MIGRATION_3_SQL,
    MIGRATION_4_SQL,
    MIGRATION_5_SQL,
    MIGRATION_6_SQL,
    MIGRATION_7_SQL,
    MIGRATION_8_SQL,
  ]) db.exec('BEGIN IMMEDIATE;' + sql + 'COMMIT;');
  return db;
}
function store(db) {
  return {
    async getFirstAsync(sql, ...params) {
      return db.prepare(sql).get(...params) ?? null;
    },
    async getAllAsync(sql, ...params) {
      return db.prepare(sql).all(...params);
    },
    async runAsync(sql, ...params) {
      return db.prepare(sql).run(...params);
    },
  };
}
function insertProfile(db, p=profile()) {
  db.prepare(
    'INSERT INTO earnings_profiles(id,effective_from,model,currency,base_minor_units,' +
      'overtime_hourly_minor_units,overtime_after_minutes,overtime_multiplier_numerator,' +
      "overtime_multiplier_denominator,revision,source) VALUES(?,?,?,?,?,?,?,?,?,?,'user_entered')",
  ).run(
    p.id, p.effectiveFrom,p.model,p.currency,p.baseMinorUnits,
    p.overtimeHourlyMinorUnits,p.overtimeAfterMinutes,
    p.overtimeMultiplierNumerator,p.overtimeMultiplierDenominator,p.revision,
  );
}
function addRevision(db, original, revision, overrides={}) {
  const p = { ...original, ...overrides, revision };
  db.prepare(
    'INSERT INTO earnings_profile_revisions(' +
      'profile_id,revision,effective_from,model,currency,base_minor_units,' +
      'overtime_hourly_minor_units,overtime_after_minutes,overtime_multiplier_numerator,' +
      "overtime_multiplier_denominator,reason,recorded_at,source) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,'user_entered')",
  ).run(
    original.id,p.revision,p.effectiveFrom,p.model,p.currency,p.baseMinorUnits,
    p.overtimeHourlyMinorUnits,p.overtimeAfterMinutes,
    p.overtimeMultiplierNumerator,p.overtimeMultiplierDenominator,
    'User corrected salary base','2026-11-15T18:00:00.000Z',
  );
}
async function fixture(p=profile()) {
  const db=dbV8();
  await writePayPeriodStartDay(store(db),DAY);
  insertProfile(db,p);
  return db;
}
function input(choice,partial,revision,time=STAMP1,overrides={}) {
  return {
    periodKey:PERIOD,startDay:DAY,scheduleTimeZone:ZONE,
    choice,partialBaseMinorUnits:partial,expectedRevision:revision,
    reason:'Explicit salary base for my custom pay period',recordedAt:time,
    ...overrides,
  };
}
async function trans(db, fn, overrideStore) {
  db.exec('BEGIN IMMEDIATE;');
  try {
    const result=await fn(overrideStore??store(db));
    db.exec('COMMIT;');
    return result;
  } catch(error) {
    db.exec('ROLLBACK;');
    throw error;
  }
}
async function save(db,choice,partial,revision,time=STAMP1,overrides={},adapter) {
  return trans(db,s=>appendCustomFixedBaseRevision(
    s,input(choice,partial,revision,time,overrides),
  ),adapter);
}
function prefixCount(db) {
  return db.prepare('SELECT COUNT(*) AS n FROM app_settings WHERE substr(key,1,?)=?')
    .get(fixedBasePrefix(PERIOD,DAY).length,fixedBasePrefix(PERIOD,DAY)).n;
}

test('single immutable fixed profile allows explicit choice without inferred calendar days', () => {
  const p=plan();
  assert.equal(p.status,'fixed_salary_assumption_required');
  assert.equal(eligibleFixedBaseProfile(p).baseMinorUnits,2_750_099);
  assert.equal(p.startDate,'2026-10-26');
  assert.equal(p.endDateInclusive,'2026-11-25');
  const full=createCustomFixedBaseEvent(
    p,'full_base',null,1,'Full base user choice',STAMP1,
  );
  assert.equal(full.chosenBaseMinorUnits,2_750_099);
  assert.equal(full.source,'user_entered');
  assert.equal(full.profile.id,'fixed_pay');
  assert.equal(full.profile.revision,1);
  assert.equal(fixedBaseChoiceMatchesPlan(p,full),true);
  assert.throws(
    ()=>createCustomFixedBaseEvent(p,'full_base',1,1,'Full base user choice',STAMP1),
    /FIXED_BASE_FULL_CANNOT_OVERRIDE_AMOUNT/,
  );
});

test('a partial amount is manual EXACT minor currency units, not a calendar-based share', () => {
  const chosen=parseMoneyMinor('12345,67');
  assert.equal(chosen,1_234_567);
  const event=createCustomFixedBaseEvent(
    plan(),'explicit_partial_base',chosen,1,'User entered exact partial base',STAMP1,
  );
  assert.equal(event.chosenBaseMinorUnits,1_234_567);
  assert.equal(event.choice,'explicit_partial_base');
  assert.notEqual(event.chosenBaseMinorUnits,Math.round(2_750_099*25/31));
  assert.equal(createCustomFixedBaseEvent(
    plan(),'explicit_partial_base',0,1,'Unpaid partial period',STAMP1,
  ).chosenBaseMinorUnits,0);
  for (const value of [2_750_099,3_000_000,-1,1.5,null,NaN]) {
    assert.throws(
      ()=>createCustomFixedBaseEvent(
        plan(),'explicit_partial_base',value,1,'Explicit partial amount',STAMP1,
      ),/INVALID_FIXED_BASE_PARTIAL_AMOUNT/,
    );
  }
});

test('no explicit choice means no base total, even if original profile contains salary', async () => {
  const db=await fixture();
  try {
    const report=await loadCustomFixedBaseReportFromStore(store(db),PERIOD,ZONE);
    assert.equal(report.status,'requires_choice');
    assert.equal(report.latestRevision,0);
    assert.equal(report.stale,false);
    assert.equal(report.fullBaseMinorUnits,2_750_099);
    assert.equal('baseOnlyMinorUnits' in report,false);
    assert.equal(prefixCount(db),0);
  }finally { db.close(); }
});

test('explicit FULL salary base persists into SQLite v8 and yields base-only, no overtime implied', async () => {
  const db=await fixture();
  try {
    const event=await save(db,'full_base',null,0);
    assert.equal(event.revision,1);
    const quote=await loadCustomFixedBaseReportFromStore(store(db),PERIOD,ZONE);
    assert.equal(quote.status,'estimated');
    assert.equal(quote.baseOnlyMinorUnits,2_750_099);
    assert.equal(quote.fullBaseMinorUnits,2_750_099);
    assert.equal(quote.scope,'BASE_ONLY_OVERTIME_WORK_ADJUSTMENTS_EXCLUDED');
    assert.equal(quote.disclaimer,'USER_REPORTED_PRE_TAX_ESTIMATE');
    assert.equal(quote.profileRevision,1);
    assert.equal(quote.startDate,'2026-10-26');
    assert.equal(quote.endDateInclusive,'2026-11-25');
    assert.equal(db.prepare('PRAGMA user_version').get().user_version,8);
    assert.equal(db.prepare(
      "SELECT COUNT(*) AS n FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'",
    ).get().n,18);
    assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(),[]);
    assert.equal(db.prepare('PRAGMA integrity_check').get().integrity_check,'ok');
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM earnings_profiles').get().n,1);
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM earnings_adjustments').get().n,0);
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM actual_work_sessions').get().n,0);
  }finally {db.close();}
});

test('partial correction appends immutable next revision and does not modify source salary',async()=>{
  const db=await fixture();
  try{
    const full=await save(db,'full_base',null,0);
    const historical=db.prepare('SELECT value FROM app_settings WHERE key=?')
      .get(fixedBaseEventKey(PERIOD,DAY,1)).value;
    const partial=await save(db,'explicit_partial_base',1_234_567,1,STAMP2);
    assert.equal(partial.revision,2);
    assert.equal(partial.chosenBaseMinorUnits,1_234_567);
    const hist=await readCustomFixedBaseHistory(store(db),PERIOD,DAY);
    assert.deepEqual(hist.map(row=>row.choice),['full_base','explicit_partial_base']);
    assert.equal(JSON.stringify(full),historical);
    assert.equal(
      db.prepare('SELECT value FROM app_settings WHERE key=?').get(fixedBaseEventKey(PERIOD,DAY,1)).value,
      historical,
    );
    assert.equal(db.prepare('SELECT value FROM app_settings WHERE key=?')
      .get(fixedBaseHeadKey(PERIOD,DAY)).value,'2');
    const report=await loadCustomFixedBaseReportFromStore(store(db),PERIOD,ZONE);
    assert.equal(report.status,'estimated');
    assert.equal(report.baseOnlyMinorUnits,1_234_567);
    assert.equal(report.choice,'explicit_partial_base');
    assert.equal(report.latestRevision,2);
    assert.equal(db.prepare('SELECT base_minor_units FROM earnings_profiles').get().base_minor_units,2_750_099);
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM earnings_month_break_allocations').get().n,0);
  }finally {db.close();}
});

test('source profile correction invalidates old declaration and requires fresh explicit decision',async()=>{
  const db=await fixture();
  try{
    await save(db,'full_base',null,0);
    addRevision(db,profile(),2,{baseMinorUnits:3_100_000});
    const history=await readCustomFixedBaseHistory(store(db),PERIOD,DAY);
    assert.equal(history.length,1);
    assert.equal(history[0].profile.revision,1);
    const stale=await loadCustomFixedBaseReportFromStore(store(db),PERIOD,ZONE);
    assert.equal(stale.status,'requires_choice');
    assert.equal(stale.stale,true);
    assert.equal(stale.latestRevision,1);
    assert.equal(stale.profileRevision,2);
    assert.equal(stale.fullBaseMinorUnits,3_100_000);
    assert.equal('baseOnlyMinorUnits' in stale,false);
    const second=await save(db,'full_base',null,1,STAMP2);
    assert.equal(second.profile.revision,2);
    assert.equal(second.chosenBaseMinorUnits,3_100_000);
    const report=await loadCustomFixedBaseReportFromStore(store(db),PERIOD,ZONE);
    assert.equal(report.status,'estimated');
    assert.equal(report.profileRevision,2);
    assert.equal(report.latestRevision,2);
    assert.equal(report.baseOnlyMinorUnits,3_100_000);
    const after=await readCustomFixedBaseHistory(store(db),PERIOD,DAY);
    assert.deepEqual(after.map(item=>item.profile.revision),[1,2]);
  }finally {db.close();}
});

test('changed schedule timezone invalidates an existing choice but retains complete historical event',async()=>{
  const db=await fixture();
  try{
    await save(db,'full_base',null,0);
    const next=await loadCustomFixedBaseReportFromStore(store(db),PERIOD,'Asia/Kathmandu');
    assert.equal(next.status,'requires_choice');
    assert.equal(next.stale,true);
    assert.equal(next.latestRevision,1);
    assert.equal('baseOnlyMinorUnits' in next,false);
    const renewed=await save(db,'full_base',null,1,STAMP2,{scheduleTimeZone:'Asia/Kathmandu'});
    assert.equal(renewed.scheduleTimeZone,'Asia/Kathmandu');
    assert.equal((await loadCustomFixedBaseReportFromStore(
      store(db),PERIOD,'Asia/Kathmandu',
    )).status,'estimated');
    assert.equal((await readCustomFixedBaseHistory(store(db),PERIOD,DAY)).length,2);
  }finally {db.close();}
});

test('calendar month bonus/deduction/correction never silently enters fixed period',async()=>{
  for (const kind of ['bonus','deduction','correction']){
    const db=await fixture();
    try{
      await save(db,'full_base',null,0);
      db.prepare(
        'INSERT INTO earnings_adjustments(id,period_key,kind,currency,amount_minor_units,note,created_at)' +
          ' VALUES(?,?,?,?,?,?,?)',
      ).run(
        'adjust_'+kind,'2026-11',kind,'TRY',
        kind==='deduction'?-10000:10000,'User reported calendar adjustment',STAMP1,
      );
      const report=await loadCustomFixedBaseReportFromStore(store(db),PERIOD,ZONE);
      assert.equal(report.status,'blocked');
      assert.ok(report.reasons.includes('CUSTOM_FIXED_CALENDAR_ADJUSTMENTS_REQUIRE_ATTRIBUTION'));
      assert.equal('baseOnlyMinorUnits' in report,false);
    }finally{db.close();}
  }
});

test('mixed fixed pay profiles, fixed-hourly transitions and hourly-only are not implicit fixed salaries',async()=>{
  const db=await fixture();
  try{
    insertProfile(db,profile({
      id:'new_nov',effectiveFrom:'2026-11-01',baseMinorUnits:3_500_000,
    }));
    const report=await loadCustomFixedBaseReportFromStore(store(db),PERIOD,ZONE);
    assert.equal(report.status,'blocked');
    assert.ok(report.reasons.includes('CUSTOM_FIXED_MIXED_PROFILE_POLICY_REQUIRED'));
    await assert.rejects(
      ()=>save(db,'full_base',null,0),
      /FIXED_BASE_SINGLE_PROFILE_REQUIRED/,
    );
    assert.equal(prefixCount(db),0);
  }finally{db.close();}
  const hourly=planCustomPayProfiles(PERIOD,DAY,ZONE,[
    profile({model:'hourly',overtimeHourlyMinorUnits:0}),
  ]);
  assert.throws(()=>eligibleFixedBaseProfile(hourly),/FIXED_BASE_SINGLE_PROFILE_REQUIRED/);
  const oldHourly=estimateCustomHourlyWork(hourly,[],0);
  assert.equal(oldHourly.status,'no_work');
  const db2=dbV8();
  try{
    await writePayPeriodStartDay(store(db2),DAY);
    insertProfile(db2,profile({model:'hourly',overtimeHourlyMinorUnits:0}));
    assert.equal(
      (await loadCustomFixedBaseReportFromStore(store(db2),PERIOD,ZONE)).status,
      'not_applicable',
    );
  }finally{db2.close();}
});

test('day one is the legacy calendar month; no new custom fixed base statement accepted',async()=>{
  const db=await fixture();
  try{
    await writePayPeriodStartDay(store(db),1);
    const report=await loadCustomFixedBaseReportFromStore(store(db),PERIOD,ZONE);
    assert.equal(report.status,'not_applicable');
    await assert.rejects(()=>save(db,'full_base',null,0),/FIXED_BASE_SETTING_CHANGED/);
  }finally{db.close();}
});

test('stale UI, unchanged value, bad reason/time/amount and setting changes rollback all events',async()=>{
  const db=await fixture();
  try{
    await save(db,'full_base',null,0);
    for(const trial of [
      input('explicit_partial_base',500000,0,STAMP2),
      input('full_base',null,1,STAMP2),
      input('explicit_partial_base',500000,1,'not a time'),
      input('explicit_partial_base',500000,1,STAMP2,{reason:'x'}),
      input('explicit_partial_base',2_750_099,1,STAMP2),
      input('full_base',200,1,STAMP2),
      input('full_base',null,1,STAMP2,{startDay:24}),
      input('not_a_mode',null,1,STAMP2),
    ]) {
      db.exec('BEGIN IMMEDIATE;');
      try{
        await assert.rejects(()=>appendCustomFixedBaseRevision(store(db),trial));
      }finally{db.exec('ROLLBACK;');}
    }
    assert.equal((await readCustomFixedBaseHistory(store(db),PERIOD,DAY)).length,1);
    assert.equal(prefixCount(db),2);
  }finally{db.close();}
});

test('tampered source profile, missing head and invalid JSON refuse readback',async()=>{
  const db=await fixture();
  try{
    await save(db,'full_base',null,0);
    const key=fixedBaseEventKey(PERIOD,DAY,1);
    const raw=db.prepare('SELECT value FROM app_settings WHERE key=?').get(key).value;
    db.prepare('UPDATE app_settings SET value=? WHERE key=?').run(
      raw.replace('"baseMinorUnits":2750099','"baseMinorUnits":123'),key,
    );
    await assert.rejects(
      ()=>readCustomFixedBaseHistory(store(db),PERIOD,DAY),
      /INVALID_FIXED_BASE_EVENT/,
    );
    db.prepare('UPDATE app_settings SET value=? WHERE key=?').run(raw,key);
    db.prepare('DELETE FROM app_settings WHERE key=?').run(fixedBaseHeadKey(PERIOD,DAY));
    await assert.rejects(
      ()=>readCustomFixedBaseHistory(store(db),PERIOD,DAY),
      /INVALID_FIXED_BASE_HEAD/,
    );
    assert.throws(
      ()=>decodeCustomFixedBaseHistory(PERIOD,DAY,[
        {key:fixedBaseHeadKey(PERIOD,DAY),value:'1'},
        {key:fixedBaseEventKey(PERIOD,DAY,1),value:'bad json'},
      ]),/INVALID_FIXED_BASE_EVENT/,
    );
  }finally{db.close();}
});

test('interrupted event/head transaction is rolled back with no partial policy',async()=>{
  const db=await fixture();
  try{
    const adapter={
      ...store(db),
      async runAsync(sql,...params) {
        if (sql.startsWith('INSERT INTO app_settings') && params[0].endsWith(':head'))
          throw new Error('SIMULATED_WRITE_FAILURE');
        return db.prepare(sql).run(...params);
      },
    };
    await assert.rejects(
      ()=>save(db,'full_base',null,0,STAMP1,{},adapter),
      /SIMULATED_WRITE_FAILURE/,
    );
    assert.equal(prefixCount(db),0);
    assert.equal((await loadCustomFixedBaseReportFromStore(store(db),PERIOD,ZONE)).status,'requires_choice');
  }finally{db.close();}
});

test('fixed base prefix is isolated by custom period, start day and literal key',async()=>{
  const db=await fixture();
  try{
    await save(db,'full_base',null,0);
    const first=fixedBasePrefix(PERIOD,DAY);
    assert.notEqual(first,fixedBasePrefix('2026-11',DAY));
    assert.notEqual(first,fixedBasePrefix(PERIOD,25));
    db.prepare('INSERT INTO app_settings(key,value) VALUES(?,?)')
      .run('earnings_custom_fixed_base_v1:2X:2026-10:head','99');
    assert.equal((await readCustomFixedBaseHistory(store(db),PERIOD,DAY)).length,1);
    const sibling=await loadCustomFixedBaseReportFromStore(store(db),'2026-11',ZONE);
    assert.equal(sibling.status,'requires_choice');
    assert.equal(sibling.latestRevision,0);
  }finally{db.close();}
});

test('DST/new-year civil boundary validation remains explicit and no inferred base',()=>{
  const late=planCustomPayProfiles('2026-12',26,'America/New_York',[
    profile({effectiveFrom:'2026-12-01'}),
  ]);
  const record=createCustomFixedBaseEvent(
    late,'explicit_partial_base',1200000,1,'Exact user decision',STAMP1,
  );
  assert.equal(record.startDate,'2026-12-26');
  assert.equal(record.endDateInclusive,'2027-01-25');
  assert.equal(record.scheduleTimeZone,'America/New_York');
  assert.equal(record.chosenBaseMinorUnits,1200000);
  assert.throws(
    ()=>planCustomPayProfiles('2018-11',4,'America/Sao_Paulo',[
      profile({effectiveFrom:'2018-10-01'}),
    ]),/UNRESOLVED_PAY_PERIOD_BOUNDARY|AMBIGUOUS_PAY_PROFILE_MIDNIGHT/,
  );
});
