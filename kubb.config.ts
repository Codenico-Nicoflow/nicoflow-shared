import { adapterOas } from '@kubb/adapter-oas';
import { pluginTs } from '@kubb/plugin-ts';
import { defineConfig } from 'kubb/config';

// The API is the single source of truth for wire shapes. Its Go structs produce
// docs/swagger.json (`make swagger`), which produces src/generated here. Nothing
// under src/generated is hand-written — edit the Go struct and regenerate.
//
// NICOFLOW_API_PATH is set per-worktree by spec-start; the default covers a
// plain sibling checkout.
const apiPath = process.env.NICOFLOW_API_PATH ?? '../nicoflow-api';

export default defineConfig({
  input: `${apiPath}/docs/swagger.json`,
  output: { path: './src/generated', clean: true },
  adapter: adapterOas({
    // Dates cross the wire as strings; converting to Date here would silently
    // disagree with what the API actually sends.
    dateType: 'string',
    unknownType: 'unknown',
  }),
  plugins: [
    pluginTs({
      // Union types rather than TS enums: they compare cleanly against the
      // string literals the API emits and carry no runtime cost.
      enum: { type: 'literal' },
      // Request bodies and internal DTOs are not part of the consumer contract,
      // but excluding them by an allowlist of names is fragile: every enum and
      // nested struct a view references has to be listed too, and a missing one
      // only shows up as a dangling import. Generate everything and let the
      // barrel decide what is public.
      exclude: [{ type: 'schemaName', pattern: /^(handler|respond)\./ }],
    }),
  ],
});
