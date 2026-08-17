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

## Releasing — never skip `pnpm changeset`

⚠️ **Before opening any PR against this repo that changes anything under `src/`, run `pnpm changeset` and commit the file it writes into `.changeset/`.** This is not optional and easy to forget because nothing fails loudly if you skip it — the PR merges fine, CI stays green, and the change just silently never gets released. There is no other signal. If in doubt whether a change "counts," run it anyway (docs-only/CI-only changes are the only exception).

Changesets drives versioning — nobody hand-edits `package.json`'s `version` field. Flow:
1. `pnpm changeset` → answer 3 prompts (which package — always `@nicoflow/shared`, bump type patch/minor/major, one-line summary). Commit the generated `.changeset/*.md` file with your code changes.
2. PR → `staging` → `main` as normal.
3. Merging to `main` triggers `.github/workflows/release.yml`: Changesets sees the accumulated changeset file(s) and opens/updates a "Version Packages" PR (bumps the version, writes `CHANGELOG.md`, deletes the consumed changeset files) — it does **not** publish yet.
4. Merging *that* bot PR into `main` is what actually runs `pnpm release` (`changeset publish`) to npm.

## Branching

Same as every other Nicoflow repo: `<type>/NIC-<ticket>-<desc>`, branch from `staging` (or `main` for `hotfix/`), PR to `staging` first.
