import { type TimedDifficultyAttributes } from 'osu-classes';
import { BeatmapDecoder } from 'osu-parsers';
import { StandardRuleset, type StandardDifficultyAttributes } from 'osu-standard-stable';
import { playPp, type HitStats } from './ppFormula';

export type { HitStats } from './ppFormula';

const ruleset = new StandardRuleset();
const decoder = new BeatmapDecoder();

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
  private timed: TimedDifficultyAttributes<StandardDifficultyAttributes>[];
  private full: StandardDifficultyAttributes;

  constructor(osuText: string) {
    const parsed = decoder.decodeFromString(osuText, { parseStoryboard: false });
    const beatmap = ruleset.applyToBeatmap(parsed);
    const calculator = ruleset.createDifficultyCalculator(beatmap);
    this.timed = [...calculator.calculateTimed()];
    // last timed entry covers the whole map; fall back for empty maps
    this.full = this.timed.length
      ? this.timed[this.timed.length - 1].attributes
      : calculator.calculate();
  }

  /** pp of the full map for the given play stats. */
  final(stats: HitStats): number {
    return playPp(this.full, stats);
  }

  /** Live pp: difficulty of the map up to timeMs, with the stats so far. */
  currentAt(timeMs: number, stats: HitStats): number {
    let attributes: StandardDifficultyAttributes | null = null;
    for (const t of this.timed) {
      if (t.time > timeMs) break;
      attributes = t.attributes;
    }
    return attributes ? playPp(attributes, stats) : 0;
  }
}
