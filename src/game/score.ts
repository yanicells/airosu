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
