/// <reference types="vitest/config" />
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { ConvexHttpClient } from 'convex/browser';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { extname, resolve } from 'node:path';
import manifest from './game-assets/starter-maps/manifest.json' with { type: 'json' };
import { starterBackground } from './src/beatmap/starterArt.ts';

const artDir = resolve('node_modules/.cache/airosu-starter-art');

/** Writes a starter map's background next to the build cache so it can be imported as an asset. */
function extractStarterArt(file: string, id: string): string | undefined {
  const art = starterBackground(readFileSync(resolve('game-assets/starter-maps', file)));
  if (!art) return undefined;
  mkdirSync(artDir, { recursive: true });
  const path = resolve(artDir, `${id}${extname(art.name).toLowerCase()}`);
  writeFileSync(path, art.bytes);
  return path;
}

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
        // Artwork ships as its own small asset so the carousel never downloads whole archives.
        const art = maps.map((map) => extractStarterArt(map.file, map.id));
        const imports = maps.map(
          (map, i) =>
            `import url${i} from ${JSON.stringify(`/game-assets/starter-maps/${map.file}?url`)};` +
            (art[i] ? `import bg${i} from ${JSON.stringify(`${art[i]}?url`)};` : ''),
        );
        return `${imports.join('\n')}\nexport default [${maps
          .map((map, i) => `{...${JSON.stringify(map)},url:url${i},backgroundUrl:${art[i] ? `bg${i}` : 'undefined'}}`)
          .join(',')}];`;
      },
    },
  ],
  assetsInclude: ['**/*.osz', '**/*.osk'],
  test: { environment: 'node', include: ['src/**/*.test.{ts,tsx}', 'convex/**/*.test.ts'] },
}));
