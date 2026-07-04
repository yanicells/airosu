import type { HitObject, LoadedBeatmap, SliderObj, Vec2 } from '../beatmap/model';
import { circleRadius } from '../beatmap/model';
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

/** osu! follow circle is 2.4× the hit circle */
const FOLLOW_SCALE = 2.4;

/** slider ball position at timeMs: linear interp along path incl. repeats */
export function sliderBallPos(s: SliderObj, timeMs: number): Vec2 {
  if (s.path.length < 2) return s.pos;
  const duration = s.endTime - s.time;
  const spans = Math.max(s.repeats, 1);
  let progress = Math.min(Math.max((timeMs - s.time) / duration, 0), 1) * spans;
  const span = Math.min(Math.floor(progress), spans - 1);
  progress -= span;
  if (span % 2 === 1) progress = 1 - progress; // odd spans travel backwards

  let total = 0;
  const segLens: number[] = [];
  for (let i = 1; i < s.path.length; i++) {
    const d = Math.hypot(s.path[i].x - s.path[i - 1].x, s.path[i].y - s.path[i - 1].y);
    segLens.push(d);
    total += d;
  }
  let target = progress * total;
  for (let i = 0; i < segLens.length; i++) {
    if (target <= segLens[i] || i === segLens.length - 1) {
      const t = segLens[i] === 0 ? 0 : Math.min(target / segLens[i], 1);
      const a = s.path[i];
      const b = s.path[i + 1];
      return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
    }
    target -= segLens[i];
  }
  return s.path[s.path.length - 1];
}

function objPos(obj: HitObject): Vec2 {
  return obj.kind === 'spinner' ? { x: 256, y: 192 } : obj.pos;
}

interface SliderTrack {
  headDone: boolean;
  headMissed: boolean;
  inTicks: number;
  totalTicks: number;
}

export class GameSession {
  private map: LoadedBeatmap;
  private settings: Settings;
  /** fully resolved (slider = final judgment emitted) */
  private judged: boolean[];
  private sliders = new Map<number, SliderTrack>();
  private scoreState = new ScoreState();
  private w50: number;
  private lastTime = 0;

  constructor(map: LoadedBeatmap, settings: Settings) {
    this.map = map;
    this.settings = settings;
    this.judged = Array.from({ length: map.objects.length }, () => false);
    this.w50 = hitWindows(map.meta.od, settings.forgiveness).w50;
    for (let i = 0; i < map.objects.length; i++) {
      if (map.objects[i].kind === 'slider')
        this.sliders.set(i, { headDone: false, headMissed: false, inTicks: 0, totalTicks: 0 });
    }
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

  private emit(events: HitEvent[], index: number, judgment: Judgment, at?: Vec2): void {
    this.scoreState.apply(judgment);
    events.push({ objectIndex: index, judgment, at: at ?? objPos(this.map.objects[index]) });
  }

  private headResolved(i: number): boolean {
    const track = this.sliders.get(i);
    return track ? track.headDone : this.judged[i];
  }

  private earliestUnresolvedHead(): number {
    for (let i = 0; i < this.judged.length; i++)
      if (!this.judged[i] && !this.headResolved(i)) return i;
    return -1;
  }

  /** relax is timing-perfect; quality only reduced by distance: outer 30% of radius → 100 */
  private relaxQuality(cursor: Vec2, center: Vec2): Judgment {
    const forgiving = circleRadius(this.map.meta.cs) * this.settings.forgiveness;
    const dist = Math.hypot(cursor.x - center.x, cursor.y - center.y);
    return dist > forgiving * 0.7 ? 100 : 300;
  }

  private resolveHead(events: HitEvent[], i: number, judgment: Judgment): void {
    const obj = this.map.objects[i];
    const track = this.sliders.get(i);
    if (track) {
      track.headDone = true;
      track.headMissed = judgment === 0;
      this.emit(events, i, judgment, obj.kind === 'slider' ? obj.pos : undefined);
    } else {
      this.judged[i] = true;
      this.emit(events, i, judgment);
    }
  }

  /** advance clock; relax mode auto-judges due objects; returns events since last tick */
  tick(timeMs: number, cursor: Vec2 | null): HitEvent[] {
    this.lastTime = timeMs;
    const events: HitEvent[] = [];
    const { cs } = this.map.meta;
    const relax = this.settings.inputMode === 'relax';

    // heads / circles / spinners, judged in order
    for (;;) {
      const i = this.earliestUnresolvedHead();
      if (i === -1) break;
      const obj = this.map.objects[i];

      if (obj.kind === 'spinner') {
        // spinners auto-complete with full score in V1
        if (timeMs >= obj.endTime) {
          this.judged[i] = true;
          this.emit(events, i, 300);
          continue;
        }
        break;
      }

      if (
        relax &&
        timeMs >= obj.time &&
        cursor &&
        inRadius(cursor, obj.pos, cs, this.settings.forgiveness)
      ) {
        this.resolveHead(events, i, this.relaxQuality(cursor, obj.pos));
        continue;
      }

      if (timeMs > obj.time + this.w50) {
        this.resolveHead(events, i, 0);
        continue;
      }
      break;
    }

    // slider follow tracking + finalization
    const followRadius = circleRadius(cs) * this.settings.forgiveness * FOLLOW_SCALE;
    for (const [i, track] of this.sliders) {
      if (this.judged[i]) continue;
      const obj = this.map.objects[i] as SliderObj;
      if (timeMs >= obj.time && timeMs <= obj.endTime) {
        track.totalTicks++;
        if (cursor) {
          const ball = sliderBallPos(obj, timeMs);
          const dx = cursor.x - ball.x;
          const dy = cursor.y - ball.y;
          if (dx * dx + dy * dy <= followRadius * followRadius) track.inTicks++;
        }
      }
      if (timeMs >= obj.endTime && track.headDone) {
        this.judged[i] = true;
        const ratio = track.totalTicks === 0 ? 0 : track.inTicks / track.totalTicks;
        let j: Judgment = ratio >= 0.9 ? 300 : ratio >= 0.5 ? 100 : ratio > 0 ? 50 : 0;
        if (track.headMissed && j === 300) j = 100; // missed head caps the slider at 100
        this.emit(events, i, j, sliderBallPos(obj, obj.endTime));
      }
    }

    return events;
  }

  /** manual mode key press; null = stray press, no penalty */
  press(timeMs: number, cursor: Vec2 | null): HitEvent | null {
    if (this.settings.inputMode !== 'manual') return null;
    const i = this.earliestUnresolvedHead();
    if (i === -1) return null;
    const obj = this.map.objects[i];
    if (obj.kind === 'spinner') return null;
    if (!cursor || !inRadius(cursor, obj.pos, this.map.meta.cs, this.settings.forgiveness))
      return null;
    const j = judgeTiming(timeMs - obj.time, this.map.meta.od, this.settings.forgiveness);
    if (j === 'ignore') return null;
    const events: HitEvent[] = [];
    this.resolveHead(events, i, j);
    return events[0];
  }
}
