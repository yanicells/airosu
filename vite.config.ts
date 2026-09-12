/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import manifest from './game-assets/starter-maps/manifest.json' with { type: 'json' };

export default defineConfig(({ command }) => ({
  plugins: [
    react(),
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
  test: { environment: 'node' },
}));
