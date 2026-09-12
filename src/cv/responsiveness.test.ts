import { expect, it } from 'vitest';
import { OneEuroFilter2D } from './filters';
import { cursorFilterOptions } from './cursorSource';

it.each(['palm', 'index'] as const)(
  'keeps %s sweep lag under 22px while suppressing resting jitter',
  (anchor) => {
    const options = cursorFilterOptions(0.5, anchor);
    const sweep = new OneEuroFilter2D(options);
    let lag = 0;
    for (let i = 0; i <= 60; i++) {
      const x = i * 10;
      const result = sweep.filter({ x, y: 192 }, i / 60);
      if (i > 20) lag = Math.max(lag, x - result.x);
    }
    const resting = new OneEuroFilter2D(options);
    let jitter = 0;
    for (let i = 0; i < 120; i++) {
      const point = resting.filter({ x: 256 + (i % 2 ? 2 : -2), y: 192 }, i / 60);
      if (i > 60) jitter = Math.max(jitter, Math.abs(point.x - 256));
    }
    expect(lag).toBeLessThan(22);
    expect(jitter).toBeLessThan(0.5);
  },
);
