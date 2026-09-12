import { afterEach, expect, it, vi } from 'vitest';
import { defaultSettings, loadSettings } from './appState';

afterEach(() => vi.unstubAllGlobals());

it('keeps valid saved settings and rejects malformed values independently', () => {
  vi.stubGlobal('localStorage', {
    getItem: () => JSON.stringify({
      volume: 8, tapKeys: [null, '', 'ESCAPE', 'X', 'x', ' '], smoothing: '0.5',
      sensitivity: 1.5, forgiveness: -1, audioOffsetMs: 1000,
      mirror: 'false', inputMode: 'other', visualMode: 'focus', cursorAnchor: 'index',
    }),
  });
  expect(loadSettings()).toEqual({
    ...defaultSettings, tapKeys: ['x', ' '], sensitivity: 1.5,
    visualMode: 'focus', cursorAnchor: 'index',
  });
});

it('falls back safely for corrupt storage and empty bindings', () => {
  const getItem = vi.fn();
  vi.stubGlobal('localStorage', { getItem });
  for (const value of ['{', 'null', '[]', '42', '{"tapKeys":[]}']) {
    getItem.mockReturnValue(value);
    expect(loadSettings()).toEqual(defaultSettings);
  }
});
