import { Container, Text } from 'pixi.js';
import type { Skin } from '../skin/types';
import { DigitRow } from './digitFont';

/** Score / combo / accuracy overlay, positioned in screen coords. */
export class HudLayer {
  readonly container = new Container();
  private scoreText: Text | null = null;
  private comboText: Text | null = null;
  private scoreDigits: DigitRow | null = null;
  private comboDigits: DigitRow | null = null;
  private comboX: Text | null = null;
  private accText: Text;
  private lostText: Text;
  private lastCombo = 0;
  private comboPopAt = 0;
  private comboRoot = new Container();

  constructor(skin: Skin | null) {
    if (skin?.digits) {
      this.scoreDigits = new DigitRow(skin.digits, skin.scoreOverlap, 34, true);
      this.container.addChild(this.scoreDigits.container);
      this.comboDigits = new DigitRow(skin.digits, skin.scoreOverlap, 42, false);
      this.comboX = new Text({
        text: 'x',
        style: { fontSize: 28, fill: 0xffffff, fontWeight: 'bold', fontStyle: 'italic' },
      });
      this.comboX.anchor.set(0, 1);
      this.comboRoot.addChild(this.comboDigits.container, this.comboX);
    } else {
      this.scoreText = new Text({
        text: '0',
        style: { fontSize: 32, fill: 0xffffff, fontWeight: 'bold' },
      });
      this.scoreText.anchor.set(1, 0);
      this.container.addChild(this.scoreText);
      this.comboText = new Text({
        text: '',
        style: { fontSize: 40, fill: 0xffffff, fontWeight: 'bold' },
      });
      this.comboText.anchor.set(0, 1);
      this.comboRoot.addChild(this.comboText);
    }
    this.comboRoot.pivot.set(0, 0);
    this.container.addChild(this.comboRoot);

    this.accText = new Text({ text: '100.0%', style: { fontSize: 18, fill: 0xcccccc } });
    this.accText.anchor.set(1, 0);
    this.lostText = new Text({ text: 'hand lost', style: { fontSize: 16, fill: 0xffaa55 } });
    this.lostText.anchor.set(0.5, 0);
    this.lostText.visible = false;
    this.container.addChild(this.accText, this.lostText);
  }

  layout(w: number, h: number): void {
    this.scoreText?.position.set(w - 16, 12);
    this.scoreDigits?.container.position.set(w - 16, 12);
    this.accText.position.set(w - 16, 56);
    this.comboRoot.position.set(16, h - 12);
    this.lostText.position.set(w / 2, 12);
  }

  render(score: number, combo: number, accuracy: number, cursorLost: boolean, nowMs: number): void {
    if (this.scoreDigits) this.scoreDigits.set(String(score));
    else this.scoreText!.text = String(score);

    if (this.comboDigits) {
      const text = combo > 0 ? String(combo) : '';
      this.comboDigits.set(text);
      this.comboDigits.container.position.set(0, -42);
      if (this.comboX) {
        this.comboX.visible = combo > 0;
        this.comboX.position.set(this.comboDigits.width + 4, 0);
      }
    } else {
      this.comboText!.text = combo > 0 ? `${combo}x` : '';
    }

    this.accText.text = `${(accuracy * 100).toFixed(1)}%`;
    if (combo > this.lastCombo) this.comboPopAt = nowMs;
    this.lastCombo = combo;
    const pop = Math.max(0, 1 - (nowMs - this.comboPopAt) / 150);
    this.comboRoot.scale.set(1 + pop * 0.25);
    this.lostText.visible = cursorLost;
  }
}
