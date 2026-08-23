---
"@nicoflow/shared": patch
---

Fix leaked raw asterisk markers in i18n labels. `bucket.projectSelector.label` displayed a literal " *" in en/he/ru — removed; no replacement required-field indicator was intended.
