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

  it('slider heads build combo for a flat 30 without counting as judgements', () => {
    const s = new ScoreState();
    s.applySliderHead(true);
    expect(s.score).toBe(30);
    expect(s.combo).toBe(1);
    s.apply(300);
    expect(s.score).toBe(30 + 312);
    expect(s.counts).toEqual({ 300: 1, 100: 0, 50: 0, 0: 0 });
    expect(s.accuracy).toBe(1);
  });

  it('a missed slider head breaks combo but is not a miss', () => {
    const s = new ScoreState();
    s.apply(300);
    s.applySliderHead(false);
    expect(s.combo).toBe(0);
    expect(s.maxCombo).toBe(1);
    expect(s.counts[0]).toBe(0);
    expect(s.score).toBe(300);
  });
});

describe('maxScore', () => {
  /** 'H' = slider head hit, 'h' = slider head missed */
  const play = (events: (300 | 100 | 50 | 0 | 'H' | 'h')[]) => {
    const s = new ScoreState();
    for (const e of events) {
      if (e === 'H' || e === 'h') s.applySliderHead(e === 'H');
      else s.apply(e);
    }
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
    expect(maxScore(statsOf(s), 0)).toBe(s.score);
  });

  it('bounds a slider-only full combo of 300s', () => {
    const s = play(Array.from({ length: 20 }, () => ['H', 300] as const).flat());
    expect(maxScore(statsOf(s), 20)).toBeGreaterThanOrEqual(s.score);
  });

  it('bounds plays where heads let later hits sit higher in the combo', () => {
    // two 10-long runs whose hits all sit in the top half; a head-less bound would be too low
    const run = [...Array.from({ length: 5 }, () => 'H' as const), ...Array.from({ length: 5 }, () => 300 as const)];
    const s = play([...run, 'h', ...run]);
    expect(maxScore(statsOf(s), 0)).toBeLessThan(s.score);
    expect(maxScore(statsOf(s), 10)).toBeGreaterThanOrEqual(s.score);
  });

  it('bounds any ordering of the same judgments and combo', () => {
    const s = play([100, 300, 300, 0, 50, 300, 300, 300, 0, 300, 100]);
    expect(maxScore(statsOf(s), 0)).toBeGreaterThanOrEqual(s.score);
    // best case puts the 300s at the top of each 3-long combo run
    expect(maxScore(statsOf(s), 0)).toBeLessThan(s.score * 1.2);
  });

  it('is zero without hits', () => {
    expect(maxScore({ count300: 0, count100: 0, count50: 0, maxCombo: 0 }, 0)).toBe(0);
  });
});
