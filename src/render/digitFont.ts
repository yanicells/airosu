import { Container, Sprite } from 'pixi.js';
import type { SkinTexture } from '../skin/types';

/** Renders a digit string with a skin score font, pooled sprites. */
export class DigitRow {
  readonly container = new Container();
  private sprites: Sprite[] = [];
  private lastWidth = 0;

  /** laid-out width of the last set() call */
  get width(): number {
    return this.lastWidth;
  }

  private digits: SkinTexture[];
  private overlap: number;
  private height: number;
  private alignRight: boolean;

  constructor(digits: SkinTexture[], overlap: number, height: number, alignRight: boolean) {
    this.digits = digits;
    this.overlap = overlap;
    this.height = height;
    this.alignRight = alignRight;
  }

  set(text: string): void {
    while (this.sprites.length < text.length) {
      const s = new Sprite();
      s.anchor.set(0, 0);
      this.container.addChild(s);
      this.sprites.push(s);
    }
    let x = 0;
    for (let i = 0; i < this.sprites.length; i++) {
      const sprite = this.sprites[i];
      const ch = text[i];
      const digit = ch !== undefined ? this.digits[Number(ch)] : undefined;
      if (!digit) {
        sprite.visible = false;
        continue;
      }
      sprite.visible = true;
      sprite.texture = digit.texture;
      const scale = this.height / digit.texture.height;
      sprite.scale.set(scale);
      sprite.position.set(x, 0);
      x += digit.texture.width * scale - this.overlap * digit.resolution * scale;
    }
    this.lastWidth = x;
    this.container.pivot.x = this.alignRight ? x : 0;
  }
}
