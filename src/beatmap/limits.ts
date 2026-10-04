import type { Beatmap } from 'osu-classes';
import { SlidableObject, SpinnableObject } from 'osu-parsers';

/**
 * Upper bounds for untrusted .osu files before ruleset conversion. A tiny file can declare
 * millions of slider spans or ticks, and conversion allocates an object for each one.
 */
export const MAP_LIMITS = {
  hitObjects: 20_000,
  sliderSpans: 1_000,
  /** osu!px */
  sliderLength: 20_000,
  /** slider ticks + repeats + spinner spins across the whole map */
  nestedObjects: 200_000,
  /** ms */
  spinnerDuration: 10 * 60_000,
} as const;

/** Ranges the osu! editor allows (lazer clamps SV and tick rate to these when parsing). */
const DIFFICULTY_RANGES = {
  CircleSize: [0, 10],
  ApproachRate: [0, 10],
  OverallDifficulty: [0, 10],
  HPDrainRate: [0, 10],
  SliderMultiplier: [0.4, 3.6],
  SliderTickRate: [0.5, 8],
} as const;

/** osu!stable spinner rotation cap, used as a conservative spins-per-second bound. */
const MAX_SPINS_PER_SECOND = 8;
const SLIDER_TYPE = 2;

export class MapLimitError extends Error {
  constructor(reason: string) {
    super(`Map rejected: ${reason}`);
    this.name = 'MapLimitError';
  }
}

/**
 * Cheap pre-scan of the raw text, run before decoding: the decoder itself allocates
 * per slider node, so slide counts must be bounded before it sees them.
 */
export function assertOsuTextWithinLimits(osuText: string): void {
  const start = osuText.indexOf('[HitObjects]');
  if (start === -1) return;
  let count = 0;
  for (const raw of osuText.slice(start + '[HitObjects]'.length).split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('//')) continue;
    if (line.startsWith('[')) break;
    if (++count > MAP_LIMITS.hitObjects) {
      throw new MapLimitError(`more than ${MAP_LIMITS.hitObjects} hit objects`);
    }
    const fields = line.split(',');
    if (!(Number.parseInt(fields[3], 10) & SLIDER_TYPE)) continue;
    const slides = Number.parseInt(fields[6], 10);
    if (slides > MAP_LIMITS.sliderSpans) {
      throw new MapLimitError(`a slider repeats more than ${MAP_LIMITS.sliderSpans} times`);
    }
  }
}

function inRange(value: number, [min, max]: readonly [number, number]): boolean {
  return Number.isFinite(value) && value >= min && value <= max;
}

/** Validates a decoded (not yet ruleset-converted) beatmap; throws MapLimitError. */
export function assertBeatmapWithinLimits(beatmap: Beatmap): void {
  const d = beatmap.difficulty;
  const values: Record<keyof typeof DIFFICULTY_RANGES, number> = {
    CircleSize: d.circleSize,
    ApproachRate: d.approachRate,
    OverallDifficulty: d.overallDifficulty,
    HPDrainRate: d.drainRate,
    SliderMultiplier: d.sliderMultiplier,
    SliderTickRate: d.sliderTickRate,
  };
  for (const key of Object.keys(DIFFICULTY_RANGES) as (keyof typeof DIFFICULTY_RANGES)[]) {
    const range = DIFFICULTY_RANGES[key];
    if (!inRange(values[key], range)) {
      throw new MapLimitError(`${key} must be between ${range[0]} and ${range[1]}`);
    }
  }

  if (beatmap.hitObjects.length > MAP_LIMITS.hitObjects) {
    throw new MapLimitError(`more than ${MAP_LIMITS.hitObjects} hit objects`);
  }

  let nested = 0;
  for (const obj of beatmap.hitObjects) {
    if (obj instanceof SlidableObject) {
      if (obj.spans > MAP_LIMITS.sliderSpans) {
        throw new MapLimitError(`a slider repeats more than ${MAP_LIMITS.sliderSpans} times`);
      }
      const length = obj.path.distance;
      if (!Number.isFinite(length) || length > MAP_LIMITS.sliderLength) {
        throw new MapLimitError(`a slider is longer than ${MAP_LIMITS.sliderLength}px`);
      }
      // Smallest tick spacing any converter variant can produce (SV ≥ 0.1 after clamping).
      const sv = beatmap.controlPoints.difficultyPointAt(obj.startTime).sliderVelocity;
      const tickDistance = (100 * d.sliderMultiplier * Math.min(sv, 1)) / d.sliderTickRate;
      nested += obj.spans * (Math.ceil(length / tickDistance) + 1);
    } else if (obj instanceof SpinnableObject) {
      const duration = obj.endTime - obj.startTime;
      if (!Number.isFinite(duration) || duration > MAP_LIMITS.spinnerDuration) {
        throw new MapLimitError('a spinner is too long');
      }
      nested += Math.ceil((Math.max(duration, 0) / 1000) * MAX_SPINS_PER_SECOND) + 1;
    }
    if (nested > MAP_LIMITS.nestedObjects) {
      throw new MapLimitError('too many slider ticks, repeats or spinner spins');
    }
  }
}
