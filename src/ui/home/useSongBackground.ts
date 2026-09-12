import { useEffect, useState } from 'react';
import type { StarterMap } from '../../beatmap/starterMaps';
import { loadMapBackground } from '../../beatmap/mapWorker';
import { starterBytes } from '../../beatmap/starterBytes';

const cache = new Map<string, Promise<Blob | undefined>>();

export function useSongBackground(map: StarterMap): Blob | undefined {
  const [bg, setBg] = useState<Blob>();
  useEffect(() => {
    let stale = false;
    setBg(undefined);
    let pending = cache.get(map.url);
    if (!pending) {
      pending = starterBytes(map.url)
        .then(loadMapBackground)
        .catch(() => {
          cache.delete(map.url);
          return undefined;
        });
      cache.set(map.url, pending);
    }
    void pending.then((blob) => {
      if (!stale) setBg(blob);
    });
    return () => {
      stale = true;
    };
  }, [map.url]);
  return bg;
}
