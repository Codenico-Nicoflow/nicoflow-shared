import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'types/index': 'src/types/index.ts',
    'utils/index': 'src/utils/index.ts',
    'api/index': 'src/api/index.ts',
    'api/adapters': 'src/api/adapters.ts',
    'schemas/index': 'src/schemas/index.ts',
    'i18n/index': 'src/i18n/index.ts',
    'analytics/index': 'src/analytics/index.ts',
  },
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  splitting: false,
  // @reduxjs/toolkit, react, react-redux, and zod are peerDependencies (the
  // consuming app supplies its own single instance — required for RTK
  // Query's singleton behavior and for React's own singleton rules), never
  // bundled into dist.
  external: ['@reduxjs/toolkit', 'react', 'react-redux', 'zod'],
});
