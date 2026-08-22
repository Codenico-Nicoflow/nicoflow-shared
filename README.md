# @nicoflow/shared

Shared types, RTK Query API slices, Zod validation schemas, i18n locale strings, platform adapters, and framework-agnostic pure utils for the Nicoflow web app and future mobile app.

Published to the public npm registry under the `@nicoflow` scope. GitHub Packages was the original plan but hit an unresolved org-level publish permission issue (`403 create_package` / "installation does not exist" regardless of token type); switched to npm to unblock. The package is readable by anyone, but the `@nicoflow` scope is owned by this account — only an authorized publisher can push a new version. Contents are client-side type/schema/API-shape code with no secrets, so public readability is an accepted tradeoff. Can move to a paid private npm plan later without republishing (`npm access set status=restricted`).

## Subpaths

| Import                        | Contents                                                             |
| ------------------------------ | ---------------------------------------------------------------------- |
| `@nicoflow/shared/types`       | Entity interfaces (`IArea`, `IProject`, `ITask`, ...), constants, `IconId`, endpoint path constants |
| `@nicoflow/shared/utils`       | Pure helpers with zero DOM/React coupling (`formatBytes`, recurrence summary/validation) |
| `@nicoflow/shared/api`         | RTK Query `createApi()` slice factories — each takes a platform base query as a parameter |
| `@nicoflow/shared/api/adapters` | `TokenStorage` / `WSLifecycleAdapter` interfaces — the platform seam a consumer implements |
| `@nicoflow/shared/schemas`     | Zod validation schemas (auth, area, project, task, bucket) — no React/react-hook-form coupling |
| `@nicoflow/shared/i18n`        | Raw en/he/ru locale JSON resources — no i18next instance/provider setup |

## Design rule

Nothing in this package may import `react-dom`, `document`, `window`, or any web-only or React-Native-only API directly. Platform-specific behavior (token storage, WebSocket lifecycle signals) is expressed as an interface here (`./api/adapters`) and implemented by each consuming app.

`react` / `react-redux` / `@reduxjs/toolkit` / `zod` are peer dependencies — the consumer supplies its own single instance.

## Local dev

```bash
pnpm install
pnpm build          # tsup → dist/ (ESM + CJS + .d.ts per subpath)
pnpm dev            # tsup --watch
pnpm type-check
pnpm lint
pnpm test
```

## Consuming from a sibling checkout (no publish needed)

For iterative development against `nicoflow-frontend` (or a future `nicoflow-mobile`) without publishing an intermediate version, use a local `pnpm` override pointing at this repo's `dist/` — see that repo's README for the exact override syntax. Never commit the override as the active dependency resolution.

## Releasing

This repo uses [Changesets](https://github.com/changesets/changesets). Every PR that changes published behavior should add one:

```bash
pnpm changeset
```

Merging to `main` opens (or updates) a "Version Packages" PR; merging that PR publishes the new version to npm automatically via `.github/workflows/release.yml`.

## Branching

Unlike `nicoflow-api` / `nicoflow-frontend`, this repo has **no `staging` branch** — deliberately removed, since nothing "deploys to staging" for an npm package. `<type>/NIC-<ticket>-<desc>`, `<type>` ∈ `feature | bugfix | hotfix | chore | refactor`, all branch from `main`. Flow: branch → PR straight to `main` (triggers the release workflow on merge).
