import { describe, expect, it } from 'vitest';

import { categoryForType, NotificationCategory, NotificationType } from './notification';

describe('categoryForType', () => {
  it.each([
    [NotificationType.TASK_DUE_SOON, NotificationCategory.REMINDER],
    [NotificationType.TASK_OVERDUE, NotificationCategory.REMINDER],
    [NotificationType.TASK_SCHEDULED_TODAY, NotificationCategory.REMINDER],
    [NotificationType.DAY_PLAN_NUDGE, NotificationCategory.REMINDER],
    [NotificationType.INBOX_UNPROCESSED, NotificationCategory.REMINDER],
    [NotificationType.INBOX_STALE, NotificationCategory.REMINDER],
    [NotificationType.DAILY_SUMMARY, NotificationCategory.SUMMARY],
    [NotificationType.TASK_COMPLETED, NotificationCategory.CELEBRATION],
    [NotificationType.PROJECT_COMPLETED, NotificationCategory.CELEBRATION],
    [NotificationType.INBOX_ZERO, NotificationCategory.CELEBRATION],
    [NotificationType.STREAK_MILESTONE, NotificationCategory.CELEBRATION],
    [NotificationType.SYSTEM_ANNOUNCEMENT, NotificationCategory.SYSTEM],
  ])('%s → %s', (type, expected) => {
    expect(categoryForType(type)).toBe(expected);
  });

  it('unknown type falls back to system', () => {
    expect(categoryForType('some_future_type')).toBe(NotificationCategory.SYSTEM);
    expect(categoryForType('')).toBe(NotificationCategory.SYSTEM);
  });
});
