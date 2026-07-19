import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { listDifficulties, loadFromOsz } from '../beatmap/load';
import { PpCounter, type HitStats } from './pp';

const kira = new Uint8Array(
  readFileSync('game-assets/test-maps/444335 HO-KAGO TEA TIME - Kira Kira Days.osz'),
);
const quaver = new Uint8Array(
  readFileSync('game-assets/test-maps/873811 dj TAKA - quaver.osz'),
);

function perfectStats(bytes: Uint8Array, difficultyName: string): HitStats {
  const map = loadFromOsz(bytes, difficultyName);
  const judged = map.objects.reduce((n, o) => n + (o.kind === 'slider' ? 2 : 1), 0);
  return { count300: judged, count100: 0, count50: 0, countMiss: 0, maxCombo: judged };
}

describe('airosu PP v1 compatibility', () => {
  it('preserves the scaled low-star and high-star SS values', () => {
    const diffs = listDifficulties(kira);
    const easy = diffs.find((d) => d.difficultyName.includes("Rocket's Easy"))!;
    const insane = diffs.find((d) => d.difficultyName.includes("Mamayu's Insane"))!;
    expect(new PpCounter(easy.osuText).final(perfectStats(kira, easy.difficultyName)))
      .toBeCloseTo(42.26395250711483, 8);
    expect(new PpCounter(insane.osuText).final(perfectStats(kira, insane.difficultyName)))
      .toBeCloseTo(347.776643644777, 8);
  });

  it('preserves the real hand-tracked quaver sample', () => {
    const beginner = listDifficulties(quaver)
      .find((d) => d.difficultyName.includes("Akitoshi's Beginner"))!;
    const play = { count300: 47, count100: 6, count50: 0, countMiss: 5, maxCombo: 19 };
    expect(new PpCounter(beginner.osuText).final(play)).toBeCloseTo(13.401307625182142, 8);
  });
});
