import { describe, expect, it } from 'vitest';
import manifest from '../../game-assets/starter-maps/manifest.json';

// The manifest may be empty until the repo owner provides licensed assets
// (Human prerequisite 5). Once populated it must hold 2–3 fully-evidenced maps.
const maps = manifest.maps as Array<{
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
}>;

describe('starter map manifest', () => {
  it('has version 1 and at most 3 maps', () => {
    expect(manifest.version).toBe(1);
    expect(maps.length).toBeLessThanOrEqual(3);
    if (maps.length > 0) expect(maps.length).toBeGreaterThanOrEqual(2);
  });

  it('has unique ids and files', () => {
    expect(new Set(maps.map((m) => m.id)).size).toBe(maps.length);
    expect(new Set(maps.map((m) => m.file)).size).toBe(maps.length);
  });

  it('validates every entry', () => {
    for (const m of maps) {
      expect(m.id).toMatch(/^[a-z0-9-]+$/);
      expect(m.file).toBe(`${m.id}.osz`);
      expect(m.sha256).toMatch(/^[0-9a-f]{64}$/);
      expect(m.byteLength).toBeGreaterThan(0);
      expect(m.sourceUrl).toMatch(/^https:\/\//);
      expect(m.evidence).toBe(`LICENSES/${m.id}.md`);
      for (const field of ['artist', 'title', 'license', 'attribution'] as const) {
        expect(m[field].trim().length, `${m.id}: ${field}`).toBeGreaterThan(0);
      }
    }
  });

  it('stays within the 15 MB budget', () => {
    const total = maps.reduce((sum, m) => sum + m.byteLength, 0);
    expect(total).toBeLessThanOrEqual(15_000_000);
  });
});
