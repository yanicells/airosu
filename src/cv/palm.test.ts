import { describe, it, expect } from 'vitest';
import { palmCenter } from './palm';

describe('palmCenter', () => {
  it('averages wrist + finger base landmarks', () => {
    const landmarks = Array.from({ length: 21 }, () => ({ x: 9, y: 9 }));
    landmarks[0] = { x: 0.1, y: 0.2 };
    landmarks[5] = { x: 0.2, y: 0.2 };
    landmarks[9] = { x: 0.3, y: 0.2 };
    landmarks[13] = { x: 0.4, y: 0.2 };
    landmarks[17] = { x: 0.5, y: 0.2 };
    const c = palmCenter(landmarks);
    expect(c.x).toBeCloseTo(0.3);
    expect(c.y).toBeCloseTo(0.2);
  });
});
