# Tasks — contract-enrichment (nicoflow-shared)

This repo is the pivot. The API enriches its Go structs, this package generates
TypeScript from them, and `nicoflow-frontend` / `nicoflow-mobile` consume the
result. Nothing here starts until the API's enrichment has landed for the type
in question — regenerating against a half-enriched contract produces churn
rather than signal.

**No alias shims.** `export type ITask = TaskView` leaves two names for one
shape and defers the rename forever. Delete the hand-written interface and fix
the imports in the same change.

27 interfaces in `src/types/interfaces.ts` duplicate generated types; 49 files
import them.

After each task: `pnpm codegen && pnpm type-check && pnpm test`, then confirm
the consumers still compile.

## Planned

- [ ] Wire the codegen pipeline: kubb.config.ts, the codegen and codegen:check scripts, and scripts/normalize-generated.mjs so barrel output is deterministic [ac:AC6] [files:kubb.config.ts,package.json,scripts/normalize-generated.mjs] [verify:pnpm codegen && pnpm type-check && pnpm codegen:check]

- [ ] Replace the task types — delete ITask/ISubtask and their enum constants, re-export the generated ones from src/types/index.ts, fix every importer [ac:AC8,AC9] [files:src/types/interfaces.ts,src/types/index.ts] [verify:pnpm type-check && pnpm test && ! grep -rq "interface ITask\b" src/]

- [ ] Replace the area and project types — delete IArea/IProject and their status constants [ac:AC8,AC9] [files:src/types/interfaces.ts] [verify:pnpm type-check && pnpm test && ! grep -rqE "interface I(Area|Project)\b" src/]

- [ ] Replace the note and bucket types — delete INote/INoteDetail/IBucket [ac:AC8,AC9] [files:src/types/interfaces.ts] [verify:pnpm type-check && pnpm test && ! grep -rqE "interface I(Note|Bucket)" src/]

- [ ] Replace the notification, habit, auth and calendar types — delete the remaining hand-written interfaces [ac:AC8,AC9] [files:src/types/interfaces.ts,src/types/notification.ts] [verify:pnpm type-check && pnpm test]

- [ ] Point the 5 hardcoded z.enum lists at the generated unions so a value can only be added in Go [ac:AC12] [files:src/schemas] [verify:! grep -rqE "z\.enum\(\['(active|low|task)" src/schemas/ && pnpm type-check && pnpm test]

- [ ] Delete every remaining duplicate: TaskStatus/TaskPriority/TaskEnergy and friends in src/types/constants.ts now that the generated unions exist [ac:AC13] [files:src/types/constants.ts] [verify:pnpm type-check && pnpm test && pnpm build]

- [ ] Full sweep: no hand-written interface duplicates a generated type, no alias re-export of one exists, and all three TypeScript repos compile [ac:AC8,AC9,AC13] [verify:pnpm type-check && pnpm test && pnpm build && (cd ../nicoflow-frontend && pnpm type-check) && (cd ../nicoflow-mobile && pnpm type-check)]

## Discovered

_(the loop appends here — never reorder or delete the planned list above)_
