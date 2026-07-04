import { Container, Text } from 'pixi.js';

/** Score / combo / accuracy overlay, positioned in screen coords. */
export class HudLayer {
  readonly container = new Container();
  private scoreText: Text;
  private comboText: Text;
  private accText: Text;
  private lostText: Text;
  private lastCombo = 0;
  private comboPopAt = 0;

  constructor() {
    this.scoreText = new Text({
      text: '0',
      style: { fontSize: 32, fill: 0xffffff, fontWeight: 'bold' },
    });
    this.scoreText.anchor.set(1, 0);
    this.accText = new Text({ text: '100.0%', style: { fontSize: 18, fill: 0xcccccc } });
    this.accText.anchor.set(1, 0);
    this.comboText = new Text({
      text: '',
      style: { fontSize: 40, fill: 0xffffff, fontWeight: 'bold' },
    });
    this.comboText.anchor.set(0, 1);
    this.lostText = new Text({
      text: 'hand lost',
      style: { fontSize: 16, fill: 0xffaa55 },
    });
    this.lostText.anchor.set(0.5, 0);
    this.lostText.visible = false;
    this.container.addChild(this.scoreText, this.accText, this.comboText, this.lostText);
  }

  layout(w: number, h: number): void {
    this.scoreText.position.set(w - 16, 12);
    this.accText.position.set(w - 16, 52);
    this.comboText.position.set(16, h - 12);
    this.lostText.position.set(w / 2, 12);
  }

  render(score: number, combo: number, accuracy: number, cursorLost: boolean, nowMs: number): void {
    this.scoreText.text = String(score);
    this.accText.text = `${(accuracy * 100).toFixed(1)}%`;
    this.comboText.text = combo > 0 ? `${combo}x` : '';
    if (combo > this.lastCombo) this.comboPopAt = nowMs;
    this.lastCombo = combo;
    const pop = Math.max(0, 1 - (nowMs - this.comboPopAt) / 150);
    this.comboText.scale.set(1 + pop * 0.25);
    this.lostText.visible = cursorLost;
  }
}
