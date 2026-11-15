import { AppState } from 'react-native';
import { useEffect } from 'react';

import { getReminderOptIn, loadReminderData } from '../data/reminder-repository';
import {
  planRoutineReminders,
  reconcileReminderRequests,
  REMINDER_HORIZON_DAYS,
} from '../domain/routine-reminders';
import type { ShiftSchedule } from '../domain/shift-engine';
import {
  hasNotificationPermission,
  notificationPort,
  prepareReminderChannel,
} from '../services/routine-notifications';
import { useAppState } from '../state/app-state';

/**
 * Serialize reconciliations: an older update must never win the race and
 * reintroduce stale reminders after a newer schedule or completion change.
 */
let queue: Promise<void> = Promise.resolve();

export function syncLocalRoutineReminders(
  schedule: ShiftSchedule,
  onError: (reason: string) => void = () => undefined,
): Promise<void> {
  const job = async () => {
    try {
      const optedIn = await getReminderOptIn();
      const allowed = optedIn && (await hasNotificationPermission());
      if (!allowed) {
        await reconcileReminderRequests(notificationPort, []);
        return;
      }
      await prepareReminderChannel();
      const now = new Date();
      const { rules, completedKeys } = await loadReminderData(
        schedule,
        now,
        REMINDER_HORIZON_DAYS,
      );
      const plan = planRoutineReminders(schedule, rules, completedKeys, now);
      const result = await reconcileReminderRequests(notificationPort, plan.items);
      if (
        plan.skippedAmbiguous ||
        plan.skippedNonexistent ||
        plan.skippedOverLimit ||
        plan.skippedStaleTimeZone
      ) {
        console.info('ROUTINE_REMINDER_SYNC_SKIPS', {
          ambiguous: plan.skippedAmbiguous,
          nonexistent: plan.skippedNonexistent,
          limited: plan.skippedOverLimit,
          staleTimeZone: plan.skippedStaleTimeZone,
        });
      }
      console.info('ROUTINE_REMINDER_SYNC', result);
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : 'REMINDER_SYNC_ERROR';
      console.warn('ROUTINE_REMINDER_SYNC_FAILED', message);
      onError(message);
    }
  };
  queue = queue.then(job, job);
  return queue;
}

/**
 * On app load / schedule changes / routine actions / app foreground, reconcile
 * the next 14 schedule civil days. No polling or background/always-on promise.
 */
export function ReminderCoordinator() {
  const { schedule, loading, error, reminderRevision } = useAppState();
  useEffect(() => {
    if (loading || error) return;
    void syncLocalRoutineReminders(schedule);
  }, [schedule, reminderRevision, loading, error]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active' && !loading && !error) void syncLocalRoutineReminders(schedule);
    });
    return () => subscription.remove();
  }, [schedule, loading, error]);
  return null;
}
