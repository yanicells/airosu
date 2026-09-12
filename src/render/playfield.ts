import { Container, Graphics } from 'pixi.js';
import { circleRadius, PLAYFIELD } from '../beatmap/model';
import type { SliderObj } from '../beatmap/model';
import { sliderBallPos } from '../game/session';
import type { Skin } from '../skin/types';
import { BurstLayer } from './bursts';
import { SkinnedObjectLayer } from './skinnedObjects';
import type { RenderView } from './types';

const FALLBACK_COMBO_COLORS = [0xff66aa, 0x66aaff, 0xffcc66, 0x88ee88];

/** Draws hit objects, approach circles and hit bursts inside the 512×384 space. */
export class PlayfieldLayer {
  readonly container = new Container();
  private bodies = new Container();
  private bodyObjects = new Map<number, { root: Container; path?: Graphics; moving: Graphics }>();
  private circles = new Graphics();
  private skinned: SkinnedObjectLayer | null;
  private bursts: BurstLayer;
  private comboColors: number[];

  private skin: Skin | null;

  constructor(skin: Skin | null) {
    this.skin = skin;
    this.bodies.sortableChildren = true;
    this.comboColors = skin?.comboColors ?? FALLBACK_COMBO_COLORS;
    this.skinned = skin?.hitcircle ? new SkinnedObjectLayer(skin) : null;
    this.bursts = new BurstLayer(skin);
    this.container.addChild(this.bodies, this.circles);
    if (this.skinned) this.container.addChild(this.skinned.container);
    this.container.addChild(this.bursts.container);
  }

  addHits(view: RenderView): void {
    this.bursts.add(view);
  }

  render(view: RenderView): void {
    const r = circleRadius(view.cs);
    const visibleBodies = new Set<number>();
    this.circles.clear();

    // Retain slider paths; only alpha, slider balls, and spinners change per frame.
    for (let k = view.objects.length - 1; k >= 0; k--) {
      const { obj, index } = view.objects[k];
      const color = this.comboColors[obj.comboIndex % this.comboColors.length];
      const appear = obj.time - view.preemptMs;
      const t = Math.min(Math.max((view.timeMs - appear) / view.preemptMs, 0), 1);
      const alpha = Math.min(t * 2.5, 1);
      if (obj.kind !== 'circle') {
        visibleBodies.add(index);
        let body = this.bodyObjects.get(index);
        if (!body) {
          const root = new Container();
          root.zIndex = -index;
          let path: Graphics | undefined;
          if (obj.kind === 'slider') {
            path = new Graphics();
            this.drawSliderBody(path, obj, r, color);
            root.addChild(path);
          }
          const moving = new Graphics();
          root.addChild(moving);
          body = { root, path, moving };
          this.bodyObjects.set(index, body);
          this.bodies.addChild(root);
        }
        body.moving.clear();
        if (obj.kind === 'spinner') {
          this.drawSpinner(body.moving, view.timeMs, obj.time, obj.endTime);
          continue;
        }
        if (body.path) body.path.alpha = alpha * (this.skin ? 0.9 : 0.35);
        this.drawSliderBall(body.moving, obj, r, view.timeMs);
      }
      if (!this.skinned) this.drawProceduralCircle(obj.pos, r, color, alpha, t, view.timeMs, obj.time);
    }
    for (const [index, body] of this.bodyObjects) {
      if (!visibleBodies.has(index)) {
        body.root.destroy({ children: true });
        this.bodyObjects.delete(index);
      }
    }
    this.skinned?.render(view);
    this.bursts.render(view.timeMs);
  }

  private drawProceduralCircle(
    pos: { x: number; y: number },
    r: number,
    color: number,
    alpha: number,
    t: number,
    timeMs: number,
    hitTime: number,
  ): void {
    const g = this.circles;
    g.circle(pos.x, pos.y, r).fill({ color, alpha: alpha * 0.85 });
    g.circle(pos.x, pos.y, r).stroke({ width: 3, color: 0xffffff, alpha });
    if (timeMs < hitTime) {
      const scale = 3 - 2 * t;
      g.circle(pos.x, pos.y, r * scale).stroke({ width: 2, color: 0xffffff, alpha: alpha * 0.8 });
    }
  }

  private drawSliderBody(
    g: Graphics,
    obj: SliderObj,
    r: number,
    color: number,
  ): void {
    if (obj.path.length < 2) return;
    const tracePath = () => {
      g.moveTo(obj.path[0].x, obj.path[0].y);
      for (let i = 1; i < obj.path.length; i++) g.lineTo(obj.path[i].x, obj.path[i].y);
    };

    if (this.skin) {
      // osu! style: SliderBorder ring around a dark SliderTrackOverride fill
      tracePath();
      g.stroke({
        width: 2 * r,
        color: this.skin.sliderBorder,
        alpha: 1,
        cap: 'round',
        join: 'round',
      });
      tracePath();
      g.stroke({
        width: 2 * r * 0.82,
        color: this.skin.sliderTrack ?? color,
        alpha: 1,
        cap: 'round',
        join: 'round',
      });
    } else {
      tracePath();
      g.stroke({ width: 2 * r, color, alpha: 1, cap: 'round', join: 'round' });
    }
  }

  private drawSliderBall(g: Graphics, obj: SliderObj, r: number, timeMs: number): void {
    if (obj.path.length < 2) return;
    // Procedural slider ball only when the skin does not provide one.
    if (!this.skin?.sliderBall && timeMs >= obj.time && timeMs <= obj.endTime) {
      const ball = sliderBallPos(obj, timeMs);
      g.circle(ball.x, ball.y, r * 0.8).fill({ color: 0xffffff, alpha: 0.9 });
      g.circle(ball.x, ball.y, r * 2.4).stroke({ width: 2, color: 0xffffff, alpha: 0.5 });
    }
  }

  private drawSpinner(g: Graphics, timeMs: number, start: number, end: number): void {
    if (timeMs < start - 400) return;
    const cx = PLAYFIELD.w / 2;
    const cy = PLAYFIELD.h / 2;
    const progress = Math.min(Math.max((timeMs - start) / (end - start), 0), 1);
    const angle = (timeMs / 1000) * Math.PI * 2;
    g.circle(cx, cy, 120).stroke({ width: 4, color: 0xffffff, alpha: 0.4 });
    g.circle(cx, cy, 120 * (1 - progress)).fill({ color: 0x8866ff, alpha: 0.3 });
    for (let i = 0; i < 6; i++) {
      const a = angle + (i * Math.PI) / 3;
      g.moveTo(cx, cy).lineTo(cx + Math.cos(a) * 120, cy + Math.sin(a) * 120);
    }
    g.stroke({ width: 2, color: 0xffffff, alpha: 0.25 });
  }
}
