import assert from 'node:assert/strict';
import test from 'node:test';
import { DatabaseSync } from 'node:sqlite';
import {
  INITIAL_SCHEMA, MIGRATION_2_SQL, MIGRATION_3_SQL, MIGRATION_4_SQL,
  MIGRATION_5_SQL, MIGRATION_6_SQL, SCHEMA_VERSION,
} from '../src/data/schema.ts';

function v5() {
  const db=new DatabaseSync(':memory:');
  db.exec('PRAGMA foreign_keys = ON');
  for(const sql of [INITIAL_SCHEMA,MIGRATION_2_SQL,MIGRATION_3_SQL,
      MIGRATION_4_SQL,MIGRATION_5_SQL])
    db.exec('BEGIN IMMEDIATE;' + sql + 'COMMIT;');
  return db;
}

test('SQLite v1-v5 data remains intact when additive version 6 is deployed',()=>{
  const db=v5();
  try{
    const recurrence=JSON.stringify({
      version:1,shiftIds:[],weekdays:[],cycleDays:[],restOnly:false,
    });
    db.exec("INSERT INTO shift_patterns(id,anchor_date,timezone_id) VALUES('primary','2026-11-15','Europe/Istanbul');");
    db.exec("INSERT INTO pattern_days(pattern_id,day_index,shift_code) VALUES('primary',0,'night');");
    db.exec("INSERT INTO day_overrides(date,shift_code,note) VALUES('2026-11-16','off','rest');");
    db.prepare("INSERT INTO routine_rules(id,title,recurrence_json,enabled) VALUES(?,?,?,1)")
      .run('routine_old','Gym',recurrence);
    db.prepare("INSERT INTO task_completions(routine_id,local_date,completed_at) VALUES(?,?,?)")
      .run('routine_old','2026-11-15','2026-11-15T07:00:00.000Z');
    db.exec("INSERT INTO work_entries(id,local_date,actual_start,actual_end,worked_minutes,kind) VALUES('old','2026-11-15','2026-11-15T05:00:00Z','2026-11-15T13:00:00Z',480,'regular');");
    db.exec("INSERT INTO compensation_profiles(id,effective_from,payment_model,currency,rate_minor_units) VALUES('legacy_pay','2026-11-01','hourly','TRY',5000);");
    db.exec("INSERT INTO pay_adjustments(id,period_key,kind,amount_minor_units,note) VALUES('legacy_adj','2026-11','bonus',1000,'old data');");
    db.exec("INSERT INTO actual_work_sessions(id,local_date,start_clock,end_date,end_clock,timezone_id,start_choice,end_choice,start_instant_utc,end_instant_utc,break_minutes,note) VALUES('work_1','2026-11-15','08:00','2026-11-15','16:00','Europe/Istanbul','reject','reject','2026-11-15T05:00:00.000Z','2026-11-15T13:00:00.000Z',30,'reported');");
    db.exec('BEGIN IMMEDIATE;' + MIGRATION_6_SQL + 'COMMIT;');
    assert.equal(db.prepare('PRAGMA user_version').get().user_version,SCHEMA_VERSION);
    for (const table of ['shift_patterns','pattern_days','day_overrides','routine_rules',
      'task_completions','work_entries','compensation_profiles','pay_adjustments',
      'actual_work_sessions']) {
      assert.equal(db.prepare('SELECT COUNT(*) AS n FROM ' + table).get().n,1,table);
    }
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM earnings_profiles').get().n,0);
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM earnings_adjustments').get().n,0);
  }finally{db.close();}
});

test('new immutable effective-month profiles, two currencies and period constraints',()=>{
  const db=v5();
  try{
    db.exec('BEGIN IMMEDIATE;' + MIGRATION_6_SQL + 'COMMIT;');
    const insert=db.prepare(
      `INSERT INTO earnings_profiles
      (id,effective_from,model,currency,base_minor_units,overtime_hourly_minor_units,
       overtime_after_minutes,overtime_multiplier_numerator,
       overtime_multiplier_denominator,revision)
      VALUES (?,?,?,?,?,?,?,?,?,?)`,
    );
    insert.run('p1','2026-11-01','hourly','TRY',15000,0,9600,3,2,1);
    const row=db.prepare("SELECT * FROM earnings_profiles WHERE id='p1'").get();
    assert.equal(row.base_minor_units,15000);
    assert.equal(row.effective_from,'2026-11-01');
    assert.equal(row.source,'user_entered');
    assert.throws(()=>insert.run('p2','2026-11-01','hourly','TRY',25000,0,9600,1,1,1),/UNIQUE constraint failed/);
    assert.throws(()=>insert.run('p3','2026-12-01','hourly','JPY',25000,0,null,1,1,1),/CHECK constraint failed/);
    assert.throws(()=>insert.run('p4','2026-12-01','monthly_fixed','TRY',500000,0,12000,3,2,1),/CHECK constraint failed/);
    insert.run('p5','2027-01-01','monthly_fixed','EUR',5000000,0,null,1,1,1);
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM earnings_profiles').get().n,2);
  }finally{db.close();}
});

test('append-only manual bonus/deduction/correction preserve provenance',()=>{
  const db=v5();
  try{
    db.exec('BEGIN IMMEDIATE;' + MIGRATION_6_SQL + 'COMMIT;');
    const insert=db.prepare(
      `INSERT INTO earnings_adjustments
        (id,period_key,kind,currency,amount_minor_units,note,created_at)
       VALUES (?,?,?,?,?,?,?)`,
    );
    insert.run('a1','2026-11','bonus','TRY',30000,'Extra','2026-11-15T10:00:00.000Z');
    insert.run('a2','2026-11','deduction','TRY',-5000,'Deduct','2026-11-15T11:00:00.000Z');
    insert.run('a3','2026-11','correction','TRY',-2000,'Reverse','2026-11-15T12:00:00.000Z');
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM earnings_adjustments').get().n,3);
    assert.equal(db.prepare("SELECT source FROM earnings_adjustments WHERE id='a2'").get().source,
      'user_entered');
    assert.throws(()=>insert.run('bad','2026-11','deduction','TRY',5000,'Invalid','2026-11-15T13:00:00.000Z'),/CHECK constraint failed/);
  }finally{db.close();}
});
