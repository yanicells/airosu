import { ScoreInfo } from 'osu-classes';
import { BeatmapDecoder } from 'osu-parsers';
import { StandardRuleset } from 'osu-standard-stable';
import { toMapDifficulty, type MapDifficulty } from '../game/ppFormula';
import { toInternal } from './adapter';
import { assertBeatmapWithinLimits, assertOsuTextWithinLimits } from './limits';

const decoder = new BeatmapDecoder();
const ruleset = new StandardRuleset();

/** Bump when parser/ruleset upgrades can change stored map attributes. */
export const ATTRIBUTES_VERSION = 3;

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
  /** judgements in a completed play: one per object since PP v3 (was +1 per slider) */
  judgmentCount: number;
  ssPp: number;
  /** serialized lazer difficulty attributes; feeds the pp formula server-side */
  difficulty: MapDifficulty;
  attributesVersion: number;
  beatmapId?: number;
  beatmapSetId?: number;
}

/**
 * Authoritative map attributes computed server-side at registration.
 * Throws MapLimitError for maps too large or malformed to convert safely.
 */
export function computeMapAttributes(osuText: string): MapAttributes {
  assertOsuTextWithinLimits(osuText);
  const parsed = decoder.decodeFromString(osuText, { parseStoryboard: false });
  assertBeatmapWithinLimits(parsed);
  const internal = toInternal(parsed, osuText, new ArrayBuffer(0));
  const beatmap = ruleset.applyToBeatmap(parsed);
  const attributes = ruleset.createDifficultyCalculator(beatmap).calculate();
  const judgmentCount = internal.objects.length;

  const perfect = new ScoreInfo();
  perfect.ruleset = ruleset;
  perfect.maxCombo = attributes.maxCombo;
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
    difficulty: toMapDifficulty(attributes),
    attributesVersion: ATTRIBUTES_VERSION,
    beatmapId: parsed.metadata.beatmapId || undefined,
    beatmapSetId: parsed.metadata.beatmapSetId || undefined,
  };
}
