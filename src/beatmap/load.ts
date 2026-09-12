import { unzipSync } from 'fflate';
import { BeatmapDecoder } from 'osu-parsers';
import type { LoadedBeatmap } from './model';
import { toInternal } from './adapter';
import { starRating } from './stars';

export interface OszEntry {
  difficultyName: string;
  osuText: string;
}

export interface MapsetPreview {
  background?: Blob;
  /** sorted by stars ascending */
  difficulties: { name: string; stars: number }[];
}

const textDecoder = new TextDecoder();
const imageExtension = /\.(jpg|jpeg|png|webp|bmp)$/i;
const playableExtension = /\.(osu|mp3|ogg|wav|jpg|jpeg|png|webp|bmp)$/i;

export function listDifficulties(oszBytes: Uint8Array): OszEntry[] {
  return difficultiesIn(unzipSync(oszBytes, { filter: (entry) => /\.osu$/i.test(entry.name) }));
}

function difficultiesIn(files: Record<string, Uint8Array>): OszEntry[] {
  const entries: OszEntry[] = [];
  for (const [name, bytes] of Object.entries(files)) {
    if (!name.toLowerCase().endsWith('.osu')) continue;
    const osuText = textDecoder.decode(bytes);
    const mode = osuText.match(/^Mode\s*:\s*(\d+)/m);
    if (mode && mode[1] !== '0') continue;
    const match = osuText.match(/^Version\s*:\s*(.+)$/m);
    entries.push({ difficultyName: match ? match[1].trim() : name, osuText });
  }
  return entries;
}

function findEntry(files: Record<string, Uint8Array>, filename: string): Uint8Array | undefined {
  const target = filename.replace(/\\/g, '/').toLowerCase();
  for (const [name, bytes] of Object.entries(files)) {
    if (name.toLowerCase() === target) return bytes;
  }
  return undefined;
}

/** One selected archive owns its extracted files and parsed difficulties. */
export class OszArchive {
  readonly entries: OszEntry[];
  private files: Record<string, Uint8Array>;
  private maps = new Map<string, LoadedBeatmap>();
  private cachedPreview?: MapsetPreview;

  constructor(bytes: Uint8Array) {
    this.files = unzipSync(bytes, { filter: (entry) => playableExtension.test(entry.name) });
    this.entries = difficultiesIn(this.files);
  }

  preview(): MapsetPreview {
    return (this.cachedPreview ??= {
      background: backgroundIn(this.files, this.entries),
      difficulties: this.entries
        .map((e) => ({ name: e.difficultyName, stars: starRating(e.osuText) }))
        .sort((a, b) => a.stars - b.stars),
    });
  }

  load(difficultyName: string): LoadedBeatmap {
    const cached = this.maps.get(difficultyName);
    if (cached) return cached;
    const entry = this.entries.find((e) => e.difficultyName === difficultyName);
    if (!entry) throw new Error(`Difficulty not found: ${difficultyName}`);
    const decoded = new BeatmapDecoder().decodeFromString(entry.osuText, {
      parseStoryboard: false,
    });
    const audioBytes = findEntry(this.files, decoded.general.audioFilename);
    if (!audioBytes) throw new Error(`Audio file not found: ${decoded.general.audioFilename}`);
    const bgBytes = findEntry(this.files, decoded.events.backgroundPath ?? '');
    const background = bgBytes ? new Blob([bgBytes.slice().buffer]) : undefined;
    const map = toInternal(decoded, entry.osuText, audioBytes.slice().buffer, background);
    this.maps.set(difficultyName, map);
    return map;
  }
}

/** Thumbnail extraction skips audio, videos, hit objects and star calculations. */
export function oszBackground(oszBytes: Uint8Array): Blob | undefined {
  const files = unzipSync(oszBytes, {
    filter: (entry) => /\.osu$/i.test(entry.name) || imageExtension.test(entry.name),
  });
  return backgroundIn(files, difficultiesIn(files));
}

function backgroundIn(files: Record<string, Uint8Array>, entries: OszEntry[]): Blob | undefined {
  const decoder = new BeatmapDecoder();
  for (const e of entries) {
    const bgPath = decoder.decodeFromString(e.osuText, {
      parseStoryboard: false,
      parseHitObjects: false,
      parseTimingPoints: false,
    }).events.backgroundPath;
    const bgBytes = bgPath ? findEntry(files, bgPath) : undefined;
    if (bgBytes) return new Blob([bgBytes.slice().buffer]);
  }
  return undefined;
}

export function loadFromOsu(osuText: string, audio: ArrayBuffer): LoadedBeatmap {
  const decoded = new BeatmapDecoder().decodeFromString(osuText, { parseStoryboard: false });
  if (/^Mode\s*:\s*[1-9]/m.test(osuText)) throw new Error('Only osu! standard maps are supported');
  return toInternal(decoded, osuText, audio);
}
