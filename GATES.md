# Gates — nicoflow-shared

Measured 2026-09-01. Tier 1 runs every iteration; Tier 2 every 5th and before
every push; Tier 3 only at the exit gate, which a human runs.

## Tier 1 — every iteration (~6s)

```bash
pnpm type-check          # tsc --noEmit                        ~2s
pnpm build               # tsup -> dist (ESM + CJS + .d.ts)     ~4s
```

`build` is in Tier 1 here, unlike other repos: this package's whole job is what
it emits, and `tsc --noEmit` does not prove the bundle is emittable.

If `src/generated/` was touched, also run the staleness gate below.

## Tier 1 — targeted tests

Only the tests covering what you changed:

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

## Contract staleness gate

The generated types must match what the API currently emits. Regenerate and
diff — any change means someone edited a generated file by hand, or the API
moved and codegen was not re-run.

```bash
pnpm codegen                       # kubb, reads $NICOFLOW_API_PATH
git diff --exit-code src/generated/
```

Non-empty diff = **FAIL**. Never hand-edit `src/generated/`. Fix the Go struct
in the API and regenerate.

Requires `NICOFLOW_API_PATH` (default `../nicoflow-api`), set by `spec-start`.

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

## Never

- Hand-edit `src/generated/`
- `pnpm changeset` / `publish` inside the loop
- Weaken a type to make `tsc` pass
- Delete or skip a test to make a gate pass
