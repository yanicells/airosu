import { ScoreInfo } from 'osu-classes';
import { BeatmapDecoder } from 'osu-parsers';
import { StandardRuleset } from 'osu-standard-stable';
import { toInternal } from './adapter';

const decoder = new BeatmapDecoder();
const ruleset = new StandardRuleset();

/** Bump when parser/ruleset upgrades can change stored map attributes. */
export const ATTRIBUTES_VERSION = 1;

export interface MapAttributes {
  title: string;
  artist: string;
  version: string;
  creator: string;
  bpm: number;
  lengthMs: number;
  cs: number;
  ar: number;
  od: number;
  hp: number;
  starRating: number;
  maxCombo: number;
  objectCount: number;
  judgmentCount: number;
  ssPp: number;
  attributesVersion: number;
  beatmapId?: number;
  beatmapSetId?: number;
}

/** Authoritative map attributes computed server-side at registration. */
export function computeMapAttributes(osuText: string): MapAttributes {
  const parsed = decoder.decodeFromString(osuText, { parseStoryboard: false });
  const internal = toInternal(parsed, osuText, new ArrayBuffer(0));
  const beatmap = ruleset.applyToBeatmap(parsed);
  const attributes = ruleset.createDifficultyCalculator(beatmap).calculate();
  const judgmentCount = internal.objects.reduce(
    (count, object) => count + (object.kind === 'slider' ? 2 : 1),
    0,
  );

  const perfect = new ScoreInfo();
  perfect.ruleset = ruleset;
  perfect.maxCombo = attributes.maxCombo;
  // Match PpCounter.final(): airosu gives sliders a head + final judgment.
  perfect.count300 = judgmentCount;
  const ssPp = ruleset
    .createPerformanceCalculator(attributes, perfect)
    .calculateAttributes().totalPerformance;

  const m = internal.meta;
  return {
    title: m.title,
    artist: m.artist,
    version: m.version,
    creator: m.creator,
    bpm: m.bpm,
    lengthMs: m.lengthMs,
    cs: m.cs,
    ar: m.ar,
    od: m.od,
    hp: m.hp,
    starRating: attributes.starRating,
    maxCombo: attributes.maxCombo,
    objectCount: internal.objects.length,
    judgmentCount,
    ssPp: Number.isFinite(ssPp) ? ssPp : 0,
    attributesVersion: ATTRIBUTES_VERSION,
    beatmapId: parsed.metadata.beatmapId || undefined,
    beatmapSetId: parsed.metadata.beatmapSetId || undefined,
  };
}
