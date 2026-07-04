import { Application, Container } from 'pixi.js';
import { PLAYFIELD } from '../beatmap/model';
import { CursorLayer } from './cursor';
import { HudLayer } from './hud';
import { PlayfieldLayer } from './playfield';
import type { RenderView } from './types';

export interface Stage {
  render(view: RenderView): void;
  resize(): void;
  destroy(): void;
}

/**
 * Pixi stage over a transparent canvas. The camera <video> (arcade mode) sits
 * behind the canvas in the DOM; focus mode uses a solid dark background.
 */
export async function createStage(canvas: HTMLCanvasElement, focusMode: boolean): Promise<Stage> {
  const app = new Application();
  await app.init({
    canvas,
    backgroundAlpha: focusMode ? 1 : 0,
    background: '#111111',
    resizeTo: canvas.parentElement ?? undefined,
    antialias: true,
  });

  const playfieldRoot = new Container();
  const playfield = new PlayfieldLayer();
  const cursor = new CursorLayer();
  const hud = new HudLayer();
  playfieldRoot.addChild(playfield.container, cursor.container);
  app.stage.addChild(playfieldRoot, hud.container);

  let cursorLost = false;

  const layout = () => {
    const w = app.renderer.width;
    const h = app.renderer.height;
    // letterbox 4:3 playfield with a margin
    const scale = Math.min(w / PLAYFIELD.w, h / PLAYFIELD.h) * 0.85;
    playfieldRoot.scale.set(scale);
    playfieldRoot.position.set(
      (w - PLAYFIELD.w * scale) / 2,
      (h - PLAYFIELD.h * scale) / 2,
    );
    hud.layout(w, h);
  };
  layout();

  return {
    render(view: RenderView) {
      playfield.addHits(view);
      playfield.render(view);
      cursorLost = view.cursor === null;
      cursor.render(view.cursor);
      hud.render(view.score, view.combo, view.accuracy, cursorLost, view.timeMs);
    },
    resize: layout,
    destroy() {
      app.destroy(false, { children: true });
    },
  };
}
