---
'@nicoflow/shared': minor
---

Notification rework: retire task_due_soon, task_overdue, day_plan_nudge, inbox_unprocessed, inbox_stale, task_scheduled_today, and daily_summary in favor of two unified digests, morning_digest and evening_digest (both free on all plans). `NotificationType` drops the 7 retired members and gains `MORNING_DIGEST`/`EVENING_DIGEST`; `ReminderMetadata`/`SummaryMetadata` shapes changed accordingly. `INotificationPref` drops `beforeDueMinutes`, `afterDueMinutes`, `overdueEnabled`, `dailySummaryEnabled`, `inboxNudgesEnabled` and gains `morningDigestEnabled`/`eveningDigestEnabled`.
