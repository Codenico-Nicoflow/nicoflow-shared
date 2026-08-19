---
"@nicoflow/shared": minor
---

Add `@nicoflow/shared/analytics` — a typed PostHog event taxonomy (`AnalyticsEvents`) plus a platform-injectable `createAnalyticsClient` seam (mirrors the `TokenStorage`/`WSLifecycleAdapter` pattern in `api/adapters.ts`). No feature on any platform calls `posthog.capture('raw string')` directly. Introduced from `nicoflow-mobile`'s NIC-1947 (Sentry + PostHog integration); web adopts it when its own PostHog work (E-041) starts.
