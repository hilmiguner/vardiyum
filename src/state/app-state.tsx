import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { PropsWithChildren } from 'react';

import {
  DEFAULT_TEMPLATES,
  type ShiftPattern,
  type ShiftSchedule,
  type ShiftTemplate,
} from '../domain/shift-engine';
import { loadSchedule, saveDayOverride, saveScheduleConfig } from '../data/shift-repository';

interface AppState {
  schedule: ShiftSchedule;
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setSchedule(await loadSchedule());
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'DATABASE_ERROR');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    void loadSchedule()
      .then((result) => {
        if (active) setSchedule(result);
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

  const value = useMemo(
    () => ({ schedule, loading, error, saveConfig, changeDay, reload }),
    [schedule, loading, error, saveConfig, changeDay, reload],
  );
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useAppState(): AppState {
  const state = useContext(Context);
  if (!state) throw new Error('APP_PROVIDER_MISSING');
  return state;
}
