# @nicoflow/shared

## 0.6.2

### Patch Changes

- 6ab90d8: Add `textColorGroup`, `highlightGroup`, `colorDefault`, and 8 shared swatch-name keys (`colors.gray`/`red`/`orange`/`amber`/`green`/`teal`/`blue`/`purple`) to the `notes` i18n namespace (en/he/ru) — used by the new text-color and highlight toolbar pickers.

## 0.6.1

### Patch Changes

- 01714c3: Add `TASK_COMPLETED` key to the `errors` i18n namespace (en/he/ru) — used for the success toast shown when a task is marked done.

## 0.6.0

### Minor Changes

- 0793e6e: Add cross-platform toast helpers to `@nicoflow/shared/utils`: `Toast` interface, `createToastHelpers(i18n)` (returns `showErrorToast`/`showSuccessToast`/`showInfoToast`/`showWarningToast` bound to a host app's i18next instance), `getApiErrorCode`, and `ToastMessages`. Extracted from nicoflow-frontend so nicoflow-mobile can build the same toast/retry UX against one source of truth. Also adds `actions.retry` and `mutationError` keys to the `common` i18n namespace (en/he/ru).

## 0.5.1

### Patch Changes

- e0325f1: Add missing i18n keys for mobile-only UI (task project picker, create/save error copy, task-actions menu label, FAB label, clear-date/clear-url button labels) so mobile and web keep resolving all task-form and field-clear copy through the same shared key set.

## 0.5.0

### Minor Changes

- 5d1d97e: Add src/utils/taskDisplay.ts: ENERGY_OPTIONS, getEnergyOption, priorityKind, resolveGentleDate, formatDuration — framework-agnostic task-row display logic, single source for web and mobile.

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
