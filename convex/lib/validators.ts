import { v } from 'convex/values';

/** Validator for the serialized lazer difficulty attributes (MapDifficulty). */
export const mapDifficultyValidator = v.object({
  starRating: v.number(),
  aimDifficulty: v.number(),
  speedDifficulty: v.number(),
  speedNoteCount: v.number(),
  flashlightDifficulty: v.number(),
  sliderFactor: v.number(),
  approachRate: v.number(),
  overallDifficulty: v.number(),
  drainRate: v.number(),
  hitCircleCount: v.number(),
  sliderCount: v.number(),
  spinnerCount: v.number(),
  maxCombo: v.number(),
});
