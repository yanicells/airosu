import { describe, it, expect } from 'vitest';
import { defaultBox, mapToPlayfield, boxFromSamples } from './calibration';

describe('mapToPlayfield', () => {
  const box = defaultBox();

  it('box center maps to playfield center', () => {
    const p = mapToPlayfield({ x: 0.5, y: 0.5 }, box, 1, false);
    expect(p.x).toBeCloseTo(256);
    expect(p.y).toBeCloseTo(192);
  });

  it('box left edge maps to x=0 unmirrored', () => {
    expect(mapToPlayfield({ x: 0.25, y: 0.5 }, box, 1, false).x).toBeCloseTo(0);
  });

  it('box left edge maps to x=512 mirrored', () => {
    expect(mapToPlayfield({ x: 0.25, y: 0.5 }, box, 1, true).x).toBeCloseTo(512);
  });

  it('clamps outside the box', () => {
    const p = mapToPlayfield({ x: 0, y: 1.5 }, box, 1, false);
    expect(p.x).toBeCloseTo(0);
    expect(p.y).toBeCloseTo(384);
  });

  it('sensitivity 2 reaches edge at half distance', () => {
    expect(mapToPlayfield({ x: 0.375, y: 0.5 }, box, 2, false).x).toBeCloseTo(0);
  });
});

describe('boxFromSamples', () => {
  it('builds padded bounding box', () => {
    const b = boxFromSamples([
      { x: 0.2, y: 0.3 },
      { x: 0.8, y: 0.7 },
    ]);
    expect(b.cx).toBeCloseTo(0.5);
    expect(b.cy).toBeCloseTo(0.5);
    expect(b.halfW).toBeCloseTo(0.3 + 0.06);
    expect(b.halfH).toBeCloseTo(0.2 + 0.04);
  });
});
