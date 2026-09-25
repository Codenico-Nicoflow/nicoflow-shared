# nicoflow-shared — Agent Guide

Published `@nicoflow/shared` package used by Nicoflow web and mobile apps. Workspace rules are in `../AGENTS.md`; endpoint and entity contracts are in `../nicoflow-api/SPEC.md`.

## Package rules

- Keep `src/` framework-agnostic and platform-independent. Do not import DOM/browser APIs or Expo/React Native APIs. Put platform-specific behavior behind interfaces in `src/api/adapters.ts` and implement it in consumers.
- React, react-redux, Redux Toolkit, and Zod are peer dependencies; do not bundle duplicate copies.
- API modules export `createApi` factories receiving the platform base query. Do not introduce app-specific singleton stores here.
- Internal cross-subpath imports are relative; package exports and type declarations are defined per subpath in `package.json` and `tsup.config.ts`.
- Types, Zod schemas, endpoint shapes, locale resources, and API factories must stay consistent. Contract changes should be coordinated with API and both consumers.
- No `any` types.

## TDD, tests, and release

Write a failing Vitest first, confirm the failure, implement, and refactor. Keep package tests independent of consuming apps; register only the MSW handlers a test needs.

```sh
pnpm test
pnpm type-check
pnpm lint
pnpm build
pnpm changeset # every PR changing published src behavior
```

Branches use `<type>/NIC-<ticket>-<short-desc>` from `main`; PRs target `main` (this repo has no `staging`). Changesets drive the npm release workflow after merge. See `README.md` for the local sibling-checkout workflow.
