import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ScoreInfo } from 'osu-classes';
import { BeatmapDecoder } from 'osu-parsers';
import { StandardRuleset, type StandardDifficultyAttributes } from 'osu-standard-stable';
import { OszArchive, listDifficulties } from '../beatmap/load';
import { PpCounter, preparePp, type HitStats } from './pp';
import { AIROSU_PP_MULTIPLIER, airosuMaxCombo, type MapDifficulty } from './ppFormula';

const kira = new Uint8Array(
  readFileSync('game-assets/test-maps/444335 HO-KAGO TEA TIME - Kira Kira Days.osz'),
);
const quaver = new Uint8Array(
  readFileSync('game-assets/test-maps/873811 dj TAKA - quaver.osz'),
);

/** PP v1/v2 counting: every slider gave a head and an end judgement. */
function perfectStatsV2(bytes: Uint8Array, difficultyName: string): HitStats {
  const map = new OszArchive(bytes).load(difficultyName);
  const judged = map.objects.reduce((n, o) => n + (o.kind === 'slider' ? 2 : 1), 0);
  return { count300: judged, count100: 0, count50: 0, countMiss: 0, maxCombo: judged };
}

/** PP v3 counting: one judgement per object, full combo includes each slider head. */
function perfectStatsV3(osuText: string): HitStats {
  const d = preparePp(osuText).full;
  const objects = d.hitCircleCount + d.sliderCount + d.spinnerCount;
  return { count300: objects, count100: 0, count50: 0, countMiss: 0, maxCombo: airosuMaxCombo(d) };
}

/**
 * PP v1 pipeline, frozen here as the historical record. Production code moved
 * to v2 (pure lazer play pp × flat multiplier), then v3 (one judgement per
 * slider); these fixtures document what v1 produced so old screenshots/logs
 * stay explicable.
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
    const easySS = perfectStatsV2(kira, easy.difficultyName);
    const insaneSS = perfectStatsV2(kira, insane.difficultyName);
    expect(playPpV1(ssWorthV1(easy.osuText, easySS.count300), easySS))
      .toBeCloseTo(42.26395250711483, 8);
    expect(playPpV1(ssWorthV1(insane.osuText, insaneSS.count300), insaneSS))
      .toBeCloseTo(347.776643644777, 8);

    const beginner = listDifficulties(quaver)
      .find((d) => d.difficultyName.includes("Akitoshi's Beginner"))!;
    const judged = perfectStatsV2(quaver, beginner.difficultyName).count300;
    const play = { count300: 47, count100: 6, count50: 0, countMiss: 5, maxCombo: 19 };
    expect(playPpV1(ssWorthV1(beginner.osuText, judged), play))
      .toBeCloseTo(13.401307625182142, 8);
  });
});

/**
 * PP v2 formula, frozen as the historical record: lazer play pp × the flat
 * multiplier, fed v2's double-counted slider judgements, with combo scaled by
 * the judged count. v3 judges each slider once and scales combo by airosu's
 * max combo instead.
 */
function playPpV2(difficulty: MapDifficulty, s: HitStats): number {
  const judged = s.count300 + s.count100 + s.count50 + s.countMiss;
  if (judged === 0) return 0;
  const ruleset = new StandardRuleset();
  const score = new ScoreInfo();
  score.ruleset = ruleset;
  score.maxCombo = Math.round(difficulty.maxCombo * Math.min(1, s.maxCombo / judged));
  score.count300 = s.count300;
  score.count100 = s.count100;
  score.count50 = s.count50;
  score.countMiss = s.countMiss;
  const total = ruleset
    .createPerformanceCalculator(difficulty as StandardDifficultyAttributes, score)
    .calculateAttributes().totalPerformance;
  return (Number.isFinite(total) ? total : 0) * AIROSU_PP_MULTIPLIER;
}

describe('airosu PP v2 historical fixtures', () => {
  it('reproduces the recorded v2 SS values on the low-star and high-star kira difficulties', () => {
    const diffs = listDifficulties(kira);
    const easy = diffs.find((d) => d.difficultyName.includes("Rocket's Easy"))!;
    const insane = diffs.find((d) => d.difficultyName.includes("Mamayu's Insane"))!;
    expect(playPpV2(preparePp(easy.osuText).full, perfectStatsV2(kira, easy.difficultyName)))
      .toBeCloseTo(11.165093312671301, 8);
    expect(playPpV2(preparePp(insane.osuText).full, perfectStatsV2(kira, insane.difficultyName)))
      .toBeCloseTo(350.89074684163637, 8);
  });

  it('reproduces the recorded v2 value of the real hand-tracked quaver sample', () => {
    const beginner = listDifficulties(quaver)
      .find((d) => d.difficultyName.includes("Akitoshi's Beginner"))!;
    const play = { count300: 47, count100: 6, count50: 0, countMiss: 5, maxCombo: 19 };
    expect(playPpV2(preparePp(beginner.osuText).full, play)).toBeCloseTo(0.4108497141346454, 8);
  });
});

describe('airosu PP v3 fixtures', () => {
  it('pins SS values on the low-star and high-star kira difficulties', () => {
    const diffs = listDifficulties(kira);
    const easy = diffs.find((d) => d.difficultyName.includes("Rocket's Easy"))!;
    const insane = diffs.find((d) => d.difficultyName.includes("Mamayu's Insane"))!;
    expect(new PpCounter(preparePp(easy.osuText)).final(perfectStatsV3(easy.osuText)))
      .toBeCloseTo(11.039388034784873, 8);
    expect(new PpCounter(preparePp(insane.osuText)).final(perfectStatsV3(insane.osuText)))
      .toBeCloseTo(342.46873202563063, 8);
  });
});
