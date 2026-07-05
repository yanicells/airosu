import { unzipSync } from 'fflate';
import { BeatmapDecoder } from 'osu-parsers';
import type { LoadedBeatmap } from './model';
import { toInternal } from './adapter';
import { starRating } from './stars';

export interface OszEntry {
  difficultyName: string;
  osuText: string;
}

const textDecoder = new TextDecoder();

export function listDifficulties(oszBytes: Uint8Array): OszEntry[] {
  const files = unzipSync(oszBytes);
  const entries: OszEntry[] = [];
  for (const [name, bytes] of Object.entries(files)) {
    if (!name.toLowerCase().endsWith('.osu')) continue;
    const osuText = textDecoder.decode(bytes);
    const match = osuText.match(/^Version\s*:\s*(.+)$/m);
    entries.push({ difficultyName: match ? match[1].trim() : name, osuText });
  }
  return entries;
}

function findEntry(
  files: Record<string, Uint8Array>,
  filename: string,
): Uint8Array | undefined {
  const target = filename.toLowerCase();
  for (const [name, bytes] of Object.entries(files)) {
    if (name.toLowerCase() === target) return bytes;
  }
  return undefined;
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.slice().buffer as ArrayBuffer;
}

export function loadFromOsz(oszBytes: Uint8Array, difficultyName: string): LoadedBeatmap {
  const entry = listDifficulties(oszBytes).find((e) => e.difficultyName === difficultyName);
  if (!entry) throw new Error(`Difficulty not found: ${difficultyName}`);

  const decoder = new BeatmapDecoder();
  const decoded = decoder.decodeFromString(entry.osuText, { parseStoryboard: false });

  const files = unzipSync(oszBytes);
  const audioBytes = findEntry(files, decoded.general.audioFilename);
  if (!audioBytes) throw new Error(`Audio file not found: ${decoded.general.audioFilename}`);

  let background: Blob | undefined;
  const bgPath = decoded.events.backgroundPath;
  if (bgPath) {
    const bgBytes = findEntry(files, bgPath);
    if (bgBytes) background = new Blob([bgBytes.slice().buffer as ArrayBuffer]);
  }

  return toInternal(decoded, toArrayBuffer(audioBytes), background);
}

export interface MapsetPreview {
  background?: Blob;
  /** sorted by stars ascending */
  difficulties: { name: string; stars: number }[];
}

/** Difficulty names + star ratings + a background, without decoding audio. */
export function previewOsz(oszBytes: Uint8Array): MapsetPreview {
  const entries = listDifficulties(oszBytes);
  const difficulties = entries
    .map((e) => ({ name: e.difficultyName, stars: starRating(e.osuText) }))
    .sort((a, b) => a.stars - b.stars);

  let background: Blob | undefined;
  const files = unzipSync(oszBytes);
  const decoder = new BeatmapDecoder();
  for (const e of entries) {
    const bgPath = decoder.decodeFromString(e.osuText, { parseStoryboard: false }).events
      .backgroundPath;
    const bgBytes = bgPath ? findEntry(files, bgPath) : undefined;
    if (bgBytes) {
      background = new Blob([bgBytes.slice().buffer as ArrayBuffer]);
      break;
    }
  }
  return { background, difficulties };
}

export function loadFromOsu(osuText: string, audio: ArrayBuffer): LoadedBeatmap {
  const decoder = new BeatmapDecoder();
  const decoded = decoder.decodeFromString(osuText, { parseStoryboard: false });
  return toInternal(decoded, audio);
}
