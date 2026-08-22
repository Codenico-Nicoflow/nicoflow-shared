# CLAUDE.md — nicoflow-shared

`@nicoflow/shared` — the framework-agnostic package consumed by `nicoflow-frontend` (and, once it exists, `nicoflow-mobile`). Published to the public npm registry (`@nicoflow` scope) via Changesets — see README.md for why GitHub Packages was abandoned.

> **Umbrella context:** this repo sits under `../CLAUDE.md` (the Nicoflow workspace root), which owns the cross-repo contract, the roadmap, and how this package fits into the 4-repo topology (`nicoflow-api`, `nicoflow-frontend`, `nicoflow-shared`, planned `nicoflow-mobile`). Read it first.

Extracted from `nicoflow-frontend`'s `packages/shared` under epic E-033b (NIC-1934 through NIC-1941). Everything in `src/` moved here verbatim — no logic changes during extraction, only import-path and build-tooling changes.

---

## Hard rule: no platform coupling

Nothing here may import `react-dom`, `document`, `window`, `localStorage`, `expo-secure-store`, `AppState`, or any other web-only or RN-only API. If a feature genuinely needs one of those, define an interface in `src/api/adapters.ts` and let each consuming app supply its own implementation (see `TokenStorage` / `WSLifecycleAdapter` for the existing pattern). This is the property that makes the package reusable from mobile — breaking it defeats the entire point of the extraction.

`react`, `react-redux`, `@reduxjs/toolkit`, and `zod` are peerDependencies, never bundled — see `tsup.config.ts`'s `external` list. The consuming app supplies exactly one instance of each; RTK Query and React both break under a duplicate instance.

## Structure

```
src/
├── types/      — IArea/IProject/ITask/... interfaces, constants, IconId, endpoint path constants
├── utils/      — pure helpers (formatBytes, recurrence summary/validation) — zero DOM/React
├── api/        — RTK Query createApi() factories, one per domain — see "Factory pattern" below
│   └── adapters.ts — TokenStorage / WSLifecycleAdapter interfaces (the platform seam)
├── schemas/    — Zod validation schemas — zero React/react-hook-form/zodResolver imports
└── i18n/       — raw en/he/ru locale JSON — zero i18next instance/provider code
```

Every subpath is a real `package.json` `exports` entry, built independently by `tsup.config.ts` (ESM + CJS + `.d.ts`). Internal cross-subpath imports **must be relative** (`../types`, never `@nicoflow/shared/types`) — the package cannot self-resolve its own published name during its own build.

## Factory pattern (`src/api/*.ts`)

Every domain's `createApi()` slice is wrapped in a factory function, not a top-level singleton:

```ts
export const createAreaApi = (baseQuery: ApiBaseQuery) => {
  const areaApi = createApi({ reducerPath: 'areaApi', baseQuery, ... });
  return areaApi;
};
```

The base query is injected — it's built from platform-specific pieces (token storage, refresh-mutex, toast/redirect side effects) that live in the consuming app, not here. Some factories take extra params for genuine cross-cutting dependencies:

- `createAuthApi(baseQuery, { clearAuth, setToken, setUser }, resolveTimeZone)` — auth's action creators, since the plain `authSlice` reducer stays app-local (its selectors read the app's own `RootState`).
- `createProjectApi(baseQuery, areaApi)` — the already-constructed `areaApi` instance, since tags don't cross `createApi()` instances and `projectApi` invalidates the area board on certain mutations.

The consuming app constructs every factory once, in one place (`nicoflow-frontend`: `src/lib/store/store.ts`), and wires the result into its own `configureStore()`.

## Testing

Tests are self-contained — no dependency on any consuming app's test infra. `test/server.ts` is a bare `setupServer()` with zero default handlers (unlike `nicoflow-frontend`'s `__tests__/server.ts`, which preloads a full app mock set); every test registers exactly the routes it needs via `server.use(...)`.

```bash
pnpm test          # vitest run
pnpm test:watch
```

## Local dev / consuming from a sibling checkout

See `README.md` for the pnpm-override workflow (NIC-1941) that lets `nicoflow-frontend` pick up local edits here without a publish step.

## Releasing

Changesets. `pnpm changeset` on any PR that changes published behavior. Merging to `main` triggers `.github/workflows/release.yml`, which opens/updates a "Version Packages" PR and publishes to npm once that PR merges.

## Branching

**Unlike every other Nicoflow repo, this one has no `staging` branch.** Branch `<type>/NIC-<ticket>-<desc>` directly from `main`, PR straight to `main` — no `staging` intermediate. This is a deliberate deviation from the umbrella's unified branch flow: a `staging` hop added no value here (nothing "deploys to staging" for an npm package — the only real gate is the `main`-triggered release workflow), so it was removed. If you see references to a `nicoflow-shared` `staging` branch or a `staging → main` PR in old history/PRs, that's stale — the branch no longer exists.
