import { Container, Graphics, Sprite } from 'pixi.js';
import type { Vec2 } from '../beatmap/model';
import type { Skin } from '../skin/types';
import { makeSprite, screenSpriteScale } from './skinUtils';

const TRAIL_LEN = 15;

/** Cursor dot + fading trail, in playfield coords. Skinned when possible. */
export class CursorLayer {
  readonly container = new Container();
  private gfx = new Graphics();
  private cursorSprite: Sprite | null = null;
  private trailSprites: Sprite[] = [];
  private trail: Vec2[] = [];
  private lost = false;

  constructor(skin: Skin | null) {
    if (skin?.cursorTrail) {
      for (let i = 0; i < TRAIL_LEN; i++) {
        const s = makeSprite(skin.cursorTrail);
        s.scale.set(screenSpriteScale(skin.cursorTrail));
        s.visible = false;
        this.container.addChild(s);
        this.trailSprites.push(s);
      }
    }
    this.container.addChild(this.gfx);
    if (skin?.cursor) {
      this.cursorSprite = makeSprite(skin.cursor);
      this.cursorSprite.scale.set(screenSpriteScale(skin.cursor));
      this.cursorSprite.visible = false;
      this.container.addChild(this.cursorSprite);
    }
  }

  render(cursor: Vec2 | null): void {
    if (cursor) {
      this.lost = false;
      this.trail.push({ ...cursor });
      if (this.trail.length > TRAIL_LEN) this.trail.shift();
    } else {
      this.lost = true;
    }
    const last = this.trail[this.trail.length - 1];

    if (this.cursorSprite) {
      this.renderSkinned(last);
      return;
    }
    this.renderProcedural(last);
  }

  private renderSkinned(last: Vec2 | undefined): void {
    const sprite = this.cursorSprite!;
    sprite.visible = !!last;
    if (last) {
      sprite.position.set(last.x, last.y);
      sprite.alpha = this.lost ? 0.35 : 1;
    }
    for (let i = 0; i < this.trailSprites.length; i++) {
      const s = this.trailSprites[i];
      const p = this.trail[i];
      const isTip = i === this.trail.length - 1;
      s.visible = !!p && !isTip;
      if (p && !isTip) {
        s.position.set(p.x, p.y);
        const a = ((i + 1) / this.trail.length) * 0.5;
        s.alpha = this.lost ? a * 0.3 : a;
      }
    }
  }

  private renderProcedural(last: Vec2 | undefined): void {
    const g = this.gfx;
    g.clear();
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
