import { BeatmapDecoder } from 'osu-parsers';
import { StandardRuleset } from 'osu-standard-stable';

const ruleset = new StandardRuleset();
const decoder = new BeatmapDecoder();

/** Star rating (no mods) for one .osu file's contents. */
export function starRating(osuText: string): number {
  const decoded = decoder.decodeFromString(osuText, { parseStoryboard: false });
  const beatmap = ruleset.applyToBeatmap(decoded);
  return ruleset.createDifficultyCalculator(beatmap).calculate().starRating;
}
