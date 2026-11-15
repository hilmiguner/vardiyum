import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { PropsWithChildren } from 'react';

import {
  DEFAULT_TEMPLATES,
  type ShiftPattern,
  type ShiftSchedule,
  type ShiftTemplate,
} from '../domain/shift-engine';
import {
  loadSchedule,
  saveDayOverride,
  saveScheduleConfig,
  changeScheduleTimeZone,
} from '../data/shift-repository';
import { loadBoundaryChoices, storeBoundaryChoice } from '../data/work-repository';
import type { StoredBoundaryChoice } from '../domain/work-records';
import type { BoundaryPolicy } from '../domain/zoned-shift-time';
import { resolveShift } from '../domain/shift-engine';

interface AppState {
  schedule: ShiftSchedule;
  boundaryChoices: Record<string, StoredBoundaryChoice>;
  saveBoundaryChoice: (date: string, policy: Readonly<BoundaryPolicy> | null) => Promise<void>;
  changeTimeZone: (timeZone: string) => Promise<void>;
  reminderRevision: number;
  refreshReminders: () => void;
  loading: boolean;
  error: string | null;
  saveConfig: (pattern: ShiftPattern, templates: readonly ShiftTemplate[]) => Promise<void>;
  changeDay: (date: string, shiftId: string | null, note?: string) => Promise<void>;
  reload: () => Promise<void>;
}
const Context = createContext<AppState | undefined>(undefined);

function emptySchedule(): ShiftSchedule {
  return {
    pattern: null,
    templates: [...DEFAULT_TEMPLATES],
    overrides: {},
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
  };
}

export function AppStateProvider({ children }: PropsWithChildren) {
  const [schedule, setSchedule] = useState<ShiftSchedule>(emptySchedule);
  const [boundaryChoices, setBoundaryChoices] = useState<Record<string, StoredBoundaryChoice>>(
    {},
  );
  const [loading, setLoading] = useState(true);
  const [reminderRevision, setReminderRevision] = useState(0);
  const refreshReminders = useCallback(() => setReminderRevision((count) => count + 1), []);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [nextSchedule, choices] = await Promise.all([
        loadSchedule(),
        loadBoundaryChoices(),
      ]);
      setSchedule(nextSchedule);
      setBoundaryChoices(choices);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'DATABASE_ERROR');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    void Promise.all([loadSchedule(), loadBoundaryChoices()])
      .then(([result, choices]) => {
        if (active) {
          setSchedule(result);
          setBoundaryChoices(choices);
        }
      })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : 'DATABASE_ERROR');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const saveConfig = useCallback(
    async (pattern: ShiftPattern, templates: readonly ShiftTemplate[]) => {
      await saveScheduleConfig(pattern, templates);
      setSchedule((before) => ({
        ...before,
        pattern: { anchorDate: pattern.anchorDate, days: [...pattern.days] },
        templates: [...templates],
      }));
    },
    [],
  );

  const changeDay = useCallback(
    async (date: string, shiftId: string | null, note = '') => {
      await saveDayOverride(date, shiftId, note, schedule.templates);
      setSchedule((before) => {
        const overrides = { ...before.overrides };
        if (shiftId === null) delete overrides[date];
        else overrides[date] = { date, shiftId, note: note.trim() };
        return { ...before, overrides };
      });
    },
    [schedule.templates],
  );

  const saveBoundaryChoice = useCallback(
    async (date: string, policy: Readonly<BoundaryPolicy> | null) => {
      const selected = resolveShift(date, schedule);
      if (!selected) throw new Error('SCHEDULE_NOT_CONFIGURED');
      const stored = await storeBoundaryChoice(
        date,
        selected.template,
        schedule.timeZone,
        policy,
      );
      setBoundaryChoices((before) => {
        const next = { ...before };
        if (stored) next[date] = stored;
        else delete next[date];
        return next;
      });
    },
    [schedule],
  );

  const changeTimeZone = useCallback(async (timeZone: string) => {
    await changeScheduleTimeZone(timeZone);
    setSchedule((before) => ({ ...before, timeZone }));
    // Prior boundary choices remain stored for audit, but their signatures
    // will no longer match and are never silently reused in a new zone.
  }, []);

  const value = useMemo(
    () => ({
      schedule,
      boundaryChoices,
      reminderRevision,
      refreshReminders,
      loading,
      error,
      saveConfig,
      changeDay,
      saveBoundaryChoice,
      changeTimeZone,
      reload,
    }),
    [
      schedule,
      boundaryChoices,
      reminderRevision,
      refreshReminders,
      loading,
      error,
      saveConfig,
      changeDay,
      saveBoundaryChoice,
      changeTimeZone,
      reload,
    ],
  );
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useAppState(): AppState {
  const state = useContext(Context);
  if (!state) throw new Error('APP_PROVIDER_MISSING');
  return state;
}
