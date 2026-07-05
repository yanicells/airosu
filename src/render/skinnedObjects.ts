import { Container, Sprite } from 'pixi.js';
import { circleRadius } from '../beatmap/model';
import type { HitObject, SliderObj } from '../beatmap/model';
import { sliderBallPos } from '../game/session';
import type { Skin } from '../skin/types';
import { circleSpriteScale, makeSprite } from './skinUtils';
import type { RenderView } from './types';

interface Group {
  root: Container;
  circle?: Sprite;
  overlay?: Sprite;
  approach?: Sprite;
  ball?: Sprite;
  follow?: Sprite;
  reverse?: Sprite;
}

/** Skinned hit circles / approach circles / slider ball layer. */
export class SkinnedObjectLayer {
  readonly container = new Container();
  private groups = new Map<number, Group>();

  private skin: Skin;

  constructor(skin: Skin) {
    this.skin = skin;
  }

  private createGroup(obj: HitObject, r: number): Group {
    const root = new Container();
    const group: Group = { root };
    if (obj.kind === 'spinner') return group;
    const color = this.skin.comboColors[obj.comboIndex % this.skin.comboColors.length];
    const { hitcircle, hitcircleOverlay, approachCircle, sliderBall, followCircle, reverseArrow } =
      this.skin;

    if (hitcircle) {
      group.circle = makeSprite(hitcircle, color);
      group.circle.scale.set(circleSpriteScale(hitcircle, r));
      group.circle.position.set(obj.pos.x, obj.pos.y);
      root.addChild(group.circle);
    }
    if (hitcircleOverlay) {
      group.overlay = makeSprite(hitcircleOverlay);
      group.overlay.scale.set(circleSpriteScale(hitcircleOverlay, r));
      group.overlay.position.set(obj.pos.x, obj.pos.y);
      root.addChild(group.overlay);
    }
    if (approachCircle) {
      group.approach = makeSprite(approachCircle, color);
      group.approach.position.set(obj.pos.x, obj.pos.y);
      root.addChild(group.approach);
    }
    if (obj.kind === 'slider') {
      if (reverseArrow && obj.repeats > 1) {
        group.reverse = makeSprite(reverseArrow);
        group.reverse.scale.set(circleSpriteScale(reverseArrow, r));
        root.addChild(group.reverse);
      }
      if (followCircle) {
        group.follow = makeSprite(followCircle);
        group.follow.scale.set(circleSpriteScale(followCircle, r));
        group.follow.visible = false;
        root.addChild(group.follow);
      }
      if (sliderBall) {
        group.ball = makeSprite(sliderBall);
        group.ball.scale.set(circleSpriteScale(sliderBall, r));
        group.ball.visible = false;
        root.addChild(group.ball);
      }
    }
    return group;
  }

  private updateSlider(group: Group, obj: SliderObj, timeMs: number): void {
    const active = timeMs >= obj.time && timeMs <= obj.endTime;
    if (group.ball) group.ball.visible = active;
    if (group.follow) group.follow.visible = active;
    if (active) {
      const pos = sliderBallPos(obj, timeMs);
      group.ball?.position.set(pos.x, pos.y);
      group.follow?.position.set(pos.x, pos.y);
    }
    if (group.reverse) {
      const spans = Math.max(obj.repeats, 1);
      const duration = (obj.endTime - obj.time) / spans;
      const span = active ? Math.min(Math.floor((timeMs - obj.time) / duration), spans - 1) : 0;
      const remaining = spans - 1 - span;
      group.reverse.visible = remaining > 0 && obj.path.length >= 2;
      if (group.reverse.visible) {
        const atEnd = span % 2 === 0;
        const tip = atEnd ? obj.path[obj.path.length - 1] : obj.path[0];
        const prev = atEnd ? obj.path[obj.path.length - 2] : obj.path[1];
        group.reverse.position.set(tip.x, tip.y);
        group.reverse.rotation = Math.atan2(prev.y - tip.y, prev.x - tip.x);
      }
    }
  }

  render(view: RenderView): void {
    const r = circleRadius(view.cs);
    const seen = new Set<number>();

    for (const { obj, index, judged } of view.objects) {
      if (judged || obj.kind === 'spinner') continue;
      seen.add(index);
      let group = this.groups.get(index);
      if (!group) {
        group = this.createGroup(obj, r);
        this.groups.set(index, group);
        // later objects sit behind earlier ones
        this.container.addChildAt(group.root, 0);
      }

      const appear = obj.time - view.preemptMs;
      const t = Math.min(Math.max((view.timeMs - appear) / view.preemptMs, 0), 1);
      const alpha = Math.min(t * 2.5, 1);
      group.root.alpha = alpha;

      const preHit = view.timeMs < obj.time;
      if (group.circle) group.circle.visible = obj.kind === 'circle' || preHit;
      if (group.overlay) group.overlay.visible = obj.kind === 'circle' || preHit;
      if (group.approach) {
        group.approach.visible = preHit;
        if (preHit && this.skin.approachCircle) {
          const scale = circleSpriteScale(this.skin.approachCircle, r) * (3 - 2 * t);
          group.approach.scale.set(scale);
        }
      }
      if (obj.kind === 'slider') this.updateSlider(group, obj, view.timeMs);
    }

    for (const [index, group] of this.groups) {
      if (!seen.has(index)) {
        group.root.destroy({ children: true });
        this.groups.delete(index);
      }
    }
  }
}
