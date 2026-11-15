// The SQLite model will allow user-defined templates in Phase 2.
// Phase 1 uses a small fixed set to validate date calculations and persistence.
import type { ShiftCode } from './shift-engine';

export interface ShiftPresentation {
  code: ShiftCode;
  startsAt: string | null;
  endsAt: string | null;
  endDayOffset: number;
  color: string;
}

export const SHIFT_PRESENTATION: Record<ShiftCode, ShiftPresentation> = {
  morning: {
    code: 'morning',
    startsAt: '07:00',
    endsAt: '15:00',
    endDayOffset: 0,
    color: '#56A3FF',
  },
  evening: {
    code: 'evening',
    startsAt: '15:00',
    endsAt: '23:00',
    endDayOffset: 0,
    color: '#E8A86E',
  },
  night: {
    code: 'night',
    startsAt: '23:00',
    endsAt: '07:00',
    endDayOffset: 1,
    color: '#A18CF6',
  },
  off: { code: 'off', startsAt: null, endsAt: null, endDayOffset: 0, color: '#5EC59C' },
};
