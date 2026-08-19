import { type ITask, TaskEnergy, TaskPriority } from '../types';

// Framework-agnostic task-row display logic, single source for both web and
// mobile. Icons stay app-side (lucide-react vs. lucide-react-native are
// different packages) — this only owns the data: which energy/priority level
// a task has, what its gentle date reads as, and how a duration is worded.

export interface EnergyOption {
  value: TaskEnergy;
  labelKey: string;
  colorClass: string;
}

// Ascending focus-cost order — green→amber→violet. colorClass is a Tailwind
// token shared by web; mobile maps value → its own hex pair separately since
// RN styling isn't Tailwind-class-driven the same way.
export const ENERGY_OPTIONS: EnergyOption[] = [
  { value: TaskEnergy.LOW, labelKey: 'task:energy.low', colorClass: 'text-emerald-500' },
  { value: TaskEnergy.MEDIUM, labelKey: 'task:energy.medium', colorClass: 'text-amber-500' },
  { value: TaskEnergy.DEEP, labelKey: 'task:energy.deep', colorClass: 'text-violet-500' },
];

export const DEFAULT_ENERGY: TaskEnergy = TaskEnergy.MEDIUM;

const DEFAULT_ENERGY_OPTION = ENERGY_OPTIONS[1] as EnergyOption;

export const getEnergyOption = (energy: TaskEnergy): EnergyOption =>
  ENERGY_OPTIONS.find(option => option.value === energy) ?? DEFAULT_ENERGY_OPTION;

export type PriorityKind = 'low' | 'medium' | 'high' | 'unknown';

export const priorityKind = (priority: TaskPriority | null | undefined): PriorityKind => {
  switch (priority) {
    case TaskPriority.LOW:
      return 'low';
    case TaskPriority.MEDIUM:
      return 'medium';
    case TaskPriority.HIGH:
      return 'high';
    default:
      return 'unknown';
  }
};

// ── Gentle date ──────────────────────────────────────────────────────────
// The calm model: a task's only date is the soft scheduledFor. It never goes
// "overdue" — a past one reads as a neutral "carried over" state. No red
// anywhere. `kind` drives the i18n label; callers own tone/color.
export type GentleDateResult =
  | { kind: 'carriedOver' } // past soft scheduledFor that rolls forward
  | { kind: 'passedNotRolling'; formattedDate: string } // past, rollsOver=false — won't carry
  | { kind: 'scheduledToday' }
  | { kind: 'scheduledTomorrow' }
  | { kind: 'scheduledFuture'; formattedDate: string };

const startOfDay = (date: Date): Date => new Date(date.getFullYear(), date.getMonth(), date.getDate());

const parseISODate = (iso: string): Date | null => {
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
};

const formatMonthDay = (date: Date): string =>
  date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

/**
 * Resolve the single gentle date state for a task from its soft scheduledFor
 * (roll-forward, never red). Returns null when the task is unscheduled.
 *
 * A past date only reads "carried over" when the task actually rolls forward;
 * with rollsOver=false it won't carry (it drops from Time-Spread), so it
 * returns its plain past date instead — "carried over" would be a lie.
 */
export function resolveGentleDate(task: Pick<ITask, 'scheduledFor' | 'rollsOver'>): GentleDateResult | null {
  if (!task.scheduledFor) return null;
  const date = parseISODate(task.scheduledFor);
  if (!date) return null;

  const today = startOfDay(new Date());
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (date.getTime() === today.getTime()) return { kind: 'scheduledToday' };
  if (date.getTime() === tomorrow.getTime()) return { kind: 'scheduledTomorrow' };
  if (date.getTime() < today.getTime()) {
    return task.rollsOver
      ? { kind: 'carriedOver' }
      : { kind: 'passedNotRolling', formattedDate: formatMonthDay(date) };
  }
  return { kind: 'scheduledFuture', formattedDate: formatMonthDay(date) };
}

// ── Duration ─────────────────────────────────────────────────────────────
/**
 * Humanize a minute count for display: whole hours as "2h", sub-hour as
 * "45min", mixed as "1h 30min". Single source for every duration chip/badge.
 */
export const formatDuration = (minutes: number, minSuffix = 'min', hourSuffix = 'h'): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}${minSuffix}`;
  if (mins === 0) return `${hours}${hourSuffix}`;
  return `${hours}${hourSuffix} ${mins}${minSuffix}`;
};
