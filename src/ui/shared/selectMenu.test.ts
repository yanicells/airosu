import { describe, expect, it } from 'vitest';
import { moveOptionIndex } from './selectMenuNavigation';

describe('moveOptionIndex', () => {
  it('wraps forward and backward through the options', () => {
    expect(moveOptionIndex(0, 'previous', 3)).toBe(2);
    expect(moveOptionIndex(2, 'next', 3)).toBe(0);
  });

  it('starts keyboard navigation at the nearest edge', () => {
    expect(moveOptionIndex(-1, 'next', 3)).toBe(0);
    expect(moveOptionIndex(-1, 'previous', 3)).toBe(2);
  });

  it('supports first and last navigation', () => {
    expect(moveOptionIndex(1, 'first', 3)).toBe(0);
    expect(moveOptionIndex(1, 'last', 3)).toBe(2);
  });

  it('returns no active option for an empty menu', () => {
    expect(moveOptionIndex(0, 'next', 0)).toBe(-1);
  });
});
