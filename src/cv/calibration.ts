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

export type AimAreaHandle = 'move' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
export const MIN_CALIBRATION_SAMPLES = 8;

/** Work in preview coordinates so dragging remains intuitive with camera mirroring. */
export function cameraBoxToDisplay(
  box: CalibrationBox,
  sensitivity: number,
  mirror: boolean,
): CalibrationBox {
  return {
    cx: mirror ? 1 - box.cx : box.cx,
    cy: box.cy,
    halfW: box.halfW / sensitivity,
    halfH: box.halfH / sensitivity,
  };
}

export function displayBoxToCamera(
  box: CalibrationBox,
  sensitivity: number,
  mirror: boolean,
): CalibrationBox {
  return {
    cx: mirror ? 1 - box.cx : box.cx,
    cy: box.cy,
    halfW: box.halfW * sensitivity,
    halfH: box.halfH * sensitivity,
  };
}

export function adjustAimArea(
  box: CalibrationBox,
  handle: AimAreaHandle,
  dx: number,
  dy: number,
): CalibrationBox {
  const halfW = clamp(box.halfW, 0.05, 0.5);
  const halfH = clamp(box.halfH, 0.05, 0.5);
  box = { cx: clamp(box.cx, halfW, 1 - halfW), cy: clamp(box.cy, halfH, 1 - halfH), halfW, halfH };
  if (handle === 'move') {
    return {
      ...box,
      cx: clamp(box.cx + dx, box.halfW, 1 - box.halfW),
      cy: clamp(box.cy + dy, box.halfH, 1 - box.halfH),
    };
  }
  let left = box.cx - box.halfW,
    right = box.cx + box.halfW;
  let top = box.cy - box.halfH,
    bottom = box.cy + box.halfH;
  if (handle.endsWith('left')) left = clamp(left + dx, 0, right - 0.1);
  else right = clamp(right + dx, left + 0.1, 1);
  if (handle.startsWith('top')) top = clamp(top + dy, 0, bottom - 0.1);
  else bottom = clamp(bottom + dy, top + 0.1, 1);
  return {
    cx: (left + right) / 2,
    cy: (top + bottom) / 2,
    halfW: (right - left) / 2,
    halfH: (bottom - top) / 2,
  };
}

/** Only count samples near the chosen target, not while moving toward it. */
export function isAtCalibrationCorner(
  point: Vec2,
  box: CalibrationBox,
  corner: 'top-left' | 'bottom-right',
  sensitivity: number,
  mirror: boolean,
): boolean {
  const area = cameraBoxToDisplay(box, sensitivity, mirror);
  const sign = corner === 'top-left' ? -1 : 1;
  const x = mirror ? 1 - point.x : point.x;
  return (
    Math.abs(x - (area.cx + sign * area.halfW)) <= Math.min(0.06, area.halfW * 0.5) &&
    Math.abs(point.y - (area.cy + sign * area.halfH)) <= Math.min(0.08, area.halfH * 0.5)
  );
}
