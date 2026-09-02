# Gates — nicoflow-shared

What the loop runs to decide whether a task is done. Measured 2026-09-01.

Tier 1 runs every iteration; Tier 2 every fifth and before every push; Tier 3
only at the exit gate, which a human runs.

## Tier 1 — every iteration (~6s)

```bash
pnpm type-check          # tsc --noEmit                        ~2s
pnpm build               # tsup -> dist (ESM + CJS + .d.ts)     ~4s
```

`build` is in Tier 1 here, unlike the other repos: this package's whole job is
what it emits, and `tsc --noEmit` does not prove the bundle is emittable.

## Tier 1 — targeted tests

Only the tests covering what changed:

```bash
pnpm vitest run <path/to/file.test.ts>
pnpm vitest related <changed-file.ts>
```

## Tier 2 — every 5th iteration, and before every push (~8s)

```bash
pnpm type-check
pnpm build
pnpm lint
pnpm test                # 227 tests, ~1.7s
```

Cheap enough here that running it more often is fine. The other repos are not.

## Tier 3 — exit gate (human-run, once per feature)

```bash
pnpm changeset                     # blocked inside the loop, by design
pnpm build && pnpm test && pnpm lint
```

Then publish, and verify each consumer resolves the **published** package rather
than a local link:

```bash
node -e "console.log(require.resolve('@nicoflow/shared'))"
# must be inside node_modules, NOT a symlink to ../nicoflow-shared
```

The inner loop runs against a linked local package, so "it compiled" only proves
it compiled against the working copy. The exit gate proves it compiles against
what was actually published — that is what catches a broken export map.

## Conventions the gate does not catch

- **No `any`.**
- No platform coupling: nothing here may import `react-dom`, `document`,
  `window`, `localStorage`, `expo-secure-store` or `AppState`. Platform
  behaviour goes behind an interface in `src/api/adapters.ts`.
- Internal cross-subpath imports must be relative (`../types`), never
  `@nicoflow/shared/types` — the package cannot resolve its own published name
  during its own build.
- Every PR that changes published behaviour needs a changeset.

## Never

- `pnpm changeset` / `publish` inside the loop — that belongs to the exit gate
- Weaken a type to make `tsc` pass
- Delete or skip a test to make a gate pass
