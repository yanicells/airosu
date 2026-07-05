import { unzipSync } from 'fflate';
import { Texture } from 'pixi.js';
import { parseSkinIni } from './ini';
import { resolveImage, resolveSound } from './resolve';
import { decodeSound } from './soundBank';
import type { HitResultKey, Skin, SkinTexture } from './types';

const skinUrls = import.meta.glob('/game-assets/skins/*.osk', {
  query: '?url',
  import: 'default',
  eager: true,
}) as Record<string, string>;

async function loadTexture(
  files: Record<string, Uint8Array>,
  names: string[],
  base: string,
): Promise<SkinTexture | undefined> {
  const resolved = resolveImage(names, base);
  if (!resolved) return undefined;
  try {
    const bitmap = await createImageBitmap(new Blob([files[resolved.name].slice().buffer]));
    return { texture: Texture.from(bitmap), resolution: resolved.resolution };
  } catch {
    return undefined;
  }
}

async function loadSound(
  files: Record<string, Uint8Array>,
  names: string[],
  base: string,
): Promise<AudioBuffer | undefined> {
  const name = resolveSound(names, base);
  if (!name) return undefined;
  try {
    return await decodeSound(files[name]);
  } catch {
    return undefined;
  }
}

export async function loadSkinFromOsk(oskBytes: Uint8Array): Promise<Skin> {
  const files = unzipSync(oskBytes);
  const names = Object.keys(files);
  const iniName = names.find((n) => n.toLowerCase() === 'skin.ini');
  const ini = parseSkinIni(iniName ? new TextDecoder().decode(files[iniName]) : '');

  const loadFont = async (prefix: string): Promise<SkinTexture[] | undefined> => {
    const textures = await Promise.all(
      Array.from({ length: 10 }, (_, i) => loadTexture(files, names, `${prefix}-${i}`)),
    );
    return textures.every(Boolean) ? (textures as SkinTexture[]) : undefined;
  };
  const digits = await loadFont(ini.scorePrefix);
  const defaultDigits = await loadFont(ini.hitCirclePrefix);

  const hitResults: Skin['hitResults'] = {};
  for (const key of [0, 50, 100, 300] as HitResultKey[]) {
    const t = await loadTexture(files, names, `hit${key}`);
    if (t) hitResults[key] = t;
  }

  return {
    comboColors: ini.comboColors,
    scoreOverlap: ini.scoreOverlap,
    sliderBorder: ini.sliderBorder,
    sliderTrack: ini.sliderTrack,
    defaultDigits,
    hitCircleOverlap: ini.hitCircleOverlap,
    hitcircle: await loadTexture(files, names, 'hitcircle'),
    hitcircleOverlay: await loadTexture(files, names, 'hitcircleoverlay'),
    approachCircle: await loadTexture(files, names, 'approachcircle'),
    sliderBall:
      (await loadTexture(files, names, 'sliderb0')) ?? (await loadTexture(files, names, 'sliderb')),
    followCircle: await loadTexture(files, names, 'sliderfollowcircle'),
    reverseArrow: await loadTexture(files, names, 'reversearrow'),
    cursor: await loadTexture(files, names, 'cursor'),
    cursorTrail: await loadTexture(files, names, 'cursortrail'),
    digits,
    hitResults,
    sounds: {
      hitnormal: await loadSound(files, names, 'normal-hitnormal'),
      combobreak: await loadSound(files, names, 'combobreak'),
    },
  };
}

let cached: Promise<Skin | null> | null = null;

/** Bundled skin (first .osk in game-assets/skins), null when absent or broken. */
export function getSkin(): Promise<Skin | null> {
  cached ??= (async () => {
    const url = Object.values(skinUrls)[0];
    if (!url) return null;
    try {
      const bytes = new Uint8Array(await (await fetch(url)).arrayBuffer());
      return await loadSkinFromOsk(bytes);
    } catch (e) {
      console.warn('skin load failed, using procedural rendering', e);
      return null;
    }
  })();
  return cached;
}
