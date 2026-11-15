import assert from 'node:assert/strict';
import test from 'node:test';
import { DatabaseSync } from 'node:sqlite';

import {
  BACKUP_SNAPSHOT_FORMAT, BACKUP_TABLES,
  validateBackupSnapshot,
} from '../src/domain/backup-archive.ts';
import { restoreToCleanInstall } from '../src/domain/backup-restore.ts';
import {
  INITIAL_SCHEMA, MIGRATION_2_SQL, MIGRATION_3_SQL, MIGRATION_4_SQL,
  MIGRATION_5_SQL, MIGRATION_6_SQL, MIGRATION_7_SQL, MIGRATION_8_SQL,
} from '../src/data/schema.ts';

function freshDatabase(foreignKeys = true) {
  const db = new DatabaseSync(':memory:');
  db.exec('PRAGMA foreign_keys=' + (foreignKeys ? 'ON' : 'OFF'));
  for (const sql of [
    INITIAL_SCHEMA, MIGRATION_2_SQL, MIGRATION_3_SQL, MIGRATION_4_SQL,
    MIGRATION_5_SQL, MIGRATION_6_SQL, MIGRATION_7_SQL, MIGRATION_8_SQL,
  ]) db.exec('BEGIN IMMEDIATE;' + sql + 'COMMIT;');
  return db;
}
function columns(db, table) {
  return db.prepare('PRAGMA table_info("' + table + '")').all().map(row => row.name);
}
function records(db,table) {
  const cols=columns(db,table);
  return db.prepare('SELECT * FROM "' + table + '" ORDER BY rowid').all()
    .map(row=>cols.map(column=>row[column]));
}
function snapshot(db) {
  const columnsMap=new Map();
  const tables=BACKUP_TABLES.map(name=>{
    const cols=columns(db,name);
    columnsMap.set(name,cols);
    return {name,columns:cols,rows:records(db,name)};
  });
  const value={
    format:BACKUP_SNAPSHOT_FORMAT,schemaVersion:8,
    createdAt:'2026-11-15T15:00:00.000Z',tables,
  };
  validateBackupSnapshot(value,columnsMap);
  return value;
}
function addSourceRecords(db) {
  db.exec(`
    INSERT INTO shift_templates(id,name,color,starts_at_local,ends_at_local,end_day_offset,is_rest_day,break_minutes)
    VALUES('weekend','Hafta sonu','#55AA77','09:00','17:00',0,0,15);
    INSERT INTO shift_patterns(id,anchor_date,timezone_id)
    VALUES('primary','2026-11-15','Europe/Istanbul');
    INSERT INTO pattern_days(pattern_id,day_index,shift_code)
    VALUES('primary',0,'night');
    INSERT INTO day_overrides(date,shift_code,note) VALUES('2026-11-16','off','deneme');
    INSERT INTO routine_rules(id,title,recurrence_json,enabled)
    VALUES('r1','Gym','{"version":1,"kind":"daily"}',1);
    INSERT INTO task_completions(routine_id,local_date,completed_at)
    VALUES('r1','2026-11-15','2026-11-15T09:00:00.000Z');
    INSERT INTO routine_completion_events
     (id,routine_id,local_date,action,title_snapshot,recurrence_snapshot,occurred_at)
    VALUES('event1','r1','2026-11-15','completed','Gym','{}',
           '2026-11-15T09:00:00.000Z');
    INSERT INTO work_entries(id,local_date,worked_minutes,kind)
    VALUES('legacy_work','2026-11-15',480,'regular');
    INSERT INTO compensation_profiles(id,effective_from,payment_model,currency,rate_minor_units)
    VALUES('legacy_pay','2026-11-01','hourly','TRY',15000);
    INSERT INTO pay_adjustments(id,period_key,kind,amount_minor_units)
    VALUES('legacy_adj','2026-11','bonus',30000);
    INSERT INTO actual_work_sessions
      (id,local_date,start_clock,end_date,end_clock,timezone_id,
       start_choice,end_choice,start_instant_utc,end_instant_utc,break_minutes,note)
    VALUES('work_1','2026-11-30','23:00','2026-12-01','07:00','Europe/Istanbul',
           'reject','reject','2026-11-30T20:00:00.000Z',
           '2026-12-01T04:00:00.000Z',30,'Kış 🌙');
    INSERT INTO earnings_profiles(id,effective_from,model,currency,base_minor_units)
    VALUES('pay1','2026-11-01','hourly','TRY',15000);
    INSERT INTO earnings_adjustments
     (id,period_key,kind,currency,amount_minor_units,note,created_at)
    VALUES('extra','2026-11','bonus','TRY',25000,'Prim',
           '2026-11-15T11:00:00.000Z');
    INSERT INTO earnings_month_break_allocations
     (work_id,start_period_key,start_month_break_minutes,
      original_break_minutes,original_start_utc,original_end_utc)
    VALUES('work_1','2026-11',10,30,
           '2026-11-30T20:00:00.000Z','2026-12-01T04:00:00.000Z');
    INSERT INTO earnings_month_break_allocation_events
     (id,work_id,revision,start_period_key,start_month_break_minutes,
      original_break_minutes,original_start_utc,original_end_utc,recorded_at)
    VALUES('evt1','work_1',1,'2026-11',10,30,
           '2026-11-30T20:00:00.000Z','2026-12-01T04:00:00.000Z',
           '2026-11-15T12:00:00.000Z');
    INSERT INTO earnings_profile_revisions
     (profile_id,revision,effective_from,model,currency,
      base_minor_units,overtime_hourly_minor_units,
      overtime_after_minutes,overtime_multiplier_numerator,
      overtime_multiplier_denominator,reason,recorded_at)
    VALUES('pay1',2,'2026-11-01','hourly','TRY',20000,0,NULL,1,1,
           'Kayıt düzeltmesi','2026-11-15T13:00:00.000Z');
    INSERT INTO app_settings(key,value)
    VALUES('routine_reminders_opted_in','1');
  `);
}
function nodeStore(db, options={}) {
  let insertIndex=0;
  const adapter={
    schemaVersion:async()=>db.prepare('PRAGMA user_version').get().user_version,
    tableNames:async()=>db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'",
    ).all().map(row=>row.name),
    columns:async name=>columns(db,name),
    rows:async name=>records(db,name),
    removeSeedTemplates:async()=>{db.exec('DELETE FROM shift_templates');},
    insert:async(name,cols,row)=>{
      if(options.failAfterInserts!==undefined &&
         insertIndex++ >= options.failAfterInserts)throw Error('INJECTED_DISK_ERROR');
      const query='INSERT INTO "'+name+'" ('+
        cols.map(c=>'"'+c+'"').join(',') + ') VALUES (' +
        cols.map(()=>'?').join(',') + ')';
      db.prepare(query).run(...row);
    },
    foreignKeyViolations:async()=>db.prepare('PRAGMA foreign_key_check').all().length,
    integrityResult:async()=>db.prepare('PRAGMA integrity_check').get().integrity_check,
  };
  return {
    withExclusiveTransaction:async(fn)=>{
      db.exec('BEGIN IMMEDIATE');
      try{
        const result=await fn(adapter);
        db.exec('COMMIT');
        return result;
      }catch(error){
        db.exec('ROLLBACK');
        throw error;
      }
    },
  };
}
function snapshotWithoutMarker(db) {
  const input=snapshot(db);
  const settings=input.tables.find(t=>t.name==='app_settings');
  const key=settings.columns.indexOf('key'),value=settings.columns.indexOf('value');
  settings.rows=settings.rows.filter(row=>row[key]!=='backup_restore_consumed');
  settings.rows=settings.rows.map(row=>row[key]==='routine_reminders_opted_in'?
    row.map((x,i)=>i===value?'0':x):row);
  return input;
}
test('v1–v8 18 tables roundtrip without data loss, reminders reset and audit kept',async()=>{
  const source=freshDatabase(),target=freshDatabase();
  try{
    addSourceRecords(source);
    const input=snapshot(source);
    const result=await restoreToCleanInstall(nodeStore(target),input);
    assert.equal(result.target,'clean_install_only');
    assert.equal(result.tableCount,18);
    assert.equal(result.reminderConsentReset,true);
    assert.equal(result.restoredRows, input.tables.reduce((n,t)=>n+t.rows.length,0));
    assert.equal(target.prepare('PRAGMA foreign_key_check').all().length,0);
    assert.equal(target.prepare('PRAGMA integrity_check').get().integrity_check,'ok');
    assert.deepEqual(snapshotWithoutMarker(target).tables,input.tables.map(t=>{
      if(t.name!=='app_settings')return t;
      return {...t,rows:t.rows.map(row=>row[0]==='routine_reminders_opted_in'?
        [row[0],'0']:row)};
    }));
    assert.equal(target.prepare("SELECT value FROM app_settings WHERE key='backup_restore_consumed'").get().value,'1');
    assert.equal(target.prepare("SELECT value FROM app_settings WHERE key='routine_reminders_opted_in'").get().value,'0');
    assert.equal(target.prepare('SELECT base_minor_units FROM earnings_profile_revisions').get().base_minor_units,20000);
    assert.equal(target.prepare('SELECT COUNT(*) AS n FROM routine_completion_events').get().n,1);
  }finally{source.close();target.close();}
});
test('existing user data blocks restore with byte-identical logical tables',async()=>{
  const source=freshDatabase(),target=freshDatabase();
  try{
    addSourceRecords(source);
    target.exec("INSERT INTO routine_rules(id,title,recurrence_json,enabled) VALUES('local','LOCAL','{}',1)");
    const before=snapshot(target);
    await assert.rejects(()=>restoreToCleanInstall(nodeStore(target),snapshot(source)),
      /RESTORE_TARGET_NOT_PRISTINE/);
    assert.deepEqual(snapshot(target),before);
  }finally{source.close();target.close();}
});
test('modified default template, added settings and duplicate restore are rejected',async()=>{
  const source=freshDatabase(),target=freshDatabase();
  try{
    target.exec("UPDATE shift_templates SET name='Customized' WHERE id='morning'");
    await assert.rejects(()=>restoreToCleanInstall(nodeStore(target),snapshot(source)),
      /RESTORE_TARGET_NOT_PRISTINE/);
    target.exec("UPDATE shift_templates SET name='Sabah' WHERE id='morning'");
    target.exec("INSERT INTO app_settings(key,value) VALUES('routine_reminders_opted_in','0')");
    await assert.rejects(()=>restoreToCleanInstall(nodeStore(target),snapshot(source)),
      /RESTORE_TARGET_NOT_PRISTINE/);
    target.exec("DELETE FROM app_settings");
    await restoreToCleanInstall(nodeStore(target),snapshot(source));
    await assert.rejects(()=>restoreToCleanInstall(nodeStore(target),snapshot(source)),
      /RESTORE_TARGET_NOT_PRISTINE/);
  }finally{source.close();target.close();}
});
test('fault during row inserts rolls back all changes including default templates',async()=>{
  const source=freshDatabase(),target=freshDatabase();
  try{
    addSourceRecords(source);
    const before=snapshot(target);
    await assert.rejects(()=>restoreToCleanInstall(
      nodeStore(target,{failAfterInserts:7}),snapshot(source),
    ),/INJECTED_DISK_ERROR/);
    assert.deepEqual(snapshot(target),before);
    assert.equal(target.prepare('PRAGMA integrity_check').get().integrity_check,'ok');
  }finally{source.close();target.close();}
});
test('source PK/unique conflict rolls back and cannot partially import',async()=>{
  const source=freshDatabase(),target=freshDatabase();
  try{
    addSourceRecords(source);
    const bad=snapshot(source);
    const table=bad.tables.find(t=>t.name==='earnings_profiles');
    table.rows.push([...table.rows[0]]);
    const baseline=snapshot(target);
    await assert.rejects(()=>restoreToCleanInstall(nodeStore(target),bad),
      /UNIQUE constraint failed/);
    assert.deepEqual(snapshot(target),baseline);
  }finally{source.close();target.close();}
});
test('FK mismatch is detected postflight even when exclusive connection has FK OFF',async()=>{
  const source=freshDatabase(false),target=freshDatabase(false);
  try{
    source.exec("INSERT INTO pattern_days(pattern_id,day_index,shift_code) VALUES('gone',0,'night')");
    const baseline=snapshot(target);
    await assert.rejects(()=>restoreToCleanInstall(nodeStore(target),snapshot(source)),
      /RESTORE_FOREIGN_KEY_CHECK_FAILED/);
    assert.deepEqual(snapshot(target),baseline);
  }finally{source.close();target.close();}
});
test('schema invalid / injected SQL identifier cannot change target',async()=>{
  const source=freshDatabase(),target=freshDatabase();
  try{
    addSourceRecords(source);
    const bad=snapshot(source);
    bad.tables[0].columns[0]='id);DROP TABLE shift_templates;--';
    const baseline=snapshot(target);
    await assert.rejects(()=>restoreToCleanInstall(nodeStore(target),bad),
      /BACKUP_COLUMN_SCHEMA_MISMATCH/);
    assert.deepEqual(snapshot(target),baseline);
  }finally{source.close();target.close();}
});
test('restored backup with old restore marker can be imported onto new pristine device',async()=>{
  const source=freshDatabase(),target=freshDatabase();
  try{
    source.exec("INSERT INTO app_settings(key,value) VALUES('backup_restore_consumed','1')");
    const r=await restoreToCleanInstall(nodeStore(target),snapshot(source));
    assert.equal(r.reminderConsentReset,true);
    assert.equal(target.prepare("SELECT COUNT(*) AS n FROM app_settings WHERE key='backup_restore_consumed'").get().n,1);
  }finally{source.close();target.close();}
});
