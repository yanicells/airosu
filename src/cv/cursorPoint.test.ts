import { describe, expect, it } from 'vitest';
import { palmCenter } from './palm';
import { cursorPoint } from './cursorPoint';

const landmarks = Array.from({ length: 21 }, (_, i) => ({ x: i / 100, y: i / 50 }));

describe('cursorPoint', () => {
  it('uses the existing palm center for palm mode', () => {
    expect(cursorPoint(landmarks, 'palm')).toEqual(palmCenter(landmarks));
    expect(cursorPoint(landmarks, 'palm').x).toBeCloseTo(0.088, 10);
    expect(cursorPoint(landmarks, 'palm').y).toBeCloseTo(0.176, 10);
  });
  it('uses MediaPipe landmark 8 for index mode', () => {
    expect(cursorPoint(landmarks, 'index')).toEqual(landmarks[8]);
  });
});
