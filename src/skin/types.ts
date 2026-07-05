import type { Texture } from 'pixi.js';

/** texture + its skin resolution (2 for @2x) so logical size = pixels / resolution */
export interface SkinTexture {
  texture: Texture;
  resolution: number;
}

export type HitResultKey = 0 | 50 | 100 | 300;

export interface Skin {
  comboColors: number[];
  scoreOverlap: number;
  hitcircle?: SkinTexture;
  hitcircleOverlay?: SkinTexture;
  approachCircle?: SkinTexture;
  sliderBall?: SkinTexture;
  followCircle?: SkinTexture;
  reverseArrow?: SkinTexture;
  cursor?: SkinTexture;
  cursorTrail?: SkinTexture;
  /** score/combo font, exactly 10 entries when present */
  digits?: SkinTexture[];
  hitResults: Partial<Record<HitResultKey, SkinTexture>>;
  sounds: {
    hitnormal?: AudioBuffer;
    combobreak?: AudioBuffer;
  };
}
