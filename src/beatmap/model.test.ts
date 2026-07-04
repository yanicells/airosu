import { describe, it, expect } from 'vitest';
import { circleRadius } from './model';

describe('circleRadius', () => {
  it('computes osu!pixel radius from CS', () => {
    expect(circleRadius(4)).toBeCloseTo(36.48);
  });
});
