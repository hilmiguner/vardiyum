import assert from 'node:assert/strict';
import test from 'node:test';

import { routineScreenGate } from '../src/domain/routine-screen-gate.ts';

const ready = {
  scheduleLoading: false,
  scheduleError: null,
  hasPattern: true,
  routineError: null,
};

test('P0: initial configuration is offered only when there is genuinely no pattern', () => {
  assert.equal(routineScreenGate({ ...ready, hasPattern: false }), 'configure');
  assert.equal(routineScreenGate(ready), 'ready');
});

test('P0: a failed SQLite schedule read cannot masquerade as an unconfigured account', () => {
  assert.equal(
    routineScreenGate({
      ...ready,
      hasPattern: false,
      scheduleError: 'SQLITE_IO_FAILURE',
    }),
    'schedule_error',
  );
  assert.equal(
    routineScreenGate({
      ...ready,
      hasPattern: true,
      scheduleError: 'INVALID_STORED_SCHEDULE',
    }),
    'schedule_error',
  );
});

test('P0: routine DB read failure hides editing/completion controls even when schedule exists', () => {
  assert.equal(
    routineScreenGate({ ...ready, routineError: 'ROUTINES_SQLITE_ERROR' }),
    'routine_error',
  );
  assert.equal(
    routineScreenGate({ ...ready, routineError: 'ROUTINES_SQLITE_ERROR', hasPattern: false }),
    'configure',
    'first setup remains possible when no schedule exists and a routine fetch fails',
  );
});

test('P0: app load takes precedence over error and edit controls; retry restores ready state', () => {
  assert.equal(
    routineScreenGate({ ...ready, scheduleLoading: true, scheduleError: 'OLD_ERROR' }),
    'loading',
  );
  assert.equal(routineScreenGate({ ...ready, scheduleLoading: true }), 'loading');
  assert.equal(routineScreenGate(ready), 'ready');
});

test('P0: schedule error takes priority over routine error; never show stale routine editor', () => {
  assert.equal(
    routineScreenGate({
      ...ready,
      scheduleError: 'SCHEDULE_FAILED',
      routineError: 'ROUTINE_FAILED',
    }),
    'schedule_error',
  );
});
