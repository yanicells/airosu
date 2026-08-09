import { describe, expect, it } from 'vitest';
import { addKeyBinding, normalizeCapturedKey, removeKeyBinding } from './keyBindings';

describe('normalizeCapturedKey', () => {
  it('normalizes letters and space to game key values', () => {
    expect(normalizeCapturedKey('Z')).toBe('z');
    expect(normalizeCapturedKey(' ')).toBe(' ');
    expect(normalizeCapturedKey('Spacebar')).toBe(' ');
  });

  it('ignores modifier-only keys', () => {
    expect(normalizeCapturedKey('Shift')).toBeNull();
    expect(normalizeCapturedKey('Control')).toBeNull();
    expect(normalizeCapturedKey('Meta')).toBeNull();
  });
});

describe('key binding updates', () => {
  it('adds normalized keys once', () => {
    expect(addKeyBinding(['z'], 'X')).toEqual(['z', 'x']);
    expect(addKeyBinding(['z', 'x'], 'X')).toEqual(['z', 'x']);
  });

  it('never removes the final tap key', () => {
    expect(removeKeyBinding(['z', 'x'], 'z')).toEqual(['x']);
    expect(removeKeyBinding(['x'], 'x')).toEqual(['x']);
  });
});
