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

/** Follow ratio treated as "every follow part hit": per-frame webcam sampling never reads a clean 100%. */
const FULL_FOLLOW = 0.9;

/**
 * One judgement for a whole slider, after osu!stable: the slider is split into
 * parts and judged by how many were hit — all → 300, at least half → 100,
 * any → 50, none → miss. airosu doesn't place ticks, so the parts are the
 * head (hit or not) plus `spans + 1` follow parts (every repeat and the tail,
 * plus one tick's worth for the body), credited by the sampled follow ratio
 * with FULL_FOLLOW counting as all of them. A missed head therefore always caps
 * the slider at 100, and a dropped follow after a hit head is worth a 50.
 */
export function sliderJudgment(headHit: boolean, followRatio: number, spans: number): Judgment {
  const followParts = Math.max(spans, 1) + 1;
  const followed = Math.min(followRatio / FULL_FOLLOW, 1);
  if (headHit && followed === 1) return 300;
  const hit = (headHit ? 1 : 0) + followed * followParts;
  if (hit >= (1 + followParts) / 2) return 100;
  return hit > 0 ? 50 : 0;
}
