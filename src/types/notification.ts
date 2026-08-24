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

// All 12 known notification type strings.
export const NotificationType = {
  TASK_DUE_SOON: 'task_due_soon',
  TASK_OVERDUE: 'task_overdue',
  TASK_SCHEDULED_TODAY: 'task_scheduled_today',
  DAY_PLAN_NUDGE: 'day_plan_nudge',
  INBOX_UNPROCESSED: 'inbox_unprocessed',
  INBOX_STALE: 'inbox_stale',
  DAILY_SUMMARY: 'daily_summary',
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
    case NotificationType.TASK_DUE_SOON:
    case NotificationType.TASK_OVERDUE:
    case NotificationType.TASK_SCHEDULED_TODAY:
    case NotificationType.DAY_PLAN_NUDGE:
    case NotificationType.INBOX_UNPROCESSED:
    case NotificationType.INBOX_STALE:
      return NotificationCategory.REMINDER;

    case NotificationType.DAILY_SUMMARY:
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
// internal/domain/task/notify.go, internal/domain/bucket/notify.go,
// and internal/jobs/*.go. Widening/tightening is a typing pass only.

// reminder: task_due_soon and task_overdue carry no entity ID in metadata
// (the task title is the notification title; task_completed carries the ID).
// task_scheduled_today and day_plan_nudge carry a scheduled-task count.
// inbox_unprocessed and inbox_stale carry an unprocessed count.
export type ReminderMetadata = {
  // Present on task_scheduled_today and day/plan_nudge.
  count?: number;
};

// summary: daily_summary carries completed-task count; streak_milestone carries
// streak length (streak_milestone is grouped under celebration, not summary).
export type SummaryMetadata = {
  count?: number;
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
