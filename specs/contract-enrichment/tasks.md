# Tasks — contract-enrichment (nicoflow-shared)

The 27 interfaces in `src/types/interfaces.ts` stay hand-written and stay the
single definition of each shape. There is no code generation: this repo owns the
TypeScript, the API owns the Go, and this list is where the two are reconciled.

Each task compares one domain's interfaces against the API's enriched
`docs/swagger.json` and fixes whatever disagrees — a missing `| null`, a field
typed `string` that the API constrains to three values, a field marked optional
that is always sent.

Nothing here starts until the API has enriched the domain in question; before
that the swagger is not yet an accurate description of the wire.

**Read the swagger, not the Go.** `docs/swagger.json` is what the API actually
emits. A struct field can be enriched but excluded from a view.

Every mismatch found is a bug that shipped — record it in `MISMATCHES.md` next
to this file with the old and new type, so the pattern is visible rather than
quietly fixed one field at a time.

After each task: `pnpm type-check && pnpm test && pnpm build`.

## Planned

- [ ] Align the task and subtask types — ITask/ISubtask against task.TaskView and task.SubtaskView: required vs optional, nullability, and the status/priority/energy unions [ac:AC8,AC9] [files:src/types/interfaces.ts] [verify:pnpm type-check && pnpm test]

- [ ] Align the area and project types — IArea/IProject against area.AreaView, area.AreaWithProjectsView and project.ProjectView, including the project status union [ac:AC8,AC9] [files:src/types/interfaces.ts] [verify:pnpm type-check && pnpm test]

- [ ] Align the note and bucket types — INote/INoteDetail/IBucket against note.NoteView, note.NoteDetailView and bucket.BucketView [ac:AC8,AC9] [files:src/types/interfaces.ts] [verify:pnpm type-check && pnpm test]

- [ ] Align the notification and habit types, including the notification type union and the habit polarity and scheduleKind unions [ac:AC8,AC9] [files:src/types/interfaces.ts,src/types/notification.ts] [verify:pnpm type-check && pnpm test]

- [ ] Align the auth and calendar types — IUser and ICalendarPrefs against auth.UserView and auth.CalendarPrefsView [ac:AC8,AC9] [files:src/types/interfaces.ts] [verify:pnpm type-check && pnpm test]

- [ ] Reconcile the enum constants in src/types/constants.ts with the API's named Go types so the values match exactly and nothing is defined twice within this repo [ac:AC13] [files:src/types/constants.ts] [verify:pnpm type-check && pnpm test && pnpm build]

- [ ] Point the 5 hardcoded z.enum lists at the shared constants rather than repeating their literals [ac:AC12] [files:src/schemas] [verify:! grep -rqE "z\.enum\(\['(active|low|task)" src/schemas/ && pnpm type-check && pnpm test]

- [ ] Full sweep: every interface matches its swagger definition, no enum value is written down twice in this repo, and both consumers still compile [ac:AC8,AC9,AC13] [verify:pnpm type-check && pnpm test && pnpm build && (cd ../nicoflow-frontend && pnpm type-check) && (cd ../nicoflow-mobile && pnpm type-check)]

## Discovered

_(the loop appends here — never reorder or delete the planned list above)_
