# @nicoflow/shared

Shared types, RTK Query API slices, Zod validation schemas, i18n locale strings, platform adapters, and framework-agnostic pure utils for the Nicoflow web app and future mobile app.

Published to GitHub Packages (private, scoped to `@nicoflow`) — not public npm, since this package carries internal API contract shapes.

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

Merging to `main` opens (or updates) a "Version Packages" PR; merging that PR publishes the new version to GitHub Packages automatically via `.github/workflows/release.yml`.

## Branching

Same convention as `nicoflow-api` / `nicoflow-frontend`: `<type>/NIC-<ticket>-<desc>`, `<type>` ∈ `feature | bugfix | hotfix | chore | refactor`. `feature/bugfix/chore/refactor` branch from `staging`; `hotfix` branches from `main`. Flow: branch → PR to `staging` → PR to `main` (triggers the release workflow).
