export interface BundledMap {
  id: string | null;
  artist: string;
  title: string;
  url: string;
}

const mapUrls = import.meta.glob('/game-assets/maps/*.osz', {
  query: '?url',
  import: 'default',
  eager: true,
}) as Record<string, string>;

/** '320118 Reol - No title.osz' → id/artist/title (artist = up to the first ' - ') */
export function parseMapFilename(filename: string): Omit<BundledMap, 'url'> {
  const base = filename.replace(/\.osz$/i, '');
  const withId = base.match(/^(\d+)\s+(.*)$/);
  const id = withId ? withId[1] : null;
  const rest = withId ? withId[2] : base;
  const sep = rest.indexOf(' - ');
  if (sep === -1) return { id, artist: '', title: rest };
  return { id, artist: rest.slice(0, sep), title: rest.slice(sep + 3) };
}

export function bundledMaps(): BundledMap[] {
  return Object.entries(mapUrls)
    .map(([path, url]) => ({
      ...parseMapFilename(path.split('/').pop() ?? path),
      url,
    }))
    .sort((a, b) => a.title.localeCompare(b.title));
}
