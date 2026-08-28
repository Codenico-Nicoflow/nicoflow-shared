---
'@nicoflow/shared': minor
---

Add `convertTaskToRecurring` mutation (`POST /tasks/:taskId/convert-to-recurring`). Turns an existing plain task into instance #1 of a new recurrence rule, in place — no new task row — fixing a duplicate-task bug where turning recurrence on for an already-existing task always spawned a second task.
