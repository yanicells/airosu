import { readFileSync } from 'node:fs';
import { unzipSync } from 'fflate';
import { afterEach, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  textureFrom: vi.fn((bitmap: { width: number; height: number }) => ({
    width: bitmap.width,
    height: bitmap.height,
  })),
  decodeSound: vi.fn(async (bytes: Uint8Array) => ({
    byteLength: bytes.byteLength,
  })),
}));

vi.mock('pixi.js', () => ({ Texture: { from: mocks.textureFrom } }));
vi.mock('./soundBank', () => ({ decodeSound: mocks.decodeSound }));

import { loadSkinFromOsk } from './loadSkin';

const skin = new Uint8Array(readFileSync('game-assets/skins/Aristia(Edit)+trail.osk'));

function pngDimensions(bytes: Uint8Array): { width: number; height: number } {
  const view = new DataView(bytes.buffer, bytes.byteOffset);
  return { width: view.getUint32(16), height: view.getUint32(20) };
}

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

it('decodes the bundled archive into the textures and sounds the loader exposes', async () => {
  const files = unzipSync(skin);
  vi.stubGlobal(
    'createImageBitmap',
    vi.fn(async (blob: Blob) => pngDimensions(new Uint8Array(await blob.arrayBuffer()))),
  );

  const loaded = await loadSkinFromOsk(skin);

  expect(loaded.defaultDigits).toHaveLength(10);
  expect(loaded.digits).toHaveLength(10);
  expect(loaded.hitcircle?.texture).toEqual({ width: 128, height: 128 });
  expect(loaded.sliderBall).toMatchObject({
    resolution: 2,
    texture: { width: 340, height: 340 },
  });
  expect(Object.keys(loaded.hitResults).sort()).toEqual(['0', '100', '300', '50']);
  expect(loaded.sounds.hitnormal).toEqual({ byteLength: files['normal-hitnormal.wav'].byteLength });
  expect(loaded.sounds.combobreak).toEqual({ byteLength: files['combobreak.wav'].byteLength });
  expect(mocks.textureFrom).toHaveBeenCalledTimes(32);
  expect(mocks.decodeSound).toHaveBeenCalledTimes(2);
});
