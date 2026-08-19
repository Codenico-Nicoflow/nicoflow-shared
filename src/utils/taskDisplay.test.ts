import { describe, expect, it } from 'vitest';

import { TaskEnergy, TaskPriority } from '../types';

import { formatDuration, getEnergyOption, priorityKind, resolveGentleDate } from './taskDisplay';

describe('getEnergyOption', () => {
  it('returns the matching option', () => {
    expect(getEnergyOption(TaskEnergy.DEEP).value).toBe(TaskEnergy.DEEP);
  });

  it('defaults to medium for an unrecognized value', () => {
    expect(getEnergyOption('bogus' as TaskEnergy).value).toBe(TaskEnergy.MEDIUM);
  });
});

describe('priorityKind', () => {
  it('maps each priority to its kind', () => {
    expect(priorityKind(TaskPriority.LOW)).toBe('low');
    expect(priorityKind(TaskPriority.MEDIUM)).toBe('medium');
    expect(priorityKind(TaskPriority.HIGH)).toBe('high');
  });

  it('returns unknown for null/undefined', () => {
    expect(priorityKind(null)).toBe('unknown');
    expect(priorityKind(undefined)).toBe('unknown');
  });
});

describe('formatDuration', () => {
  it('formats sub-hour as minutes', () => {
    expect(formatDuration(45)).toBe('45min');
  });

  it('formats whole hours without minutes', () => {
    expect(formatDuration(120)).toBe('2h');
  });

  it('formats mixed hours and minutes', () => {
    expect(formatDuration(90)).toBe('1h 30min');
  });

  it('accepts custom suffixes', () => {
    expect(formatDuration(90, ' דקות', ' שעות')).toBe('1 שעות 30 דקות');
  });
});

describe('resolveGentleDate', () => {
  const todayISO = () => {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  };

  const isoDaysFromToday = (offset: number): string => {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  };

  it('returns null when unscheduled', () => {
    expect(resolveGentleDate({ scheduledFor: null, rollsOver: true })).toBeNull();
  });

  it('returns scheduledToday for today', () => {
    expect(resolveGentleDate({ scheduledFor: todayISO(), rollsOver: true })).toEqual({ kind: 'scheduledToday' });
  });

  it('returns scheduledTomorrow for tomorrow', () => {
    expect(resolveGentleDate({ scheduledFor: isoDaysFromToday(1), rollsOver: true })).toEqual({
      kind: 'scheduledTomorrow',
    });
  });

  it('returns carriedOver for a past date that rolls forward', () => {
    expect(resolveGentleDate({ scheduledFor: isoDaysFromToday(-3), rollsOver: true })).toEqual({
      kind: 'carriedOver',
    });
  });

  it('returns passedNotRolling with a formatted date when rollsOver is false', () => {
    const result = resolveGentleDate({ scheduledFor: isoDaysFromToday(-3), rollsOver: false });
    expect(result?.kind).toBe('passedNotRolling');
  });

  it('returns scheduledFuture with a formatted date beyond tomorrow', () => {
    const result = resolveGentleDate({ scheduledFor: isoDaysFromToday(5), rollsOver: true });
    expect(result?.kind).toBe('scheduledFuture');
  });
});
