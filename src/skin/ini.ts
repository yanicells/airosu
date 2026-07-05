export interface SkinIni {
  /** Combo1..ComboN as 0xRRGGBB, in cycle order */
  comboColors: number[];
  sliderBorder: number;
  /** null = tint the track with the combo colour (osu default) */
  sliderTrack: number | null;
  hitCirclePrefix: string;
  hitCircleOverlap: number;
  scorePrefix: string;
  comboPrefix: string;
  scoreOverlap: number;
}

/** osu! defaults used when skin.ini omits the section */
const DEFAULT_COMBO_COLORS = [0xffc000, 0x00ca00, 0x127cff, 0xf21839];

function parseColor(value: string): number | null {
  const parts = value.split(',').map((p) => Number(p.trim()));
  if (parts.length < 3 || parts.slice(0, 3).some((n) => !Number.isFinite(n))) return null;
  const [r, g, b] = parts;
  return (r << 16) | (g << 8) | b;
}

/** Minimal skin.ini parse: combo colours + digit font prefixes. */
export function parseSkinIni(text: string): SkinIni {
  const values = new Map<string, string>();
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('//') || line.startsWith('[')) continue;
    const colon = line.indexOf(':');
    if (colon === -1) continue;
    values.set(line.slice(0, colon).trim().toLowerCase(), line.slice(colon + 1).trim());
  }

  const comboColors: number[] = [];
  for (let i = 1; i <= 8; i++) {
    const value = values.get(`combo${i}`);
    if (!value) continue;
    const color = parseColor(value);
    if (color !== null) comboColors.push(color);
  }

  const prefix = (key: string, fallback: string) =>
    (values.get(key) ?? fallback).replace(/\\/g, '/');

  const sliderBorderRaw = values.get('sliderborder');
  const sliderTrackRaw = values.get('slidertrackoverride');

  return {
    comboColors: comboColors.length > 0 ? comboColors : [...DEFAULT_COMBO_COLORS],
    sliderBorder: (sliderBorderRaw ? parseColor(sliderBorderRaw) : null) ?? 0xffffff,
    sliderTrack: sliderTrackRaw ? parseColor(sliderTrackRaw) : null,
    hitCirclePrefix: prefix('hitcircleprefix', 'default'),
    hitCircleOverlap: Number(values.get('hitcircleoverlap') ?? -2),
    scorePrefix: prefix('scoreprefix', 'score'),
    comboPrefix: prefix('comboprefix', 'score'),
    scoreOverlap: Number(values.get('scoreoverlap')) || 0,
  };
}
