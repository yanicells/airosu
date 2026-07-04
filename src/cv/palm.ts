import type { Vec2 } from '../beatmap/model';

/** wrist + finger base landmark indices (MediaPipe hand model) */
const PALM_INDICES = [0, 5, 9, 13, 17] as const;

/** landmarks: MediaPipe normalized (0–1, image space), 21 entries */
export function palmCenter(landmarks: { x: number; y: number }[]): Vec2 {
  let x = 0;
  let y = 0;
  for (const i of PALM_INDICES) {
    x += landmarks[i].x;
    y += landmarks[i].y;
  }
  return { x: x / PALM_INDICES.length, y: y / PALM_INDICES.length };
}
