import type { Judgment } from './judge';

export class ScoreState {
  private _score = 0;
  private _combo = 0;
  private _maxCombo = 0;
  private _counts: Record<Judgment, number> = { 300: 0, 100: 0, 50: 0, 0: 0 };

  get score(): number {
    return this._score;
  }
  get combo(): number {
    return this._combo;
  }
  get maxCombo(): number {
    return this._maxCombo;
  }
  get counts(): { 300: number; 100: number; 50: number; 0: number } {
    return { ...this._counts };
  }

  /** 0..1 = Σ(judgment) / (300 * total); 1 before any judgment */
  get accuracy(): number {
    const total = this._counts[300] + this._counts[100] + this._counts[50] + this._counts[0];
    if (total === 0) return 1;
    const sum = this._counts[300] * 300 + this._counts[100] * 100 + this._counts[50] * 50;
    return sum / (300 * total);
  }

  apply(j: Judgment): void {
    this._counts[j]++;
    if (j === 0) {
      this._combo = 0;
      return;
    }
    this._score = Math.round(this._score + j * (1 + this._combo / 25));
    this._combo++;
    this._maxCombo = Math.max(this._maxCombo, this._combo);
  }
}

/**
 * Highest raw score any play with these judgement counts and max combo could reach: hits
 * fill combo runs no longer than maxCombo, with the best judgements on the highest combos.
 * Each hit is worth j × (1 + combo/25), always an integer for 300/100/50.
 */
export function maxScore(s: {
  count300: number;
  count100: number;
  count50: number;
  maxCombo: number;
}): number {
  const hits = s.count300 + s.count100 + s.count50;
  if (hits === 0 || s.maxCombo <= 0) return 0;
  const fullRuns = Math.floor(hits / s.maxCombo);
  const remainder = hits % s.maxCombo;
  const left = { 300: s.count300, 100: s.count100, 50: s.count50 };
  let total = 0;
  for (let combo = s.maxCombo - 1; combo >= 0; combo--) {
    // hits that land at this combo position across all runs
    let slots = fullRuns + (combo < remainder ? 1 : 0);
    for (const j of [300, 100, 50] as const) {
      const used = Math.min(slots, left[j]);
      left[j] -= used;
      slots -= used;
      total += used * j * (1 + combo / 25);
    }
  }
  return Math.round(total);
}
