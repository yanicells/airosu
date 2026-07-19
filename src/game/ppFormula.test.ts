import { describe, expect, it } from 'vitest';
import {
  AIROSU_PP_MULTIPLIER,
  PP_VERSION,
  accuracyOf,
  judgedCount,
  lazerPp,
  playPp,
  type MapDifficulty,
} from './ppFormula';

const ss = { count300: 100, count100: 0, count50: 0, countMiss: 0, maxCombo: 100 };

/** plausible ~3★ map attributes */
const difficulty: MapDifficulty = {
  starRating: 3,
  aimDifficulty: 1.5,
  speedDifficulty: 1.2,
  speedNoteCount: 60,
  flashlightDifficulty: 0,
  sliderFactor: 0.98,
  approachRate: 8,
  overallDifficulty: 7,
  drainRate: 5,
  hitCircleCount: 80,
  sliderCount: 10,
  spinnerCount: 0,
  maxCombo: 130,
};

describe('ppFormula', () => {
  it('has a version', () => expect(PP_VERSION).toBe(2));

  it('accuracy: SS is 1, all-miss is 0, empty is 0', () => {
    expect(accuracyOf(ss)).toBe(1);
    expect(accuracyOf({ ...ss, count300: 0, countMiss: 100, maxCombo: 0 })).toBe(0);
    expect(accuracyOf({ count300: 0, count100: 0, count50: 0, countMiss: 0, maxCombo: 0 })).toBe(0);
  });

  it('judgedCount sums all judgments', () => expect(judgedCount(ss)).toBe(100));

  it('pp is lazer play pp times the flat airosu multiplier', () => {
    expect(playPp(difficulty, ss)).toBeCloseTo(lazerPp(difficulty, ss) * AIROSU_PP_MULTIPLIER, 10);
    expect(lazerPp(difficulty, ss)).toBeGreaterThan(0);
  });

  it('worse accuracy, combo, and misses earn strictly less', () => {
    const worseAcc = { ...ss, count300: 90, count100: 10 };
    const worseCombo = { ...ss, maxCombo: 50 };
    const missy = { ...ss, count300: 90, countMiss: 10, maxCombo: 40 };
    expect(playPp(difficulty, worseAcc)).toBeLessThan(playPp(difficulty, ss));
    expect(playPp(difficulty, worseCombo)).toBeLessThan(playPp(difficulty, ss));
    expect(playPp(difficulty, missy)).toBeLessThan(playPp(difficulty, worseAcc));
    expect(playPp(difficulty, missy)).toBeGreaterThan(0);
  });

  it('a full per-judgment combo maps to a lazer full combo', () => {
    // game combo counts judgments; lazer max combo counts slider ticks too
    expect(playPp(difficulty, ss)).toBeCloseTo(playPp(difficulty, { ...ss, maxCombo: 1000 }), 10);
  });

  it('zero judgments earn zero pp', () => {
    expect(
      playPp(difficulty, { count300: 0, count100: 0, count50: 0, countMiss: 0, maxCombo: 0 }),
    ).toBe(0);
  });
});
