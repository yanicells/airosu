import { describe, it, expect } from 'vitest';
import { starColor } from './starColor';

describe('starColor', () => {
  it('clamps low ratings to the easiest blue', () => {
    expect(starColor(0)).toBe('#4290fb');
  });

  it('returns exact spectrum stops', () => {
    expect(starColor(2)).toBe('#4fffd5');
    expect(starColor(4.2)).toBe('#ff8068');
  });

  it('interpolates between stops', () => {
    const c = starColor(2.25); // halfway 2 → 2.5: #4fffd5 → #7cff4f
    expect(c).toBe('#66ff92');
  });

  it('caps extreme ratings at black', () => {
    expect(starColor(9)).toBe('#000000');
    expect(starColor(12)).toBe('#000000');
  });
});
