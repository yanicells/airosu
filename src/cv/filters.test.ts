import { describe, it, expect } from 'vitest';
import { OneEuroFilter } from './filters';

describe('OneEuroFilter', () => {
  it('first sample passes through', () => {
    const f = new OneEuroFilter({ minCutoff: 1, beta: 0 });
    expect(f.filter(5, 0)).toBe(5);
  });

  it('smooths noise at low speed', () => {
    const f = new OneEuroFilter({ minCutoff: 1, beta: 0 });
    f.filter(0, 0);
    const out = f.filter(1, 1 / 60);
    expect(out).toBeGreaterThan(0);
    expect(out).toBeLessThan(1);
  });

  it('tracks fast movement closely with high beta', () => {
    const slow = new OneEuroFilter({ minCutoff: 1, beta: 0 });
    const fast = new OneEuroFilter({ minCutoff: 1, beta: 1 });
    slow.filter(0, 0);
    fast.filter(0, 0);
    expect(fast.filter(100, 1 / 60)).toBeGreaterThan(slow.filter(100, 1 / 60));
  });

  it('reset clears state', () => {
    const f = new OneEuroFilter({ minCutoff: 1, beta: 0 });
    f.filter(0, 0);
    f.filter(1, 1 / 60);
    f.reset();
    expect(f.filter(42, 1)).toBe(42);
  });
});
