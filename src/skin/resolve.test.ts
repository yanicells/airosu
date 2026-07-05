import { describe, it, expect } from 'vitest';
import { resolveImage, resolveSound } from './resolve';

const FILES = [
  'hitcircle.png',
  'hitcircleoverlay.png',
  'approachcircle.png',
  'sliderb0.png',
  'sliderb0@2x.png',
  'Cursor.png',
  'num/berlin-5.png',
  'num/berlin-5@2x.png',
  'hit300-0.png',
  'hit300-1.png',
  'app/approachcircle (2).png',
  'normal-hitnormal.wav',
  'hitsound/normal-hitnormal.wav',
  'combobreak.wav',
];

describe('resolveImage', () => {
  it('prefers @2x with resolution 2', () => {
    expect(resolveImage(FILES, 'sliderb0')).toEqual({ name: 'sliderb0@2x.png', resolution: 2 });
  });

  it('falls back to 1x', () => {
    expect(resolveImage(FILES, 'hitcircle')).toEqual({ name: 'hitcircle.png', resolution: 1 });
  });

  it('matches case-insensitively but returns the real name', () => {
    expect(resolveImage(FILES, 'cursor')).toEqual({ name: 'Cursor.png', resolution: 1 });
  });

  it('resolves prefixed paths, not lookalikes in other folders', () => {
    expect(resolveImage(FILES, 'num/berlin-5')).toEqual({
      name: 'num/berlin-5@2x.png',
      resolution: 2,
    });
    expect(resolveImage(FILES, 'approachcircle')).toEqual({
      name: 'approachcircle.png',
      resolution: 1,
    });
  });

  it('falls back to first animation frame', () => {
    expect(resolveImage(FILES, 'hit300')).toEqual({ name: 'hit300-0.png', resolution: 1 });
  });

  it('returns null when missing', () => {
    expect(resolveImage(FILES, 'sliderstartcircle')).toBeNull();
  });
});

describe('resolveSound', () => {
  it('finds root-level wav', () => {
    expect(resolveSound(FILES, 'normal-hitnormal')).toBe('normal-hitnormal.wav');
    expect(resolveSound(FILES, 'combobreak')).toBe('combobreak.wav');
  });

  it('returns null when missing', () => {
    expect(resolveSound(FILES, 'sectionpass')).toBeNull();
  });
});
