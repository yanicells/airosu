import { describe, it, expect } from 'vitest';
import { hitWindows, judgeTiming, inRadius, sliderJudgment } from './judge';
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

describe('sliderJudgment', () => {
  it('300 needs the head and (near-)full follow', () => {
    expect(sliderJudgment(true, 1, 1)).toBe(300);
    expect(sliderJudgment(true, 0.9, 3)).toBe(300);
    expect(sliderJudgment(true, 0.89, 1)).toBe(100);
  });
  it('a missed head caps a perfectly followed slider at 100', () => {
    expect(sliderJudgment(false, 1, 1)).toBe(100);
    expect(sliderJudgment(false, 1, 4)).toBe(100);
  });
  it('a hit head with a dropped follow is a 50; partial follow earns a 100', () => {
    expect(sliderJudgment(true, 0, 1)).toBe(50);
    expect(sliderJudgment(true, 0.3, 1)).toBe(100);
    expect(sliderJudgment(true, 0.3, 4)).toBe(50);
  });
  it('a missed head needs most of the follow for a 100', () => {
    expect(sliderJudgment(false, 0.8, 1)).toBe(100);
    expect(sliderJudgment(false, 0.6, 1)).toBe(50);
  });
  it('any part hit is at least a 50; nothing hit is a miss', () => {
    expect(sliderJudgment(false, 0.05, 1)).toBe(50);
    expect(sliderJudgment(false, 0, 1)).toBe(0);
  });
});
