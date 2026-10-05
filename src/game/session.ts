import type { HitObject, LoadedBeatmap, SliderObj, Vec2 } from '../beatmap/model';
import { circleRadius } from '../beatmap/model';
import type { Settings } from '../ui/appState';
import { hitWindows, inRadius, judgeTiming, sliderJudgment } from './judge';
import type { Judgment } from './judge';
import { ScoreState } from './score';

export interface HitEvent {
  objectIndex: number;
  /** for a slider head: its timing quality, or 0 when missed — not a counted judgement */
  judgment: Judgment;
  at: Vec2;
  /** slider head: feeds combo and hitsounds only; the slider's judgement comes at its end */
  head?: true;
}

export interface SessionState {
  score: ScoreState;
  /** indices visible (time - preempt .. judged) */
  activeObjects: number[];
  finished: boolean;
}

/** extra quiet time before the first object starts fading in */
const LEAD_IN_MARGIN_MS = 500;

/** osu! follow circle is 2.4× the hit circle */
const FOLLOW_SCALE = 2.4;

const pathLengths = new WeakMap<Vec2[], Float64Array>();

/**
 * Slider ball position at timeMs: linear interp along path incl. reverse spans.
 * Pass `out` to write into a reused vector instead of allocating one per call.
 */
export function sliderBallPos(s: SliderObj, timeMs: number, out: Vec2 = { x: 0, y: 0 }): Vec2 {
  if (s.path.length < 2) {
    out.x = s.pos.x;
    out.y = s.pos.y;
    return out;
  }
  const duration = s.endTime - s.time;
  const spans = Math.max(s.spans, 1);
  // zero-length sliders jump straight to their end instead of dividing by zero
  const raw = duration > 0 ? (timeMs - s.time) / duration : timeMs >= s.time ? 1 : 0;
  let progress = Math.min(Math.max(raw, 0), 1) * spans;
  const span = Math.min(Math.floor(progress), spans - 1);
  progress -= span;
  if (span % 2 === 1) progress = 1 - progress; // odd spans travel backwards

  let lengths = pathLengths.get(s.path);
  if (!lengths) {
    lengths = new Float64Array(s.path.length);
    for (let i = 1; i < s.path.length; i++) {
      lengths[i] =
        lengths[i - 1] + Math.hypot(s.path[i].x - s.path[i - 1].x, s.path[i].y - s.path[i - 1].y);
    }
    pathLengths.set(s.path, lengths);
  }
  const target = progress * lengths[lengths.length - 1];
  let low = 1,
    high = lengths.length - 1;
  while (low < high) {
    const mid = (low + high) >>> 1;
    if (lengths[mid] < target) low = mid + 1;
    else high = mid;
  }
  const distance = lengths[low] - lengths[low - 1];
  const t = distance === 0 ? 0 : (target - lengths[low - 1]) / distance;
  const a = s.path[low - 1],
    b = s.path[low];
  out.x = a.x + (b.x - a.x) * t;
  out.y = a.y + (b.y - a.y) * t;
  return out;
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
  /** fully resolved (slider = its one judgement emitted at endTime) */
  private judged: boolean[];
  private sliders = new Map<number, SliderTrack>();
  private scoreState = new ScoreState();
  private w50: number;
  private lastTime = 0;
  private nextHead = 0;
  private firstUnjudged = 0;
  /** reused every frame by the `state` getter */
  private snapshot: SessionState = { score: this.scoreState, activeObjects: [], finished: false };
  private ball: Vec2 = { x: 0, y: 0 };

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

  /** Silence before the song so an early first object still appears at the start of its approach. */
  leadInMs(): number {
    const first = this.map.objects[0];
    return first ? Math.max(0, this.preemptMs() + LEAD_IN_MARGIN_MS - first.time) : 0;
  }

  /** Current snapshot. The same object is updated on every read, so don't hold on to it. */
  get state(): SessionState {
    const preempt = this.preemptMs();
    const active = this.snapshot.activeObjects;
    active.length = 0;
    while (this.judged[this.firstUnjudged]) this.firstUnjudged++;
    for (let i = this.firstUnjudged; i < this.map.objects.length; i++) {
      if (this.map.objects[i].time - preempt > this.lastTime) break;
      if (!this.judged[i]) active.push(i);
    }
    this.snapshot.finished = this.firstUnjudged === this.judged.length;
    return this.snapshot;
  }

  private emit(events: HitEvent[], index: number, judgment: Judgment, at?: Vec2): void {
    this.scoreState.apply(judgment);
    events.push({ objectIndex: index, judgment, at: at ?? objPos(this.map.objects[index]) });
  }

  private earliestUnresolvedHead(): number {
    while (
      this.nextHead < this.judged.length &&
      (this.judged[this.nextHead] || this.sliders.get(this.nextHead)?.headDone)
    )
      this.nextHead++;
    return this.nextHead < this.judged.length ? this.nextHead : -1;
  }

  /** relax is timing-perfect; quality only reduced by distance: outer 30% of radius → 100 */
  private relaxQuality(cursor: Vec2, center: Vec2): Judgment {
    const forgiving = circleRadius(this.map.meta.cs) * this.settings.forgiveness;
    const dist = Math.hypot(cursor.x - center.x, cursor.y - center.y);
    return dist > forgiving * 0.7 ? 100 : 300;
  }

  private resolveHead(events: HitEvent[], i: number, judgment: Judgment): void {
    const track = this.sliders.get(i);
    if (track) {
      track.headDone = true;
      track.headMissed = judgment === 0;
      this.scoreState.applySliderHead(judgment !== 0);
      events.push({ objectIndex: i, judgment, at: objPos(this.map.objects[i]), head: true });
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
        timeMs <= obj.time + this.w50 &&
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
      const obj = this.map.objects[i] as SliderObj;
      if (timeMs < obj.time) break;
      if (timeMs >= obj.time && timeMs <= obj.endTime) {
        track.totalTicks++;
        if (cursor) {
          const ball = sliderBallPos(obj, timeMs, this.ball);
          const dx = cursor.x - ball.x;
          const dy = cursor.y - ball.y;
          if (dx * dx + dy * dy <= followRadius * followRadius) track.inTicks++;
        }
      }
      if (timeMs >= obj.endTime && track.headDone) {
        this.judged[i] = true;
        this.sliders.delete(i);
        const ratio = track.totalTicks === 0 ? 0 : track.inTicks / track.totalTicks;
        const j = sliderJudgment(!track.headMissed, ratio, obj.spans);
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
