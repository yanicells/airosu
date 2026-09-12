import { describe, it, expect } from 'vitest';
import { defaultBox, mapToPlayfield } from './calibration';

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

import {
  adjustAimArea,
  cameraBoxToDisplay,
  displayBoxToCamera,
  isAtCalibrationCorner,
} from './calibration';

describe('custom aim area', () => {
  it('keeps movement inside the camera without changing its size', () => {
    expect(adjustAimArea(defaultBox(), 'move', 5, -5)).toEqual({
      cx: 0.75,
      cy: 0.25,
      halfW: 0.25,
      halfH: 0.25,
    });
  });
  it('resizes a corner while keeping its opposite corner fixed and a minimum size', () => {
    const b = adjustAimArea(defaultBox(), 'top-left', 1, 1);
    expect(b.cx + b.halfW).toBeCloseTo(0.75);
    expect(b.cy + b.halfH).toBeCloseTo(0.75);
    expect(b.halfW).toBeCloseTo(0.05);
    expect(b.halfH).toBeCloseTo(0.05);
  });
  it.each([false, true])(
    'maps offset visual corners exactly, mirror=%s, sensitivity=2',
    (mirror) => {
      const visual = { cx: 0.3, cy: 0.4, halfW: 0.15, halfH: 0.2 };
      const camera = displayBoxToCamera(visual, 2, mirror);
      expect(cameraBoxToDisplay(camera, 2, mirror).cx).toBeCloseTo(visual.cx);
      const topLeft = { x: mirror ? 0.85 : 0.15, y: 0.2 };
      expect(mapToPlayfield(topLeft, camera, 2, mirror).x).toBeCloseTo(0);
      expect(mapToPlayfield(topLeft, camera, 2, mirror).y).toBeCloseTo(0);
      expect(isAtCalibrationCorner(topLeft, camera, 'top-left', 2, mirror)).toBe(true);
      expect(
        isAtCalibrationCorner({ x: camera.cx, y: camera.cy }, camera, 'top-left', 2, mirror),
      ).toBe(false);
    },
  );
});

it('fits a previously saved area after sensitivity changes', () => {
  expect(adjustAimArea({ cx: 0.9, cy: 0.1, halfW: 1, halfH: 1 }, 'move', 0, 0)).toEqual({
    cx: 0.5,
    cy: 0.5,
    halfW: 0.5,
    halfH: 0.5,
  });
});
