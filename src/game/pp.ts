import { ScoreInfo, type TimedDifficultyAttributes } from 'osu-classes';
import { BeatmapDecoder } from 'osu-parsers';
import { StandardRuleset, type StandardDifficultyAttributes } from 'osu-standard-stable';

export interface HitStats {
  count300: number;
  count100: number;
  count50: number;
  countMiss: number;
  maxCombo: number;
}

const ruleset = new StandardRuleset();
const decoder = new BeatmapDecoder();

/**
 * Performance-point calculator for one difficulty, backed by the same
 * osu-standard-stable code that produces the song-select star ratings.
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
    return this.pp(this.full, stats);
  }

  /** Live pp: difficulty of the map up to timeMs, with the stats so far. */
  currentAt(timeMs: number, stats: HitStats): number {
    let attributes: StandardDifficultyAttributes | null = null;
    for (const t of this.timed) {
      if (t.time > timeMs) break;
      attributes = t.attributes;
    }
    return attributes ? this.pp(attributes, stats) : 0;
  }

  private pp(attributes: StandardDifficultyAttributes, stats: HitStats): number {
    // game combo counts hit objects; the calculator's maxCombo also counts
    // slider ticks, so map the player's per-object combo ratio onto it —
    // otherwise even a genuine FC gets a heavy combo penalty
    const judged = stats.count300 + stats.count100 + stats.count50 + stats.countMiss;
    const comboRatio = judged > 0 ? Math.min(1, stats.maxCombo / judged) : 0;
    const score = new ScoreInfo();
    score.ruleset = ruleset;
    score.maxCombo = Math.round(attributes.maxCombo * comboRatio);
    score.count300 = stats.count300;
    score.count100 = stats.count100;
    score.count50 = stats.count50;
    score.countMiss = stats.countMiss;
    const result = ruleset
      .createPerformanceCalculator(attributes, score)
      .calculateAttributes().totalPerformance;
    return Number.isFinite(result) ? result : 0;
  }
}
