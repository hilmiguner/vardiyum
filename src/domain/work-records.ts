import {
  addCalendarDays,
  calendarOrdinal,
  type ShiftTemplate,
  validateTemplate,
} from './shift-engine.ts';
import {
  resolveLocalBoundary,
  resolveShiftInterval,
  STRICT_BOUNDARY_POLICY,
  type BoundaryPolicy,
  type FoldChoice,
} from './zoned-shift-time.ts';

/** A choice belongs to one civil date and one exact time configuration. */
export interface StoredBoundaryChoice {
  localDate: string;
  signature: string;
  startChoice: FoldChoice;
  endChoice: FoldChoice;
}

export interface ActualWorkDraft {
  localDate: string;
  startClock: string;
  endDate: string;
  endClock: string;
  timeZone: string;
  startChoice: FoldChoice;
  endChoice: FoldChoice;
  breakMinutes: number;
  note: string;
}

export interface ActualWorkSession extends ActualWorkDraft {
  id: string;
  startInstantUtc: string;
  endInstantUtc: string;
  /** Gross time between the two actual instants, not payroll hours. */
  elapsedSeconds: number;
  /** Self-reported break deducted for display only. Not payroll verified. */
  netLoggedSeconds: number;
}

export type ActualWorkValidation =
  | { status: 'valid'; session: Omit<ActualWorkSession, 'id'> }
  | {
      status: 'invalid';
      reason:
        | 'INVALID_ACTUAL_DATE'
        | 'INVALID_ACTUAL_BREAK'
        | 'INVALID_ACTUAL_NOTE'
        | 'AMBIGUOUS_ACTUAL_START'
        | 'AMBIGUOUS_ACTUAL_END'
        | 'NONEXISTENT_ACTUAL_START'
        | 'NONEXISTENT_ACTUAL_END'
        | 'INVALID_ACTUAL_INTERVAL';
    };

function isFoldChoice(value: unknown): value is FoldChoice {
  return value === 'reject' || value === 'earlier' || value === 'later';
}

export function scheduleBoundarySignature(
  template: ShiftTemplate,
  timeZone: string,
): string {
  const valid = validateTemplate(template);
  return JSON.stringify([
    'v1',
    timeZone,
    valid.id,
    valid.startsAt,
    valid.endsAt,
    valid.endDayOffset,
    valid.isRestDay,
  ]);
}

export function effectiveBoundaryPolicy(
  localDate: string,
  template: ShiftTemplate,
  timeZone: string,
  stored: StoredBoundaryChoice | undefined,
): Readonly<BoundaryPolicy> {
  calendarOrdinal(localDate);
  if (
    !stored ||
    stored.localDate !== localDate ||
    stored.signature !== scheduleBoundarySignature(template, timeZone) ||
    !isFoldChoice(stored.startChoice) ||
    !isFoldChoice(stored.endChoice)
  ) {
    return STRICT_BOUNDARY_POLICY;
  }
  return { start: stored.startChoice, end: stored.endChoice };
}

/**
 * Refuse to persist a policy unless it produces a unique, positive scheduled
 * interval. It never changes the user's original shift template.
 */
export function prepareBoundaryChoice(
  localDate: string,
  template: ShiftTemplate,
  timeZone: string,
  policy: Readonly<BoundaryPolicy>,
): StoredBoundaryChoice {
  if (!isFoldChoice(policy.start) || !isFoldChoice(policy.end))
    throw new Error('INVALID_FOLD_POLICY');
  const interval = resolveShiftInterval(localDate, template, timeZone, policy);
  if (interval.status !== 'resolved')
    throw new Error(interval.status === 'rest' ? 'REST_SHIFT_HAS_NO_BOUNDARIES' : interval.reason);
  return {
    localDate,
    signature: scheduleBoundarySignature(template, timeZone),
    startChoice: policy.start,
    endChoice: policy.end,
  };
}

/** Independently entered actual times never inherit a planned fold decision. */
export function prepareActualWork(draft: ActualWorkDraft): ActualWorkValidation {
  try {
    calendarOrdinal(draft.localDate);
    calendarOrdinal(draft.endDate);
  } catch {
    return { status: 'invalid', reason: 'INVALID_ACTUAL_DATE' };
  }
  if (
    draft.endDate !== draft.localDate &&
    draft.endDate !== addCalendarDays(draft.localDate, 1) &&
    draft.endDate !== addCalendarDays(draft.localDate, 2) &&
    draft.endDate !== addCalendarDays(draft.localDate, 3)
  ) {
    return { status: 'invalid', reason: 'INVALID_ACTUAL_DATE' };
  }
  if (
    !Number.isSafeInteger(draft.breakMinutes) ||
    draft.breakMinutes < 0 ||
    draft.breakMinutes > 72 * 60
  ) {
    return { status: 'invalid', reason: 'INVALID_ACTUAL_BREAK' };
  }
  const note = draft.note.trim();
  if (note.length > 200) return { status: 'invalid', reason: 'INVALID_ACTUAL_NOTE' };
  // Invalid IANA zones/clocks and unknown policy values are programming or
  // user-input errors: do not silently reinterpret or clamp.
  const start = resolveLocalBoundary(
    draft.localDate,
    draft.startClock,
    draft.timeZone,
    draft.startChoice,
  );
  if (start.status !== 'resolved') {
    return {
      status: 'invalid',
      reason: start.status === 'ambiguous'
        ? 'AMBIGUOUS_ACTUAL_START'
        : 'NONEXISTENT_ACTUAL_START',
    };
  }
  const end = resolveLocalBoundary(
    draft.endDate,
    draft.endClock,
    draft.timeZone,
    draft.endChoice,
  );
  if (end.status !== 'resolved') {
    return {
      status: 'invalid',
      reason: end.status === 'ambiguous'
        ? 'AMBIGUOUS_ACTUAL_END'
        : 'NONEXISTENT_ACTUAL_END',
    };
  }
  const elapsedSeconds =
    (Date.parse(end.instantUtc) - Date.parse(start.instantUtc)) / 1000;
  if (
    !Number.isSafeInteger(elapsedSeconds) ||
    elapsedSeconds <= 0 ||
    elapsedSeconds > 72 * 3600 ||
    draft.breakMinutes * 60 >= elapsedSeconds
  ) {
    return { status: 'invalid', reason: 'INVALID_ACTUAL_INTERVAL' };
  }
  return {
    status: 'valid',
    session: {
      ...draft,
      note,
      startInstantUtc: start.instantUtc,
      endInstantUtc: end.instantUtc,
      elapsedSeconds,
      netLoggedSeconds: elapsedSeconds - draft.breakMinutes * 60,
    },
  };
}
