import { Container, Graphics } from 'pixi.js';
import type { Vec2 } from '../beatmap/model';

const TRAIL_LEN = 15;

/** Cursor dot + fading trail, in playfield coords. */
export class CursorLayer {
  readonly container = new Container();
  private gfx = new Graphics();
  private trail: Vec2[] = [];
  private lost = false;

  constructor() {
    this.container.addChild(this.gfx);
  }

  render(cursor: Vec2 | null): void {
    const g = this.gfx;
    g.clear();

    if (cursor) {
      this.lost = false;
      this.trail.push({ ...cursor });
      if (this.trail.length > TRAIL_LEN) this.trail.shift();
    } else {
      this.lost = true;
    }

    const last = this.trail[this.trail.length - 1];
    if (!last) return;

    for (let i = 0; i < this.trail.length - 1; i++) {
      const p = this.trail[i];
      const a = ((i + 1) / this.trail.length) * 0.4;
      g.circle(p.x, p.y, 6).fill({ color: 0xffdd66, alpha: this.lost ? a * 0.3 : a });
    }
    g.circle(last.x, last.y, 12).fill({ color: 0xffdd66, alpha: this.lost ? 0.35 : 1 });
    g.circle(last.x, last.y, 12).stroke({ width: 2, color: 0xffffff, alpha: this.lost ? 0.3 : 1 });
  }
}
