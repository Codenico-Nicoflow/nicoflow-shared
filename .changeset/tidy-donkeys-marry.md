---
'@nicoflow/shared': minor
---

Add `projectId` to `UpdateRecurrenceRuleRequest` so a recurring series can be moved between projects. Without it a move relocated only the current occurrence and every future one kept materializing into the original project.
