import { Container, Graphics, Sprite, Text } from 'pixi.js';
import type { Vec2 } from '../beatmap/model';
import type { HitResultKey, Skin } from '../skin/types';
import { makeSprite, screenSpriteScale } from './skinUtils';
import type { RenderView } from './types';

const BURST_MS = 500;

interface Burst {
  at: Vec2;
  judgment: HitResultKey;
  startMs: number;
  node: Sprite | Text | null;
}

/** Hit result pop-ups: skin sprites when available, text + ring fallback. */
export class BurstLayer {
  readonly container = new Container();
  private ringGfx = new Graphics();
  private bursts: Burst[] = [];

  private skin: Skin | null;

  constructor(skin: Skin | null) {
    this.skin = skin;
    this.container.addChild(this.ringGfx);
  }

  add(view: RenderView): void {
    for (const hit of view.recentHits) {
      const skinTex = this.skin?.hitResults[hit.judgment];
      let node: Sprite | Text | null = null;
      if (skinTex) {
        node = makeSprite(skinTex);
        node.scale.set(screenSpriteScale(skinTex));
      } else {
        node = new Text({
          text: hit.judgment === 0 ? 'miss' : String(hit.judgment),
          style: {
            fontSize: 24,
            fill: hit.judgment === 0 ? 0xff5555 : hit.judgment === 300 ? 0x66ccff : 0xffffff,
            fontWeight: 'bold',
          },
        });
        node.anchor.set(0.5);
      }
      node.position.set(hit.at.x, hit.at.y);
      this.container.addChild(node);
      this.bursts.push({ at: hit.at, judgment: hit.judgment, startMs: view.timeMs, node });
    }
  }

  render(timeMs: number): void {
    const g = this.ringGfx;
    g.clear();
    this.bursts = this.bursts.filter((b) => {
      const t = (timeMs - b.startMs) / BURST_MS;
      if (t >= 1) {
        b.node?.destroy();
        return false;
      }
      if (b.node) {
        b.node.alpha = 1 - t;
        b.node.position.y = b.at.y - t * 12;
      }
      // expanding ring only for successful, unskinned hits
      if (!this.skin?.hitResults[b.judgment] && b.judgment > 0) {
        g.circle(b.at.x, b.at.y, 30 + t * 50).stroke({
          width: 3,
          color: 0xffffff,
          alpha: (1 - t) * 0.7,
        });
      }
      return true;
    });
  }
}
