export interface ResolvedImage {
  /** entry name exactly as it appears in the archive */
  name: string;
  /** 2 for @2x assets, else 1 */
  resolution: number;
}

/**
 * Find a skin image by its logical base path ('hitcircle', 'num/berlin-5').
 * Exact path match (case-insensitive), @2x preferred, then the plain file,
 * then the first animation frame (name-0).
 */
export function resolveImage(files: string[], base: string): ResolvedImage | null {
  const lower = new Map(files.map((f) => [f.toLowerCase(), f]));
  const want = base.toLowerCase();
  const candidates: [string, number][] = [
    [`${want}@2x.png`, 2],
    [`${want}.png`, 1],
    [`${want}-0@2x.png`, 2],
    [`${want}-0.png`, 1],
  ];
  for (const [name, resolution] of candidates) {
    const real = lower.get(name);
    if (real) return { name: real, resolution };
  }
  return null;
}

/** Find a skin sound by base name; osu allows wav/ogg/mp3. */
export function resolveSound(files: string[], base: string): string | null {
  const lower = new Map(files.map((f) => [f.toLowerCase(), f]));
  const want = base.toLowerCase();
  for (const ext of ['wav', 'ogg', 'mp3']) {
    const real = lower.get(`${want}.${ext}`);
    if (real) return real;
  }
  return null;
}
