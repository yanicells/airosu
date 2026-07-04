import type { HitObject, LoadedBeatmap, Vec2 } from '../beatmap/model';
import type { Settings } from '../ui/appState';
import { hitWindows, inRadius, judgeTiming } from './judge';
import type { Judgment } from './judge';
import { ScoreState } from './score';

export interface HitEvent {
  objectIndex: number;
  judgment: Judgment;
  at: Vec2;
}

export interface SessionState {
  score: ScoreState;
  /** indices visible (time - preempt .. judged) */
  activeObjects: number[];
  finished: boolean;
}

function objPos(obj: HitObject): Vec2 {
  return obj.kind === 'spinner' ? { x: 256, y: 192 } : obj.pos;
}

export class GameSession {
  private map: LoadedBeatmap;
  private settings: Settings;
  private judged: boolean[];
  private scoreState = new ScoreState();
  private w50: number;

  constructor(map: LoadedBeatmap, settings: Settings) {
    this.map = map;
    this.settings = settings;
    this.judged = new Array(map.objects.length).fill(false);
    this.w50 = hitWindows(map.meta.od, settings.forgiveness).w50;
  }

  /** AR preempt ms: AR<5 → 1200+600*(5-AR)/5 ; AR≥5 → 1200-750*(AR-5)/5 */
  preemptMs(): number {
    const ar = this.map.meta.ar;
    return ar < 5 ? 1200 + (600 * (5 - ar)) / 5 : 1200 - (750 * (ar - 5)) / 5;
  }

  get state(): SessionState {
    const preempt = this.preemptMs();
    const active: number[] = [];
    for (let i = 0; i < this.map.objects.length; i++) {
      if (!this.judged[i] && this.map.objects[i].time - preempt <= this.lastTime) active.push(i);
    }
    return {
      score: this.scoreState,
      activeObjects: active,
      finished: this.judged.every(Boolean),
    };
  }

  private lastTime = 0;

  private emit(events: HitEvent[], index: number, judgment: Judgment): void {
    this.judged[index] = true;
    this.scoreState.apply(judgment);
    events.push({ objectIndex: index, judgment, at: objPos(this.map.objects[index]) });
  }

  private earliestUnjudged(): number {
    for (let i = 0; i < this.judged.length; i++) if (!this.judged[i]) return i;
    return -1;
  }

  /** advance clock; relax mode auto-judges due objects; returns events since last tick */
  tick(timeMs: number, cursor: Vec2 | null): HitEvent[] {
    this.lastTime = timeMs;
    const events: HitEvent[] = [];
    const { cs } = this.map.meta;
    const relax = this.settings.inputMode === 'relax';

    for (;;) {
      const i = this.earliestUnjudged();
      if (i === -1) break;
      const obj = this.map.objects[i];

      if (obj.kind === 'spinner') {
        // spinners auto-complete with full score in V1
        if (timeMs >= obj.endTime) {
          this.emit(events, i, 300);
          continue;
        }
        break;
      }

      if (relax && timeMs >= obj.time && cursor && inRadius(cursor, obj.pos, cs, this.settings.forgiveness)) {
        this.emit(events, i, this.relaxQuality(cursor, obj.pos));
        continue;
      }

      if (timeMs > obj.time + this.w50) {
        this.emit(events, i, 0);
        continue;
      }
      break;
    }
    return events;
  }

  /** relax is timing-perfect; quality only reduced by distance: outer 30% of radius → 100 */
  private relaxQuality(cursor: Vec2, center: Vec2): Judgment {
    const r = 54.4 - 4.48 * this.map.meta.cs;
    const forgiving = r * this.settings.forgiveness;
    const dist = Math.hypot(cursor.x - center.x, cursor.y - center.y);
    return dist > forgiving * 0.7 ? 100 : 300;
  }

  /** manual mode key press; null = stray press, no penalty */
  press(timeMs: number, cursor: Vec2 | null): HitEvent | null {
    if (this.settings.inputMode !== 'manual') return null;
    const i = this.earliestUnjudged();
    if (i === -1) return null;
    const obj = this.map.objects[i];
    if (obj.kind === 'spinner') return null;
    if (!cursor || !inRadius(cursor, obj.pos, this.map.meta.cs, this.settings.forgiveness))
      return null;
    const j = judgeTiming(timeMs - obj.time, this.map.meta.od, this.settings.forgiveness);
    if (j === 'ignore') return null;
    const events: HitEvent[] = [];
    this.emit(events, i, j);
    return events[0];
  }
}
