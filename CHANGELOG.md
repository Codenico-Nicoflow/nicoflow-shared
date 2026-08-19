# @nicoflow/shared

## 0.4.1

### Patch Changes

- 525b331: createRecurrenceApi now takes a taskApi instance and invalidates its Task/TimeSpread tags on create/update/pause/delete. Recurring tasks used to only refetch after a full app reload since RTK Query tags don't cross createApi instances, and recurrenceApi never actually invalidated taskApi's cache despite a stale comment claiming it did.

## 0.4.0

### Minor Changes

- 3cb80c4: Add `@nicoflow/shared/analytics` — a typed PostHog event taxonomy (`AnalyticsEvents`) plus a platform-injectable `createAnalyticsClient` seam (mirrors the `TokenStorage`/`WSLifecycleAdapter` pattern in `api/adapters.ts`). No feature on any platform calls `posthog.capture('raw string')` directly. Introduced from `nicoflow-mobile`'s NIC-1947 (Sentry + PostHog integration); web adopts it when its own PostHog work (E-041) starts.

## 0.3.0

### Minor Changes

- 7694b75: Add `detectTimezoneDrift`, `zoneOffsetMinutes`, and `formatZoneOffset` to `@nicoflow/shared/utils`, moved verbatim from `nicoflow-frontend`'s `src/features/Calendar/timezoneDrift.ts` so mobile can share the same device/account-timezone drift comparison logic (NIC-1946).

## 0.2.0

### Minor Changes

- f5737a5: `authApi.refreshToken` mutation now accepts an optional `{ refreshToken: string }` argument. Web callers (cookie-based refresh) are unaffected — omit the argument as before. Platforms with no cookie jar (React Native) can pass the stored raw refresh token explicitly; the backend already accepts it as a body fallback when no cookie is present.

### Patch Changes

- 05a7e63: `authApi.login`/`register` no longer hardcode `platform: 'web'` — they now respect `platform` when the caller passes it (e.g. `'mobile'`), defaulting to `'web'` when omitted. Web callers are unaffected since none pass `platform` today.
