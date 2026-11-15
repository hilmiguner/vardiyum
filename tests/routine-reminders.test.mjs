import assert from 'node:assert/strict';
import test from 'node:test';

import {
  completionKey,
  MAX_PENDING_ROUTINE_REMINDERS,
  MAX_REMINDERS_PER_DAY,
  REMINDER_OWNER,
  planRoutineReminders,
  reconcileReminderRequests,
  reminderKey,
} from '../src/domain/routine-reminders.ts';
import { DEFAULT_TEMPLATES } from '../src/domain/shift-engine.ts';
import { EVERY_DAY, validateRoutine } from '../src/domain/routine-engine.ts';

const istanbul = 'Europe/Istanbul';
const plan = {
  pattern: {
    anchorDate: '2026-11-15',
    days: ['morning', 'night', 'off', 'evening', 'night', 'off', 'off', 'morning'],
  },
  templates: [...DEFAULT_TEMPLATES],
  overrides: {},
  timeZone: istanbul,
};
function rule(id, options = {}) {
  return validateRoutine({
    id,
    title: 'Routine ' + id,
    recurrence: EVERY_DAY,
    enabled: true,
    archivedAt: null,
    revision: 1,
    reminderClock: '09:00',
    reminderTimeZone: istanbul,
    ...options,
  });
}
const now = new Date('2026-11-15T04:00:00.000Z'); // 07:00 Istanbul

test('scheduled IANA time not device time; one-shot UTC instant on cycle start', () => {
  const result = planRoutineReminders(plan, [rule('a')], new Set(), now);
  assert.equal(result.items.length, 14);
  assert.equal(result.items[0].whenUtc, '2026-11-15T06:00:00.000Z');
  assert.equal(result.items[0].timeZone, istanbul);
  assert.equal(result.items[0].localDate, '2026-11-15');
  assert.equal(result.items[1].whenUtc, '2026-11-16T06:00:00.000Z');
});

test('completed tasks and one-day shift overrides change scheduled reminders', () => {
  const night = rule('night', {
    reminderClock: '10:00',
    recurrence: { ...EVERY_DAY, shiftIds: ['night'] },
  });
  const a = planRoutineReminders(plan, [night], new Set(), now, 4);
  assert.deepEqual(a.items.map((x) => x.localDate), ['2026-11-16']);
  const b = planRoutineReminders({
    ...plan,
    overrides: {
      '2026-11-16': { date: '2026-11-16', shiftId: 'off', note: 'rest' },
    },
  }, [night], new Set(), now, 4);
  assert.equal(b.items.length, 0);
  const c = planRoutineReminders(
    plan, [night], new Set([completionKey('night', '2026-11-16')]), now, 4,
  );
  assert.equal(c.items.length, 0);
  assert.equal(c.skippedAlreadyCompleted, 1);
});

test('disabled and archived tasks do not schedule, and removed reminder clocks do not schedule', () => {
  const r = [
    rule('inactive', { enabled: false }),
    rule('archived', { archivedAt: '2026-11-15T00:00:00.000Z' }),
    rule('none', { reminderClock: null, reminderTimeZone: null }),
  ];
  assert.equal(planRoutineReminders(plan, r, new Set(), now).items.length, 0);
});

test('new program zone requires a fresh rule zone and produces different UTC instants', () => {
  const oldRule = rule('a');
  const schedule = { ...plan, timeZone: 'America/New_York' };
  const stale = planRoutineReminders(schedule, [oldRule], new Set(), now, 1);
  assert.equal(stale.items.length, 0);
  assert.equal(stale.skippedStaleTimeZone, 1);
  const current = planRoutineReminders(
    schedule, [rule('a', { reminderTimeZone: 'America/New_York', revision: 2 })],
    new Set(), now, 1,
  );
  assert.equal(current.items[0].whenUtc, '2026-11-15T14:00:00.000Z');
  assert.notEqual(current.items[0].key, reminderKey('a','2026-11-15','09:00',istanbul,1));
});

test('nonexistent spring DST clock is skipped, never silently moved forward', () => {
  const schedule = {
    ...plan, timeZone: 'America/New_York',
    pattern: { anchorDate: '2026-03-07', days: ['morning'] },
  };
  const r = rule('gap', { reminderClock: '02:30', reminderTimeZone: schedule.timeZone });
  const result = planRoutineReminders(schedule,[r],new Set(),new Date('2026-03-07T05:00:00Z'),3);
  assert.equal(result.skippedNonexistent, 1);
  assert.deepEqual(result.items.map(x=>x.localDate), ['2026-03-07','2026-03-09']);
});

test('ambiguous fall DST clock is skipped, never picked earlier or later', () => {
  const schedule = {
    ...plan, timeZone: 'America/New_York',
    pattern: { anchorDate: '2026-10-31', days: ['morning'] },
  };
  const r = rule('fold', { reminderClock: '01:30', reminderTimeZone: schedule.timeZone });
  const result = planRoutineReminders(schedule,[r],new Set(),new Date('2026-10-31T04:00:00Z'),3);
  assert.equal(result.skippedAmbiguous, 1);
  assert.deepEqual(result.items.map(x=>x.localDate), ['2026-10-31','2026-11-02']);
});

test('an already-past reminder is not immediately fired on app reopening', () => {
  const result = planRoutineReminders(plan,[rule('a')],new Set(),
    new Date('2026-11-15T06:00:01Z'),2);
  assert.deepEqual(result.items.map(x=>x.localDate), ['2026-11-16']);
});

test('bounded horizon, per-day limit, global pending cap and deterministic ordering', () => {
  const many = Array.from({length: 10},(_,index)=>rule('r'+index, {
    reminderClock: String(7 + index).padStart(2,'0')+':00',
  }));
  const result = planRoutineReminders(plan,many,new Set(),now);
  assert.equal(result.items.length, MAX_PENDING_ROUTINE_REMINDERS);
  const grouped = new Map();
  for (const entry of result.items) {
    grouped.set(entry.localDate,(grouped.get(entry.localDate)??0)+1);
  }
  assert.ok([...grouped.values()].every(n=>n<=MAX_REMINDERS_PER_DAY));
  assert.ok(result.skippedOverLimit>0);
  assert.deepEqual(result.items.map(x=>x.whenUtc),[...result.items.map(x=>x.whenUtc)].sort());
  assert.throws(()=>planRoutineReminders(plan,many,new Set(),now,32),/INVALID_REMINDER_HORIZON/);
});

test('night shift tasks use starting calendar day, even after midnight', () => {
  const night = rule('night',{
    reminderClock:'00:30',
    recurrence:{...EVERY_DAY,shiftIds:['night']},
  });
  const result=planRoutineReminders(plan,[night],new Set(),now,4);
  assert.deepEqual(result.items.map(x=>x.localDate),['2026-11-16']);
  assert.equal(result.items[0].whenUtc,'2026-11-15T21:30:00.000Z');
});

test('invalid clocks and zones cannot be saved as routine reminder settings', () => {
  assert.throws(()=>rule('bad',{reminderClock:'24:00'}),/INVALID_REMINDER_CLOCK/);
  assert.throws(()=>rule('bad',{reminderClock:'8:30'}),/INVALID_REMINDER_CLOCK/);
  assert.throws(()=>rule('bad',{reminderTimeZone:'Imaginary/Zone'}),/INVALID_REMINDER_TIME_ZONE/);
  assert.throws(()=>rule('bad',{reminderTimeZone:null}),/INVALID_REMINDER_TIME_ZONE/);
  assert.deepEqual(rule('clear',{reminderClock:null,reminderTimeZone:null}).reminderClock,null);
});

test('native reconciliation preserves unrelated notifications and avoids duplicates', async () => {
  const base = planRoutineReminders(plan,[rule('a')],new Set(),now,1).items;
  const pending=[
    {identifier:'other-app',owner:'another-feature',key:'x'},
    {identifier:'old-owned',owner:REMINDER_OWNER,key:'obsolete'},
    {identifier:'keep-one',owner:REMINDER_OWNER,key:base[0].key},
    {identifier:'duplicate-owned',owner:REMINDER_OWNER,key:base[0].key},
  ];
  const canceled=[];
  const scheduled=[];
  const port={
    async list(){return pending;},
    async schedule(item){scheduled.push(item.key);return 'new'+scheduled.length;},
    async cancel(id){canceled.push(id);},
  };
  const result=await reconcileReminderRequests(port,base);
  assert.deepEqual(result,{kept:1,scheduled:0,canceled:2});
  assert.deepEqual(canceled,['old-owned','duplicate-owned']);
  assert.deepEqual(scheduled,[]);
  assert.equal(pending.find(p=>p.identifier==='other-app').identifier,'other-app');
});

test('removed and edited rule keys trigger reconciliation, but a scheduling failure does not cancel old requests', async()=>{
  const oldKey=reminderKey('a','2026-11-15','09:00',istanbul,1);
  const updated=planRoutineReminders(plan,[rule('a',{revision:2})],new Set(),now,1).items;
  const canceled=[];const added=[];
  const port={
    async list(){return [{identifier:'old',owner:REMINDER_OWNER,key:oldKey}]},
    async schedule(item){added.push(item.key);return 'new'},
    async cancel(id){canceled.push(id)},
  };
  assert.deepEqual(await reconcileReminderRequests(port,updated),{kept:0,scheduled:1,canceled:1});
  assert.deepEqual(canceled,['old']);
  const broken={...port,async schedule(){throw new Error('DEVICE_REJECTED')}};
  canceled.length=0;
  await assert.rejects(()=>reconcileReminderRequests(broken,updated),/DEVICE_REJECTED/);
  assert.deepEqual(canceled,[]);
});

test('opt-out reconciliation cancels only owned pending requests',async()=>{
  const canceled=[];
  const port={
    async list(){return [
      {identifier:'ours',owner:REMINDER_OWNER,key:'old'},
      {identifier:'foreign',owner:'pay-alert',key:'keep'},
    ]},
    async schedule(){throw new Error('SHOULD_NOT_SCHEDULE')},
    async cancel(id){canceled.push(id)},
  };
  const result=await reconcileReminderRequests(port,[]);
  assert.equal(result.canceled,1);
  assert.deepEqual(canceled,['ours']);
});
