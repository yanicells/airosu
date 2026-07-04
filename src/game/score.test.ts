import { describe, it, expect } from 'vitest';
import { ScoreState } from './score';

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
