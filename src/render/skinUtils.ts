import { Sprite } from 'pixi.js';
import type { SkinTexture } from '../skin/types';

/**
 * osu! sizing rule: a circle-family image is authored so 128 logical px
 * (pixels / resolution) span the hit circle diameter (2r).
 */
export function circleSpriteScale(t: SkinTexture, r: number): number {
  return (2 * r) / (128 * t.resolution);
}

/** playfield is half of osu's 1024×768 screen space, so screen-space art halves */
export function screenSpriteScale(t: SkinTexture): number {
  return 0.5 / t.resolution;
}

export function makeSprite(t: SkinTexture, tint?: number): Sprite {
  const s = new Sprite(t.texture);
  s.anchor.set(0.5);
  if (tint !== undefined) s.tint = tint;
  return s;
}
