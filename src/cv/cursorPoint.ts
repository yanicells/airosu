import type { Vec2 } from '../beatmap/model';
import { palmCenter } from './palm';

export type CursorAnchor = 'palm' | 'index';

/** Raw camera-space cursor point for the selected anchor (landmark 8 = index fingertip). */
export function cursorPoint(
  landmarks: { x: number; y: number }[],
  anchor: CursorAnchor,
): Vec2 {
  return anchor === 'index' ? { ...landmarks[8] } : palmCenter(landmarks);
}
