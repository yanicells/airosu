import { BeatmapDecoder } from 'osu-parsers';
import { StandardRuleset } from 'osu-standard-stable';
import { playPp, toMapDifficulty, type MapDifficulty, type HitStats } from './ppFormula';

export type { HitStats } from './ppFormula';

export interface PreparedPp {
  timed: { time: number; attributes: MapDifficulty }[];
  full: MapDifficulty;
}

/** Run in the map worker; the resulting numbers cross the worker boundary. */
export function preparePp(osuText: string): PreparedPp {
  const ruleset = new StandardRuleset();
  const decoder = new BeatmapDecoder();
  const parsed = decoder.decodeFromString(osuText, { parseStoryboard: false });
  const beatmap = ruleset.applyToBeatmap(parsed);
  const calculator = ruleset.createDifficultyCalculator(beatmap);
  const timed = [...calculator.calculateTimed()].map((entry) => ({
    time: entry.time,
    attributes: toMapDifficulty(entry.attributes),
  }));
  return { timed, full: timed.at(-1)?.attributes ?? toMapDifficulty(calculator.calculate()) };
}

/**
 * Performance-point calculator for one difficulty.
 *
 * pp is osu!lazer's own play pp (osu-standard-stable, the same code that
 * produces the song-select star ratings) times the flat airosu multiplier —
 * see ppFormula.ts. Live pp uses the timed difficulty attributes of the map
 * up to the current time.
 *
 * pp is always computed nomod: relax input mode and the forgiveness
 * multiplier have no pp equivalent, so values are approximate by design.
 */
export class PpCounter {
  private timed: PreparedPp['timed'];
  private full: MapDifficulty;

  constructor(prepared: PreparedPp) {
    this.timed = prepared.timed;
    this.full = prepared.full;
  }

  /** pp of the full map for the given play stats. */
  final(stats: HitStats): number {
    return playPp(this.full, stats);
  }

  /** Live pp: difficulty of the map up to timeMs, with the stats so far. */
  currentAt(timeMs: number, stats: HitStats): number {
    let low = 0,
      high = this.timed.length;
    while (low < high) {
      const mid = (low + high) >>> 1;
      if (this.timed[mid].time <= timeMs) low = mid + 1;
      else high = mid;
    }
    return low ? playPp(this.timed[low - 1].attributes, stats) : 0;
  }
}
