import { ScoreInfo, type TimedDifficultyAttributes } from 'osu-classes';
import { BeatmapDecoder } from 'osu-parsers';
import { StandardRuleset, type StandardDifficultyAttributes } from 'osu-standard-stable';
import { judgedCount, playPp, type HitStats } from './ppFormula';

export type { HitStats } from './ppFormula';

const ruleset = new StandardRuleset();
const decoder = new BeatmapDecoder();

/**
 * Performance-point calculator for one difficulty.
 *
 * The map's worth is real osu!lazer pp (osu-standard-stable, the same code
 * that produces the song-select star ratings): the pp an SS full combo would
 * earn. The player's share of it uses an airosu quality curve instead of
 * lazer's — hand tracking can't hit lazer-grade accuracy or combos, so
 * lazer's multiplicative penalties crush every realistic play toward 0.
 *
 * A hand-tracking multiplier that decays with star rating scales the total:
 * with a webcam, low-star maps are far harder relative to a mouse than
 * high-star maps are, so they get the bigger boost.
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
    const judged = judgedCount(stats);
    if (judged === 0) return 0;

    // map worth: lazer pp of an SS full combo over the judged objects
    const perfect = new ScoreInfo();
    perfect.ruleset = ruleset;
    perfect.maxCombo = attributes.maxCombo;
    perfect.count300 = judged;
    const ssPp = ruleset
      .createPerformanceCalculator(attributes, perfect)
      .calculateAttributes().totalPerformance;
    return playPp({ ssPp, starRating: attributes.starRating }, stats);
  }
}
