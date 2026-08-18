# @nicoflow/shared

## 0.2.0

### Minor Changes

- f5737a5: `authApi.refreshToken` mutation now accepts an optional `{ refreshToken: string }` argument. Web callers (cookie-based refresh) are unaffected — omit the argument as before. Platforms with no cookie jar (React Native) can pass the stored raw refresh token explicitly; the backend already accepts it as a body fallback when no cookie is present.

### Patch Changes

- 05a7e63: `authApi.login`/`register` no longer hardcode `platform: 'web'` — they now respect `platform` when the caller passes it (e.g. `'mobile'`), defaulting to `'web'` when omitted. Web callers are unaffected since none pass `platform` today.
