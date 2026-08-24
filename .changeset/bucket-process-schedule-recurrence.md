---
"@nicoflow/shared": patch
---

Add `scheduledTime` and `recurrence` to the bucket-process `taskDetails` request type and its Zod schema, matching the backend's `POST /v1/bucket/:id/process` contract. `recurrence` reuses `RecurrenceSchedule`'s freq/interval/date shape via a new `TaskRecurrence` type.
