---
'@nicoflow/shared': minor
---

Add notification category taxonomy: `categoryForType()` derives `reminder`/`summary`/`celebration`/`system` from the existing notification type, plus typed per-category metadata (`ReminderMetadata`, `SummaryMetadata`, `CelebrationMetadata`, `SystemMetadata`) and a `category` field on `INotification`.
