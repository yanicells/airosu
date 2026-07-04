import { describe, it, expect } from 'vitest';
import { hitWindows, judgeTiming, inRadius } from './judge';
import { circleRadius } from '../beatmap/model';

describe('hitWindows', () => {
  it('od 5 base windows', () => {
    expect(hitWindows(5, 1)).toEqual({ w300: 50, w100: 100, w50: 150 });
  });
  it('scales by forgiveness', () => {
    expect(hitWindows(5, 1.5)).toEqual({ w300: 75, w100: 150, w50: 225 });
  });
});

describe('judgeTiming', () => {
  it('perfect', () => expect(judgeTiming(0, 5, 1)).toBe(300));
  it('late 50', () => expect(judgeTiming(120, 5, 1)).toBe(50));
  it('miss zone', () => expect(judgeTiming(160, 5, 1)).toBe(0));
  it('too early ignored', () => expect(judgeTiming(-300, 5, 1)).toBe('ignore'));
});

describe('inRadius', () => {
  const cs = 4;
  it('true just inside forgiving radius', () => {
    const r = circleRadius(cs) * 1.5;
    expect(inRadius({ x: r - 0.001, y: 0 }, { x: 0, y: 0 }, cs, 1.5)).toBe(true);
  });
  it('false beyond', () => {
    const r = circleRadius(cs) * 1.5;
    expect(inRadius({ x: r + 1, y: 0 }, { x: 0, y: 0 }, cs, 1.5)).toBe(false);
  });
});
