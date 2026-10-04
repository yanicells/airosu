import { describe, it, expect } from 'vitest';
import { ScoreState, maxScore } from './score';

describe('ScoreState', () => {
  it('starts fresh', () => {
    const s = new ScoreState();
    expect(s.score).toBe(0);
    expect(s.combo).toBe(0);
    expect(s.accuracy).toBe(1);
  });

  it('applies 300s with combo multiplier', () => {
    const s = new ScoreState();
    s.apply(300);
    expect(s.combo).toBe(1);
    expect(s.score).toBe(300);
    s.apply(300);
    expect(s.score).toBe(612);
  });

  it('miss resets combo, keeps maxCombo', () => {
    const s = new ScoreState();
    s.apply(300);
    s.apply(300);
    s.apply(0);
    expect(s.combo).toBe(0);
    expect(s.maxCombo).toBe(2);
    expect(s.accuracy).toBeCloseTo(600 / 900);
  });
});

describe('maxScore', () => {
  const play = (judgments: (300 | 100 | 50 | 0)[]) => {
    const s = new ScoreState();
    for (const j of judgments) s.apply(j);
    return s;
  };
  const statsOf = (s: ScoreState) => ({
    count300: s.counts[300],
    count100: s.counts[100],
    count50: s.counts[50],
    countMiss: s.counts[0],
    maxCombo: s.maxCombo,
  });

  it('is exact for a full combo of 300s', () => {
    const s = play(Array.from({ length: 50 }, () => 300 as const));
    expect(maxScore(statsOf(s))).toBe(s.score);
  });

  it('bounds any ordering of the same judgments and combo', () => {
    const s = play([100, 300, 300, 0, 50, 300, 300, 300, 0, 300, 100]);
    expect(maxScore(statsOf(s))).toBeGreaterThanOrEqual(s.score);
    // best case puts the 300s at the top of each 3-long combo run
    expect(maxScore(statsOf(s))).toBeLessThan(s.score * 1.2);
  });

  it('is zero without hits', () => {
    expect(maxScore({ count300: 0, count100: 0, count50: 0, maxCombo: 0 })).toBe(0);
  });
});
