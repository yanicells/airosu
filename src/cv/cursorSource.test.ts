import { describe, expect, it } from 'vitest';
import { cursorFilterOptions } from './cursorSource';

describe('cursorFilterOptions', () => {
  it('preserves the existing palm filter at default smoothing', () => {
    expect(cursorFilterOptions(0.5, 'palm')).toEqual({ minCutoff: 1, beta: 0.007 });
  });

  it('adds low-speed stability and fast-motion response for the fingertip', () => {
    expect(cursorFilterOptions(0.5, 'index')).toEqual({ minCutoff: 0.75, beta: 0.012 });
  });

  it('clamps both profiles to a positive cutoff', () => {
    expect(cursorFilterOptions(99, 'palm').minCutoff).toBe(0.1);
    expect(cursorFilterOptions(99, 'index').minCutoff).toBe(0.1);
  });
});
