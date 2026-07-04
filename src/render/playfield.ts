import { Container, Graphics, Text } from 'pixi.js';
import { circleRadius, PLAYFIELD } from '../beatmap/model';
import type { SliderObj, Vec2 } from '../beatmap/model';
import { sliderBallPos } from '../game/session';
import type { RenderView } from './types';

const COMBO_COLORS = [0xff66aa, 0x66aaff, 0xffcc66, 0x88ee88];

interface Burst {
  at: Vec2;
  judgment: number;
  startMs: number;
}

const BURST_MS = 500;

/** Draws hit objects, approach circles and hit bursts inside the 512×384 space. */
export class PlayfieldLayer {
  readonly container = new Container();
  private objects = new Graphics();
  private bursts: Burst[] = [];
  private burstGfx = new Graphics();
  private burstTexts: Text[] = [];

  constructor() {
    this.container.addChild(this.objects, this.burstGfx);
  }

  addHits(view: RenderView): void {
    for (const hit of view.recentHits) {
      this.bursts.push({ at: hit.at, judgment: hit.judgment, startMs: view.timeMs });
      const label = new Text({
        text: hit.judgment === 0 ? 'miss' : String(hit.judgment),
        style: {
          fontSize: 24,
          fill: hit.judgment === 0 ? 0xff5555 : hit.judgment === 300 ? 0x66ccff : 0xffffff,
          fontWeight: 'bold',
        },
      });
      label.anchor.set(0.5);
      label.position.set(hit.at.x, hit.at.y);
      (label as Text & { burstStart: number }).burstStart = view.timeMs;
      this.burstTexts.push(label);
      this.container.addChild(label);
    }
  }

  render(view: RenderView): void {
    const g = this.objects;
    g.clear();
    const r = circleRadius(view.cs);

    // draw later objects first so the earliest is on top
    for (let k = view.objects.length - 1; k >= 0; k--) {
      const { obj, index, judged } = view.objects[k];
      if (judged) continue;
      const color = COMBO_COLORS[index % COMBO_COLORS.length];

      if (obj.kind === 'spinner') {
        this.drawSpinner(g, view.timeMs, obj.time, obj.endTime);
        continue;
      }

      const appear = obj.time - view.preemptMs;
      const t = Math.min(Math.max((view.timeMs - appear) / view.preemptMs, 0), 1);
      const alpha = Math.min(t * 2.5, 1);

      if (obj.kind === 'slider') this.drawSliderBody(g, obj, r, color, alpha, view.timeMs);

      const pos = obj.pos;
      g.circle(pos.x, pos.y, r).fill({ color, alpha: alpha * 0.85 });
      g.circle(pos.x, pos.y, r).stroke({ width: 3, color: 0xffffff, alpha });

      // approach circle: 3x → 1x over preempt
      if (view.timeMs < obj.time) {
        const scale = 3 - 2 * t;
        g.circle(pos.x, pos.y, r * scale).stroke({ width: 2, color: 0xffffff, alpha: alpha * 0.8 });
      }
    }

    this.renderBursts(view.timeMs);
  }

  private drawSliderBody(
    g: Graphics,
    obj: SliderObj,
    r: number,
    color: number,
    alpha: number,
    timeMs: number,
  ): void {
    if (obj.path.length < 2) return;
    g.moveTo(obj.path[0].x, obj.path[0].y);
    for (let i = 1; i < obj.path.length; i++) g.lineTo(obj.path[i].x, obj.path[i].y);
    g.stroke({ width: 2 * r, color, alpha: alpha * 0.35, cap: 'round', join: 'round' });

    // slider ball while active
    if (timeMs >= obj.time && timeMs <= obj.endTime) {
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

  private renderBursts(timeMs: number): void {
    const g = this.burstGfx;
    g.clear();
    this.bursts = this.bursts.filter((b) => timeMs - b.startMs < BURST_MS);
    for (const b of this.bursts) {
      if (b.judgment === 0) continue;
      const t = (timeMs - b.startMs) / BURST_MS;
      g.circle(b.at.x, b.at.y, 30 + t * 50).stroke({
        width: 3,
        color: 0xffffff,
        alpha: (1 - t) * 0.7,
      });
    }
    this.burstTexts = this.burstTexts.filter((label) => {
      const start = (label as Text & { burstStart: number }).burstStart;
      const t = (timeMs - start) / BURST_MS;
      if (t >= 1) {
        this.container.removeChild(label);
        label.destroy();
        return false;
      }
      label.alpha = 1 - t;
      label.position.y -= 0.5;
      return true;
    });
  }
}
