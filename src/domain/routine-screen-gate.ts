/**
 * MVP first-use gate for Routines. A database/schedule load failure is NOT an
 * unconfigured shift pattern; never invite the user to overwrite a schedule
 * when persistence has failed. Only show edit/complete controls with a
 * successfully loaded schedule and routine snapshot.
 */
export type RoutineScreenGate =
  | 'loading'
  | 'schedule_error'
  | 'configure'
  | 'routine_error'
  | 'ready';

export function routineScreenGate({
  scheduleLoading,
  scheduleError,
  hasPattern,
  routineError,
}: {
  scheduleLoading: boolean;
  scheduleError: string | null;
  hasPattern: boolean;
  routineError: string | null;
}): RoutineScreenGate {
  if (scheduleLoading) return 'loading';
  if (scheduleError) return 'schedule_error';
  if (!hasPattern) return 'configure';
  if (routineError) return 'routine_error';
  return 'ready';
}
