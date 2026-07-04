import type { Vec2 } from '../beatmap/model';
import { circleRadius } from '../beatmap/model';

export type Judgment = 300 | 100 | 50 | 0;

/** osu! OD windows (ms), scaled by forgiveness */
export function hitWindows(
  od: number,
  forgiveness: number,
): { w300: number; w100: number; w50: number } {
  return {
    w300: (80 - 6 * od) * forgiveness,
    w100: (140 - 8 * od) * forgiveness,
    w50: (200 - 10 * od) * forgiveness,
  };
}

/** 'ignore' when |delta| > w50 * 1.5 (too early/late to consume the object) */
export function judgeTiming(
  deltaMs: number,
  od: number,
  forgiveness: number,
): Judgment | 'ignore' {
  const { w300, w100, w50 } = hitWindows(od, forgiveness);
  const d = Math.abs(deltaMs);
  if (d <= w300) return 300;
  if (d <= w100) return 100;
  if (d <= w50) return 50;
  if (d <= w50 * 1.5) return 0;
  return 'ignore';
}

export function inRadius(cursor: Vec2, center: Vec2, cs: number, forgiveness: number): boolean {
  const r = circleRadius(cs) * forgiveness;
  const dx = cursor.x - center.x;
  const dy = cursor.y - center.y;
  return dx * dx + dy * dy <= r * r;
}
