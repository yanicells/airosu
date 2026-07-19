import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ScoreInfo } from 'osu-classes';
import { BeatmapDecoder } from 'osu-parsers';
import { StandardRuleset } from 'osu-standard-stable';
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

/**
 * PP v1 pipeline, frozen here as the historical record. Production code moved
 * to v2 (pure lazer play pp × flat multiplier); these fixtures document what
 * v1 produced so old screenshots/logs stay explicable.
 *
 * v1's PpCounter took the map worth (lazer SS pp) from the last timed
 * difficulty entry, which differs slightly from a plain calculate() — the
 * worth is reproduced the same way here.
 */
function ssWorthV1(osuText: string, judged: number): { ssPp: number; starRating: number } {
  const ruleset = new StandardRuleset();
  const parsed = new BeatmapDecoder().decodeFromString(osuText, { parseStoryboard: false });
  const calculator = ruleset.createDifficultyCalculator(ruleset.applyToBeatmap(parsed));
  const timed = [...calculator.calculateTimed()];
  const attributes = timed.length ? timed[timed.length - 1].attributes : calculator.calculate();
  const perfect = new ScoreInfo();
  perfect.ruleset = ruleset;
  perfect.maxCombo = attributes.maxCombo;
  perfect.count300 = judged;
  const ssPp = ruleset
    .createPerformanceCalculator(attributes, perfect)
    .calculateAttributes().totalPerformance;
  return { ssPp, starRating: attributes.starRating };
}

function playPpV1(worth: { ssPp: number; starRating: number }, s: HitStats): number {
  const judged = s.count300 + s.count100 + s.count50 + s.countMiss;
  if (judged === 0) return 0;
  const accuracy = (s.count300 * 300 + s.count100 * 100 + s.count50 * 50) / (300 * judged);
  const comboRatio = Math.min(1, s.maxCombo / judged);
  const quality = Math.pow(accuracy, 2.5) * (0.35 + 0.65 * Math.pow(comboRatio, 0.6));
  const handicap = 2 + 30 * Math.exp(-worth.starRating);
  return worth.ssPp * quality * handicap;
}

describe('airosu PP v1 historical fixtures', () => {
  it('reproduces the recorded v1 values from the frozen formula', () => {
    const diffs = listDifficulties(kira);
    const easy = diffs.find((d) => d.difficultyName.includes("Rocket's Easy"))!;
    const insane = diffs.find((d) => d.difficultyName.includes("Mamayu's Insane"))!;
    const easySS = perfectStats(kira, easy.difficultyName);
    const insaneSS = perfectStats(kira, insane.difficultyName);
    expect(playPpV1(ssWorthV1(easy.osuText, easySS.count300), easySS))
      .toBeCloseTo(42.26395250711483, 8);
    expect(playPpV1(ssWorthV1(insane.osuText, insaneSS.count300), insaneSS))
      .toBeCloseTo(347.776643644777, 8);

    const beginner = listDifficulties(quaver)
      .find((d) => d.difficultyName.includes("Akitoshi's Beginner"))!;
    const judged = perfectStats(quaver, beginner.difficultyName).count300;
    const play = { count300: 47, count100: 6, count50: 0, countMiss: 5, maxCombo: 19 };
    expect(playPpV1(ssWorthV1(beginner.osuText, judged), play))
      .toBeCloseTo(13.401307625182142, 8);
  });
});

describe('airosu PP v2 fixtures', () => {
  it('pins SS values on the low-star and high-star kira difficulties', () => {
    const diffs = listDifficulties(kira);
    const easy = diffs.find((d) => d.difficultyName.includes("Rocket's Easy"))!;
    const insane = diffs.find((d) => d.difficultyName.includes("Mamayu's Insane"))!;
    expect(new PpCounter(easy.osuText).final(perfectStats(kira, easy.difficultyName)))
      .toBeCloseTo(11.165093312671301, 8);
    expect(new PpCounter(insane.osuText).final(perfectStats(kira, insane.difficultyName)))
      .toBeCloseTo(350.89074684163637, 8);
  });

  it('pins the real hand-tracked quaver sample', () => {
    const beginner = listDifficulties(quaver)
      .find((d) => d.difficultyName.includes("Akitoshi's Beginner"))!;
    const play = { count300: 47, count100: 6, count50: 0, countMiss: 5, maxCombo: 19 };
    expect(new PpCounter(beginner.osuText).final(play)).toBeCloseTo(0.4108497141346454, 8);
  });
});
