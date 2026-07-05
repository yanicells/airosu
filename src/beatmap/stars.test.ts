import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';
import { listDifficulties } from './load';
import { starRating } from './stars';

const osz = new Uint8Array(
  readFileSync('game-assets/maps/444335 HO-KAGO TEA TIME - Kira Kira Days.osz'),
);

describe('star rating', () => {
  it('computes plausible stars for every difficulty', () => {
    for (const d of listDifficulties(osz)) {
      const stars = starRating(d.osuText);
      expect(stars).toBeGreaterThan(0.5);
      expect(stars).toBeLessThan(9);
    }
  });

  it('ranks Easy below Insane', () => {
    const diffs = listDifficulties(osz);
    const easy = diffs.find((d) => d.difficultyName.toLowerCase().includes('easy'));
    const insane = diffs.find((d) => d.difficultyName.toLowerCase().includes('insane'));
    if (!easy || !insane) throw new Error('fixture difficulties changed');
    expect(starRating(easy.osuText)).toBeLessThan(starRating(insane.osuText));
  });
});
