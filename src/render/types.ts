import type { HitObject, Vec2 } from '../beatmap/model';
import type { HitEvent } from '../game/session';

export interface RenderView {
  timeMs: number;
  objects: { obj: HitObject; index: number; judged: boolean }[];
  cursor: Vec2 | null;
  score: number;
  combo: number;
  accuracy: number;
  /** live performance points so far */
  pp: number;
  preemptMs: number;
  cs: number;
  recentHits: HitEvent[];
}
