---
'@nicoflow/shared': minor
---

Add `getNotificationsPaged`, an infinite-query twin of `getNotifications` for full-screen notification lists that page forward. Tag invalidation refetches every page currently held, so a delete or mark-all-read rewrites the whole accumulated list instead of leaving a stale row behind a fresh first page. `getNotifications` is unchanged — the web popover wants exactly one page.
