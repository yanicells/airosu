import manifest from '../../game-assets/starter-maps/manifest.json';

export interface StarterMapEntry {
  id: string;
  artist: string;
  title: string;
  file: string;
  sha256: string;
  byteLength: number;
  license: string;
  sourceUrl: string;
  attribution: string;
  evidence: string;
}

export type StarterMap = StarterMapEntry & { url: string };

// Only the explicit manifest pack enters the app. The owner has temporarily
// enabled three test maps for UI verification; other test fixtures stay excluded.
const starterUrls = import.meta.glob('/game-assets/starter-maps/*.osz', {
  query: '?url',
  import: 'default',
  eager: true,
}) as Record<string, string>;

export function starterMaps(): StarterMap[] {
  const entries = manifest.maps as StarterMapEntry[];
  const urlByFile = new Map(
    Object.entries(starterUrls).map(([path, url]) => [path.split('/').pop() ?? path, url]),
  );
  for (const file of urlByFile.keys()) {
    if (!entries.some((entry) => entry.file === file)) {
      throw new Error(`starter maps: ${file} is not in manifest.json`);
    }
  }
  return entries.map((entry) => {
    const url = urlByFile.get(entry.file);
    if (!url) throw new Error(`starter maps: ${entry.file} listed but missing on disk`);
    return { ...entry, url };
  });
}
