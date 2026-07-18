import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { listDifficulties, loadFromOsz } from './load';
import { computeMapAttributes } from './attributes';
import { PpCounter } from '../game/pp';
import { playPp } from '../game/ppFormula';

const osz = new Uint8Array(
  readFileSync('game-assets/test-maps/444335 HO-KAGO TEA TIME - Kira Kira Days.osz'),
);
const easy = listDifficulties(osz).find((d) => /easy/i.test(d.difficultyName))!;

describe('computeMapAttributes', () => {
  it('extracts metadata, difficulty and worth', () => {
    const a = computeMapAttributes(easy.osuText);
    expect(a.title.length).toBeGreaterThan(0);
    expect(a.objectCount).toBeGreaterThan(0);
    expect(a.judgmentCount).toBeGreaterThanOrEqual(a.objectCount);
    expect(a.judgmentCount).toBe(
      loadFromOsz(osz, easy.difficultyName).objects.reduce(
        (count, object) => count + (object.kind === 'slider' ? 2 : 1),
        0,
      ),
    );
    expect(a.maxCombo).toBeGreaterThanOrEqual(a.objectCount);
    expect(a.starRating).toBeGreaterThan(0);
    expect(a.starRating).toBeLessThan(3);
    expect(a.ssPp).toBeGreaterThan(0);
    expect(a.beatmapSetId).toBe(444335);
    const ss = {
      count300: a.judgmentCount,
      count100: 0,
      count50: 0,
      countMiss: 0,
      maxCombo: a.judgmentCount,
    };
    expect(playPp(a, ss)).toBeCloseTo(new PpCounter(easy.osuText).final(ss), 6);
  });
});
