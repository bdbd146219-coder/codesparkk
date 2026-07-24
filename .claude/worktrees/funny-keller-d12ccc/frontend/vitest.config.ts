import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config';

/**
 * Vitest config kept *separate* from `vite.config.ts` on purpose. Importing
 * `vitest/config` into the build's Vite config pulls Vitest's bundled copy of
 * Vite's types into `tsc -b`, which then clashes with the top-level `vite`
 * types. Keeping the `test` block here — and out of `tsconfig.node.json`'s
 * `include` — sidesteps that. Vitest auto-loads this file ahead of
 * `vite.config.ts`, and `mergeConfig` reuses the `@` alias + React plugin.
 */
export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      // jsdom so future component tests work out of the box; the current
      // suites (schemas, return-url, locale parity) are pure and pass under
      // it too. Override per-file with `// @vitest-environment node`.
      environment: 'jsdom',
      include: ['src/**/*.{test,spec}.{ts,tsx}'],
      css: false,
    },
  }),
);
