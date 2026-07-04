// One Euro filter — Casiez, Roussel, Vogel 2012 (https://gery.casiez.net/1euro/)
import type { Vec2 } from '../beatmap/model';

interface OneEuroOpts {
  minCutoff: number;
  beta: number;
  dCutoff?: number;
}

function smoothingFactor(cutoff: number, dt: number): number {
  const tau = 1 / (2 * Math.PI * cutoff);
  return 1 / (1 + tau / dt);
}

export class OneEuroFilter {
  private minCutoff: number;
  private beta: number;
  private dCutoff: number;
  private prev: number | null = null;
  private prevD = 0;
  private prevT = 0;

  constructor(opts: OneEuroOpts) {
    this.minCutoff = opts.minCutoff;
    this.beta = opts.beta;
    this.dCutoff = opts.dCutoff ?? 1;
  }

  filter(value: number, timestampSec: number): number {
    if (this.prev === null) {
      this.prev = value;
      this.prevT = timestampSec;
      return value;
    }
    const dt = Math.max(timestampSec - this.prevT, 1e-6);
    this.prevT = timestampSec;

    const rawD = (value - this.prev) / dt;
    const aD = smoothingFactor(this.dCutoff, dt);
    const d = aD * rawD + (1 - aD) * this.prevD;
    this.prevD = d;

    const cutoff = this.minCutoff + this.beta * Math.abs(d);
    const a = smoothingFactor(cutoff, dt);
    const out = a * value + (1 - a) * this.prev;
    this.prev = out;
    return out;
  }

  reset(): void {
    this.prev = null;
    this.prevD = 0;
    this.prevT = 0;
  }
}

export class OneEuroFilter2D {
  private fx: OneEuroFilter;
  private fy: OneEuroFilter;

  constructor(opts: { minCutoff: number; beta: number }) {
    this.fx = new OneEuroFilter(opts);
    this.fy = new OneEuroFilter(opts);
  }

  filter(p: Vec2, timestampSec: number): Vec2 {
    return { x: this.fx.filter(p.x, timestampSec), y: this.fy.filter(p.y, timestampSec) };
  }

  reset(): void {
    this.fx.reset();
    this.fy.reset();
  }
}
