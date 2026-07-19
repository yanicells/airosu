/**
 * airosu pp formula, shared verbatim by the client (live pp) and Convex
 * (authoritative pp on submit + recalc migrations).
 *
 * PP_VERSION identifies the formula that produced a stored pp value. Any
 * change to the math below MUST bump it and run the recalc migration
 * (docs/pp-rework-runbook.md).
 */
export const PP_VERSION = 1;

export interface HitStats {
  count300: number;
  count100: number;
  count50: number;
  countMiss: number;
  maxCombo: number;
}

export interface MapWorth {
  /** lazer pp of an SS full combo — the map's worth */
  ssPp: number;
  starRating: number;
}

export function judgedCount(s: HitStats): number {
  return s.count300 + s.count100 + s.count50 + s.countMiss;
}

export function accuracyOf(s: HitStats): number {
  const judged = judgedCount(s);
  if (judged === 0) return 0;
  return (s.count300 * 300 + s.count100 * 100 + s.count50 * 50) / (300 * judged);
}

export function playPp(worth: MapWorth, s: HitStats): number {
  const judged = judgedCount(s);
  if (judged === 0 || !Number.isFinite(worth.ssPp)) return 0;

  // player's share: gentler than lazer's curve — misses already cost
  // accuracy and break combo, so no separate miss penalty on top
  const accuracy = accuracyOf(s);
  const comboRatio = Math.min(1, s.maxCombo / judged);
  const quality = Math.pow(accuracy, 2.5) * (0.35 + 0.65 * Math.pow(comboRatio, 0.6));

  // hand-tracking handicap: ~×10 at 1★ easing to ~×2 past 5★
  const handicap = 2 + 30 * Math.exp(-worth.starRating);

  return worth.ssPp * quality * handicap;
}
