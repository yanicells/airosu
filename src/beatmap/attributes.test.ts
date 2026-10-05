import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { OszArchive, listDifficulties } from './load';
import { computeMapAttributes } from './attributes';
import { PpCounter, preparePp } from '../game/pp';
import { airosuMaxCombo, playPp } from '../game/ppFormula';

const osz = new Uint8Array(
  readFileSync('game-assets/test-maps/444335 HO-KAGO TEA TIME - Kira Kira Days.osz'),
);
const easy = listDifficulties(osz).find((d) => /easy/i.test(d.difficultyName))!;

describe('computeMapAttributes', () => {
  it('extracts metadata, difficulty and worth', () => {
    const a = computeMapAttributes(easy.osuText);
    expect(a.title.length).toBeGreaterThan(0);
    expect(a.objectCount).toBeGreaterThan(0);
    expect(a.objectCount).toBe(new OszArchive(osz).load(easy.difficultyName).objects.length);
    expect(a.judgmentCount).toBe(a.objectCount);
    // server validation derives object counts from the difficulty attributes
    const d = a.difficulty;
    expect(d.hitCircleCount + d.sliderCount + d.spinnerCount).toBe(a.objectCount);
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
      maxCombo: airosuMaxCombo(a.difficulty),
    };
    expect(playPp(a.difficulty, ss)).toBeCloseTo(new PpCounter(preparePp(easy.osuText)).final(ss), 6);
  });
});
