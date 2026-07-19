import {
  PP_VERSION,
  accuracyOf,
  judgedCount,
  playPp,
  type HitStats,
} from '../../src/game/ppFormula';
import { grade, type Grade } from '../../src/game/grade';

/** null when valid, else a human-readable rejection reason */
export function validateSubmission(map: { judgmentCount: number }, s: HitStats): string | null {
  const counts = [s.count300, s.count100, s.count50, s.countMiss, s.maxCombo];
  if (counts.some((c) => !Number.isInteger(c) || c < 0)) return 'invalid counts';
  if (judgedCount(s) !== map.judgmentCount) return 'judgment counts do not match the map';
  if (s.maxCombo > map.judgmentCount) return 'combo exceeds map maximum';
  return null;
}

export function scoreDerived(
  map: { ssPp: number; starRating: number },
  s: HitStats,
): { accuracy: number; grade: Grade; pp: number; ppVersion: number } {
  const accuracy = accuracyOf(s);
  return { accuracy, grade: grade(accuracy), pp: playPp(map, s), ppVersion: PP_VERSION };
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
