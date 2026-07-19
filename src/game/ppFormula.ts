/**
 * airosu pp formula, shared verbatim by the client (live pp) and Convex
 * (authoritative pp on submit + recalc migrations).
 *
 * airosu pp = osu!lazer play pp × AIROSU_PP_MULTIPLIER. Lazer's own
 * performance calculator (osu-standard-stable) judges the play — stars,
 * accuracy, combo, misses, map difficulty — and one flat webcam multiplier
 * scales the result. No airosu-specific curves.
 *
 * PP_VERSION identifies the formula that produced a stored pp value. Any
 * change to the math below MUST bump it and run the recalc migration
 * (docs/pp-rework-runbook.md).
 */
import { ScoreInfo } from 'osu-classes';
import { StandardRuleset, type StandardDifficultyAttributes } from 'osu-standard-stable';

export const PP_VERSION = 2;

/** Flat hand-tracking adjustment applied on top of lazer's play pp. */
export const AIROSU_PP_MULTIPLIER = 2.25;

const ruleset = new StandardRuleset();

export interface HitStats {
  count300: number;
  count100: number;
  count50: number;
  countMiss: number;
  maxCombo: number;
}

/**
 * Serializable subset of lazer's StandardDifficultyAttributes — everything
 * the performance calculator reads. Stored per map in Convex and produced
 * client-side by the difficulty calculator.
 */
export interface MapDifficulty {
  starRating: number;
  aimDifficulty: number;
  speedDifficulty: number;
  speedNoteCount: number;
  flashlightDifficulty: number;
  sliderFactor: number;
  approachRate: number;
  overallDifficulty: number;
  drainRate: number;
  hitCircleCount: number;
  sliderCount: number;
  spinnerCount: number;
  maxCombo: number;
}

/** Picks the serializable difficulty fields off a calculator result. */
export function toMapDifficulty(a: StandardDifficultyAttributes): MapDifficulty {
  return {
    starRating: a.starRating,
    aimDifficulty: a.aimDifficulty,
    speedDifficulty: a.speedDifficulty,
    speedNoteCount: a.speedNoteCount,
    flashlightDifficulty: a.flashlightDifficulty,
    sliderFactor: a.sliderFactor,
    approachRate: a.approachRate,
    overallDifficulty: a.overallDifficulty,
    drainRate: a.drainRate,
    hitCircleCount: a.hitCircleCount,
    sliderCount: a.sliderCount,
    spinnerCount: a.spinnerCount,
    maxCombo: a.maxCombo,
  };
}

export function judgedCount(s: HitStats): number {
  return s.count300 + s.count100 + s.count50 + s.countMiss;
}

export function accuracyOf(s: HitStats): number {
  const judged = judgedCount(s);
  if (judged === 0) return 0;
  return (s.count300 * 300 + s.count100 * 100 + s.count50 * 50) / (300 * judged);
}

/** Lazer pp of the play (nomod), before the airosu multiplier. */
export function lazerPp(difficulty: MapDifficulty, s: HitStats): number {
  const judged = judgedCount(s);
  if (judged === 0) return 0;

  // airosu combo counts judgments (slider = head + final); lazer's max combo
  // also counts slider ticks. Map the player's per-judgment combo ratio onto
  // lazer's scale so a genuine FC is a lazer FC.
  const comboRatio = Math.min(1, s.maxCombo / judged);

  const score = new ScoreInfo();
  score.ruleset = ruleset;
  score.maxCombo = Math.round(difficulty.maxCombo * comboRatio);
  score.count300 = s.count300;
  score.count100 = s.count100;
  score.count50 = s.count50;
  score.countMiss = s.countMiss;

  const total = ruleset
    .createPerformanceCalculator(difficulty as StandardDifficultyAttributes, score)
    .calculateAttributes().totalPerformance;
  return Number.isFinite(total) ? total : 0;
}

export function playPp(difficulty: MapDifficulty, s: HitStats): number {
  return lazerPp(difficulty, s) * AIROSU_PP_MULTIPLIER;
}
