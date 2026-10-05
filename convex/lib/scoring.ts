import {
  PP_VERSION,
  accuracyOf,
  airosuMaxCombo,
  judgedCount,
  playPp,
  type HitStats,
  type MapDifficulty,
} from '../../src/game/ppFormula';
import { grade, type Grade } from '../../src/game/grade';

/**
 * null when valid, else a human-readable rejection reason. Bounds come from the
 * map's stored difficulty attributes, never the client: a completed play judges
 * every object once, and each miss costs at least one of airosu's combo steps.
 */
export function validateSubmission(difficulty: MapDifficulty, s: HitStats): string | null {
  const counts = [s.count300, s.count100, s.count50, s.countMiss, s.maxCombo];
  if (counts.some((c) => !Number.isInteger(c) || c < 0)) return 'invalid counts';
  const objects = difficulty.hitCircleCount + difficulty.sliderCount + difficulty.spinnerCount;
  if (judgedCount(s) !== objects) return 'judgment counts do not match the map';
  if (s.maxCombo > airosuMaxCombo(difficulty) - s.countMiss) {
    return 'combo exceeds successful judgments';
  }
  return null;
}

export function scoreDerived(
  map: { difficulty?: MapDifficulty },
  s: HitStats,
): { accuracy: number; grade: Grade; pp: number; ppVersion: number } {
  if (!map.difficulty) {
    throw new Error('map difficulty attributes are stale; run mapsNode:refreshAttributes');
  }
  const accuracy = accuracyOf(s);
  return { accuracy, grade: grade(accuracy), pp: playPp(map.difficulty, s), ppVersion: PP_VERSION };
}

/** osu!-style weighting: i-th best play counts 0.95^i; top 100 plays. */
export function weightedTotals(best: { pp: number; accuracy: number }[]): {
  totalPp: number;
  hitAccuracy: number;
} {
  const top = [...best].sort((a, b) => b.pp - a.pp).slice(0, 100);
  let totalPp = 0,
    accSum = 0,
    wSum = 0;
  top.forEach((p, i) => {
    const w = Math.pow(0.95, i);
    totalPp += p.pp * w;
    accSum += p.accuracy * w;
    wSum += w;
  });
  return { totalPp, hitAccuracy: wSum === 0 ? 0 : accSum / wSum };
}
