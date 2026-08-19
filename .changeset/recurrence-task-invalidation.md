---
"@nicoflow/shared": patch
---

createRecurrenceApi now takes a taskApi instance and invalidates its Task/TimeSpread tags on create/update/pause/delete. Recurring tasks used to only refetch after a full app reload since RTK Query tags don't cross createApi instances, and recurrenceApi never actually invalidated taskApi's cache despite a stale comment claiming it did.
