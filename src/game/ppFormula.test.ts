import { describe, expect, it } from 'vitest';
import { PP_VERSION, accuracyOf, judgedCount, playPp } from './ppFormula';

const ss = { count300: 100, count100: 0, count50: 0, countMiss: 0, maxCombo: 100 };

describe('ppFormula', () => {
  it('has a version', () => expect(PP_VERSION).toBe(1));

  it('accuracy: SS is 1, all-miss is 0, empty is 0', () => {
    expect(accuracyOf(ss)).toBe(1);
    expect(accuracyOf({ ...ss, count300: 0, countMiss: 100, maxCombo: 0 })).toBe(0);
    expect(accuracyOf({ count300: 0, count100: 0, count50: 0, countMiss: 0, maxCombo: 0 })).toBe(0);
  });

  it('judgedCount sums all judgments', () => expect(judgedCount(ss)).toBe(100));

  it('SS full combo earns ssPp × handicap', () => {
    // 3★ map: handicap = 2 + 30·e⁻³
    const expected = 100 * 1 * (2 + 30 * Math.exp(-3));
    expect(playPp({ ssPp: 100, starRating: 3 }, ss)).toBeCloseTo(expected, 6);
  });

  it('worse accuracy and combo earn strictly less', () => {
    const worth = { ssPp: 100, starRating: 3 };
    const worse = { ...ss, count300: 90, count100: 10, maxCombo: 50 };
    expect(playPp(worth, worse)).toBeLessThan(playPp(worth, ss));
    expect(playPp(worth, worse)).toBeGreaterThan(0);
  });

  it('zero judgments earn zero pp', () => {
    expect(
      playPp(
        { ssPp: 100, starRating: 3 },
        { count300: 0, count100: 0, count50: 0, countMiss: 0, maxCombo: 0 },
      ),
    ).toBe(0);
  });
});
