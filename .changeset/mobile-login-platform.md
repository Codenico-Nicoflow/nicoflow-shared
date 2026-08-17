---
"@nicoflow/shared": patch
---

`authApi.login`/`register` no longer hardcode `platform: 'web'` — they now respect `platform` when the caller passes it (e.g. `'mobile'`), defaulting to `'web'` when omitted. Web callers are unaffected since none pass `platform` today.
