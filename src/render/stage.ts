import { Application, Container } from 'pixi.js';
import { PLAYFIELD } from '../beatmap/model';
import type { Skin } from '../skin/types';
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
 *
 * The stage creates and owns its canvas inside `host`. Sharing one external
 * canvas between stages breaks under React StrictMode: the unmounted twin's
 * destroy() loses the WebGL context the surviving stage is rendering to.
 */
export async function createStage(
  host: HTMLElement,
  focusMode: boolean,
  skin: Skin | null = null,
): Promise<Stage> {
  const app = new Application();
  await app.init({
    backgroundAlpha: focusMode ? 1 : 0,
    background: '#111111',
    resizeTo: host,
    antialias: true,
  });
  app.canvas.style.position = 'absolute';
  app.canvas.style.inset = '0';
  app.canvas.style.width = '100%';
  app.canvas.style.height = '100%';
  host.append(app.canvas);

  const playfieldRoot = new Container();
  const playfield = new PlayfieldLayer(skin);
  const cursor = new CursorLayer(skin);
  const hud = new HudLayer(skin);
  playfieldRoot.addChild(playfield.container, cursor.container);
  app.stage.addChild(playfieldRoot, hud.container);

  let cursorLost = false;

  const layout = () => {
    // logical (CSS) size — renderer.width is physical pixels on HiDPI screens
    const w = app.screen.width;
    const h = app.screen.height;
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
      app.destroy({ removeView: true }, { children: true });
    },
  };
}
