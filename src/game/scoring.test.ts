import { describe, expect, it } from 'vitest';
import { PP_VERSION } from './ppFormula';
import { scoreDerived, validateSubmission, weightedTotals } from '../../convex/lib/scoring';

const map = { judgmentCount: 100, ssPp: 100, starRating: 3 };
const ss = { count300: 100, count100: 0, count50: 0, countMiss: 0, maxCombo: 100 };

describe('validateSubmission', () => {
  it('accepts a full clean play', () => expect(validateSubmission(map, ss)).toBeNull());
  it('accepts slider-aware judgment totals larger than osu object count', () =>
    expect(validateSubmission({ judgmentCount: 100 }, ss)).toBeNull());
  it('rejects judgment counts that do not cover the map', () =>
    expect(validateSubmission(map, { ...ss, count300: 50 })).toMatch(/judgment/i));
  it('rejects impossible combo', () =>
    expect(validateSubmission(map, { ...ss, maxCombo: 101 })).toMatch(/combo/i));
  it('rejects negative and non-integer counts', () => {
    expect(validateSubmission(map, { ...ss, count100: -1, count300: 101 })).not.toBeNull();
    expect(validateSubmission(map, { ...ss, count300: 99.5, count100: 0.5 })).not.toBeNull();
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
