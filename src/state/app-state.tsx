import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { PropsWithChildren } from 'react';

import { type ShiftPattern } from '../domain/shift-engine';
import { loadShiftPattern, saveShiftPattern } from '../data/shift-repository';

interface AppState {
  pattern: ShiftPattern | null;
  loading: boolean;
  error: string | null;
  savePattern: (value: ShiftPattern) => Promise<void>;
  reload: () => Promise<void>;
}
const Context = createContext<AppState | undefined>(undefined);

export function AppStateProvider({ children }: PropsWithChildren) {
  const [pattern, setPattern] = useState<ShiftPattern | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setPattern(await loadShiftPattern());
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'DATABASE_ERROR');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const savePattern = useCallback(async (value: ShiftPattern) => {
    await saveShiftPattern(value);
    setPattern({ anchorDate: value.anchorDate, days: [...value.days] });
  }, []);

  const state = useMemo(
    () => ({ pattern, loading, error, savePattern, reload }),
    [pattern, loading, error, savePattern, reload],
  );
  return <Context.Provider value={state}>{children}</Context.Provider>;
}

export function useAppState(): AppState {
  const state = useContext(Context);
  if (!state) throw new Error('APP_PROVIDER_MISSING');
  return state;
}
