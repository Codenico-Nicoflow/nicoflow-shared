---
'@nicoflow/shared': patch
---

Export `ConvertToRecurringRequest` from `@nicoflow/shared/api` — it was defined and used by `convertTaskToRecurring` in 0.10.0 but missing from the public export barrel, breaking consumers that import the request type.
