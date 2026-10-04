import { describe, expect, it } from 'vitest';
import { PP_VERSION } from './ppFormula';
import { scoreDerived, validateSubmission, weightedTotals } from '../../convex/lib/scoring';

/** 80 objects (60 circles, 20 sliders); full airosu combo 100 */
const map = {
  difficulty: {
    starRating: 3,
    aimDifficulty: 1.5,
    speedDifficulty: 1.2,
    speedNoteCount: 60,
    flashlightDifficulty: 0,
    sliderFactor: 0.98,
    approachRate: 8,
    overallDifficulty: 7,
    drainRate: 5,
    hitCircleCount: 60,
    sliderCount: 20,
    spinnerCount: 0,
    maxCombo: 120,
  },
};
const ss = { count300: 80, count100: 0, count50: 0, countMiss: 0, maxCombo: 100 };
const v = (s: typeof ss) => validateSubmission(map.difficulty, s);

describe('validateSubmission', () => {
  it('accepts a full clean play', () => expect(v(ss)).toBeNull());
  it('rejects judgment counts that do not cover the map', () =>
    expect(v({ ...ss, count300: 50 })).toMatch(/judgment/i));
  it('rejects v2-style counts with a judgement per slider head', () =>
    expect(v({ ...ss, count300: 100 })).toMatch(/judgment/i));
  it('rejects impossible combo', () => expect(v({ ...ss, maxCombo: 101 })).toMatch(/combo/i));
  it('rejects combo larger than what the unmissed objects allow', () => {
    expect(v({ ...ss, count300: 10, countMiss: 70, maxCombo: 31 })).toMatch(/combo/i);
    expect(v({ ...ss, count300: 10, countMiss: 70, maxCombo: 30 })).toBeNull();
  });
  it('rejects negative and non-integer counts', () => {
    expect(v({ ...ss, count100: -1, count300: 81 })).not.toBeNull();
    expect(v({ ...ss, count300: 79.5, count100: 0.5 })).not.toBeNull();
  });
});

describe('scoreDerived', () => {
  it('computes accuracy, grade, pp, version', () => {
    const d = scoreDerived(map, ss);
    expect(d.accuracy).toBe(1);
    expect(d.grade).toBe('SS');
    expect(d.pp).toBeGreaterThan(0);
    expect(d.ppVersion).toBe(PP_VERSION);
  });
});

describe('weightedTotals', () => {
  it('weights 0.95^i over pp-descending plays', () => {
    const { totalPp, hitAccuracy } = weightedTotals([
      { pp: 100, accuracy: 1 },
      { pp: 50, accuracy: 0.9 },
    ]);
    expect(totalPp).toBeCloseTo(100 + 50 * 0.95, 6);
    expect(hitAccuracy).toBeCloseTo((1 + 0.9 * 0.95) / (1 + 0.95), 6);
  });
  it('is 0/0-safe', () => expect(weightedTotals([])).toEqual({ totalPp: 0, hitAccuracy: 0 }));
});
