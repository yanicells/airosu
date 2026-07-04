import type { Vec2 } from '../beatmap/model';
import { PLAYFIELD } from '../beatmap/model';

/** movement box in 0–1 camera space */
export interface CalibrationBox {
  cx: number;
  cy: number;
  halfW: number;
  halfH: number;
}

export function defaultBox(): CalibrationBox {
  return { cx: 0.5, cy: 0.5, halfW: 0.25, halfH: 0.25 };
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** camera-space palm pos -> playfield coords (0..512, 0..384), clamped; sensitivity shrinks the box */
export function mapToPlayfield(
  p: Vec2,
  box: CalibrationBox,
  sensitivity: number,
  mirror: boolean,
): Vec2 {
  const halfW = box.halfW / sensitivity;
  const halfH = box.halfH / sensitivity;
  // normalized -1..1 within the (sensitivity-scaled) box
  let nx = clamp((p.x - box.cx) / halfW, -1, 1);
  const ny = clamp((p.y - box.cy) / halfH, -1, 1);
  if (mirror) nx = -nx;
  return {
    x: ((nx + 1) / 2) * PLAYFIELD.w,
    y: ((ny + 1) / 2) * PLAYFIELD.h,
  };
}

/** bounding box of samples + 10% padding */
export function boxFromSamples(samples: Vec2[]): CalibrationBox {
  if (samples.length === 0) return defaultBox();
  let minX = Infinity,
    maxX = -Infinity,
    minY = Infinity,
    maxY = -Infinity;
  for (const s of samples) {
    minX = Math.min(minX, s.x);
    maxX = Math.max(maxX, s.x);
    minY = Math.min(minY, s.y);
    maxY = Math.max(maxY, s.y);
  }
  const padX = (maxX - minX) * 0.1;
  const padY = (maxY - minY) * 0.1;
  return {
    cx: (minX + maxX) / 2,
    cy: (minY + maxY) / 2,
    halfW: Math.max((maxX - minX) / 2 + padX, 0.01),
    halfH: Math.max((maxY - minY) / 2 + padY, 0.01),
  };
}
