/// <reference types="vitest/config" />
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { ConvexHttpClient } from 'convex/browser';
import manifest from './game-assets/starter-maps/manifest.json' with { type: 'json' };

export default defineConfig(({ command, mode }) => ({
  plugins: [
    react(),
    {
      name: 'require-backend-url',
      apply: 'build',
      configResolved(config) {
        const url = loadEnv(mode, config.envDir, 'VITE_').VITE_CONVEX_URL;
        try {
          if (!url?.includes('://')) throw new Error('Expected an absolute URL');
          // The constructor validates the address without making a request.
          new ConvexHttpClient(url);
        } catch (cause) {
          throw new Error('Set VITE_CONVEX_URL to your Convex deployment URL before building.', { cause });
        }
      },
    },
    {
      name: 'starter-map-manifest',
      resolveId(id) {
        if (id === 'virtual:starter-maps') return '\0starter-maps';
      },
      load(id) {
        if (id !== '\0starter-maps') return;
        // Test packs stay available in local dev; only licensed maps enter builds.
        const maps = command === 'build' && manifest.temporaryTestPack ? [] : manifest.maps;
        const imports = maps.map(
          (map, i) =>
            `import url${i} from ${JSON.stringify(`/game-assets/starter-maps/${map.file}?url`)};`,
        );
        return `${imports.join('\n')}\nexport default [${maps.map((map, i) => `{...${JSON.stringify(map)},url:url${i}}`).join(',')}];`;
      },
    },
  ],
  assetsInclude: ['**/*.osz', '**/*.osk'],
  test: { environment: 'node', include: ['src/**/*.test.{ts,tsx}', 'convex/**/*.test.ts'] },
}));
