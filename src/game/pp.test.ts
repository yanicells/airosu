import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';
import { listDifficulties } from '../beatmap/load';
import { PpCounter, type HitStats } from './pp';

const osz = new Uint8Array(
  readFileSync('game-assets/maps/444335 HO-KAGO TEA TIME - Kira Kira Days.osz'),
);
const diffs = listDifficulties(osz);

/** rough SS stats: every object a 300, combo = object count */
function ssStats(osuText: string): HitStats {
  const objectCount = osuText
    .slice(osuText.indexOf('[HitObjects]'))
    .split('\n')
    .filter((l) => l.includes(',')).length;
  return { count300: objectCount, count100: 0, count50: 0, countMiss: 0, maxCombo: objectCount };
}

describe('PpCounter', () => {
  const insane = diffs.find((d) => d.difficultyName.toLowerCase().includes('insane'));
  const easy = diffs.find((d) => d.difficultyName.toLowerCase().includes('easy'));
  if (!insane || !easy) throw new Error('fixture difficulties changed');

  it('computes plausible pp for an SS', () => {
    const counter = new PpCounter(insane.osuText);
    const pp = counter.final(ssStats(insane.osuText));
    expect(pp).toBeGreaterThan(10);
    expect(pp).toBeLessThan(1000);
  });

  it('gives less pp for a play with misses', () => {
    const counter = new PpCounter(insane.osuText);
    const ss = ssStats(insane.osuText);
    const missy: HitStats = {
      ...ss,
      count300: ss.count300 - 20,
      countMiss: 20,
      maxCombo: Math.round(ss.maxCombo / 3),
    };
    expect(counter.final(missy)).toBeLessThan(counter.final(ss));
  });

  it('gives more pp on harder difficulty for same-shape play', () => {
    const easyPp = new PpCounter(easy.osuText).final(ssStats(easy.osuText));
    const insanePp = new PpCounter(insane.osuText).final(ssStats(insane.osuText));
    expect(insanePp).toBeGreaterThan(easyPp);
  });

  it('live pp is 0 before any object and grows toward final', () => {
    const counter = new PpCounter(insane.osuText);
    const ss = ssStats(insane.osuText);
    expect(counter.currentAt(-10000, ss)).toBe(0);
    const early = counter.currentAt(20_000, {
      count300: 50,
      count100: 0,
      count50: 0,
      countMiss: 0,
      maxCombo: 50,
    });
    expect(early).toBeGreaterThan(0);
    expect(early).toBeLessThan(counter.final(ss));
    // far past the map end, timed attributes equal the full map
    expect(counter.currentAt(10_000_000, ss)).toBeCloseTo(counter.final(ss), 3);
  });
});
