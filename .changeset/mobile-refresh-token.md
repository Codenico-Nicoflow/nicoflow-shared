---
"@nicoflow/shared": minor
---

`authApi.refreshToken` mutation now accepts an optional `{ refreshToken: string }` argument. Web callers (cookie-based refresh) are unaffected — omit the argument as before. Platforms with no cookie jar (React Native) can pass the stored raw refresh token explicitly; the backend already accepts it as a body fallback when no cookie is present.
