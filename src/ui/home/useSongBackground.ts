import { useEffect, useState } from 'react';
import type { BundledMap } from '../../beatmap/bundled';
import { oszBackground } from '../../beatmap/load';

// per-URL background cache; null marks "fetched, has no background"
const cache = new Map<string, Blob | null>();

/** Background image of a bundled map's .osz, fetched lazily and cached. */
export function useSongBackground(map: BundledMap | undefined): Blob | undefined {
  const [bg, setBg] = useState<Blob>();

  useEffect(() => {
    if (!map) {
      setBg(undefined);
      return;
    }
    const cached = cache.get(map.url);
    if (cached !== undefined) {
      setBg(cached ?? undefined);
      return;
    }
    let stale = false;
    (async () => {
      try {
        const bytes = new Uint8Array(await (await fetch(map.url)).arrayBuffer());
        const blob = oszBackground(bytes) ?? null;
        cache.set(map.url, blob);
        if (!stale) setBg(blob ?? undefined);
      } catch {
        if (!stale) setBg(undefined); // background is decorative — ignore fetch failures
      }
    })();
    return () => {
      stale = true;
    };
  }, [map]);

  return bg;
}
