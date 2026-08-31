// Notification category taxonomy (derived, never stored).
// A new notification type must be added to both this file and the backend's
// categoryForType switch (internal/domain/notification/types.go) — both switches
// must stay exhaustive.

export const NotificationCategory = {
  REMINDER: 'reminder',
  SUMMARY: 'summary',
  CELEBRATION: 'celebration',
  SYSTEM: 'system',
} as const;

export type NotificationCategory = (typeof NotificationCategory)[keyof typeof NotificationCategory];

// All 7 known notification type strings. task_due_soon, task_overdue,
// day_plan_nudge, inbox_unprocessed, inbox_stale, task_scheduled_today, and
// daily_summary were retired in the notification rework (2026-08-31): their
// counts folded into MORNING_DIGEST/EVENING_DIGEST, both unified across plans.
export const NotificationType = {
  MORNING_DIGEST: 'morning_digest',
  EVENING_DIGEST: 'evening_digest',
  TASK_COMPLETED: 'task_completed',
  PROJECT_COMPLETED: 'project_completed',
  INBOX_ZERO: 'inbox_zero',
  STREAK_MILESTONE: 'streak_milestone',
  SYSTEM_ANNOUNCEMENT: 'system_announcement',
} as const;

export type NotificationType = (typeof NotificationType)[keyof typeof NotificationType];

// Pure derivation function — no I/O, no side effects.
// Unknown types (forward-compat with future backend types) fall back to 'system'.
export const categoryForType = (type: string): NotificationCategory => {
  switch (type) {
    case NotificationType.MORNING_DIGEST:
      return NotificationCategory.REMINDER;

    case NotificationType.EVENING_DIGEST:
      return NotificationCategory.SUMMARY;

    case NotificationType.TASK_COMPLETED:
    case NotificationType.PROJECT_COMPLETED:
    case NotificationType.INBOX_ZERO:
    case NotificationType.STREAK_MILESTONE:
      return NotificationCategory.CELEBRATION;

    case NotificationType.SYSTEM_ANNOUNCEMENT:
      return NotificationCategory.SYSTEM;

    default:
      return NotificationCategory.SYSTEM;
  }
};

// Discriminated-union metadata shapes, one per category.
// Fields reflect what producers actually write today — verified against
// internal/domain/project/notify.go, internal/domain/task/notify.go,
// internal/domain/bucket/notify.go, and internal/jobs/*.go. Widening/tightening
// is a typing pass only.

// reminder: morning_digest carries the three rolled-up morning counts.
export type ReminderMetadata = {
  scheduled?: number;
  overdue?: number;
  unprocessed?: number;
};

// summary: evening_digest carries completed + remaining task counts.
export type SummaryMetadata = {
  completed?: number;
  remaining?: number;
};

// celebration: task_completed carries taskId + projectId; project_completed carries
// projectId only; inbox_zero and streak_milestone carry streak or nothing.
export type CelebrationMetadata = {
  taskId?: string;
  projectId?: string;
  streak?: number;
};

// system: no entity target.
export type SystemMetadata = Record<string, never>;

export type NotificationMetadata =
  | ({ category: typeof NotificationCategory.REMINDER } & ReminderMetadata)
  | ({ category: typeof NotificationCategory.SUMMARY } & SummaryMetadata)
  | ({ category: typeof NotificationCategory.CELEBRATION } & CelebrationMetadata)
  | ({ category: typeof NotificationCategory.SYSTEM } & SystemMetadata);
