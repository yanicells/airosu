export interface Vec2 {
  x: number;
  y: number;
}

export interface BeatmapMeta {
  title: string;
  artist: string;
  /** difficulty name */
  version: string;
  audioFilename: string;
  creator: string;
  cs: number;
  od: number;
  ar: number;
  hp: number;
  /** most common BPM */
  bpm: number;
  /** playable length in ms */
  lengthMs: number;
}

export interface CircleObj {
  kind: 'circle';
  time: number;
  pos: Vec2;
}

export interface SliderObj {
  kind: 'slider';
  time: number;
  pos: Vec2;
  endTime: number;
  repeats: number;
  /** flattened path in playfield coords incl. start point, ~5px spacing */
  path: Vec2[];
}

export interface SpinnerObj {
  kind: 'spinner';
  time: number;
  endTime: number;
}

export type HitObject = CircleObj | SliderObj | SpinnerObj;

export interface LoadedBeatmap {
  meta: BeatmapMeta;
  /** sorted by time ascending */
  objects: HitObject[];
  /** encoded audio file bytes */
  audio: ArrayBuffer;
  /** background image if present */
  background?: Blob;
}

/** osu!pixel radius for circle size */
export const circleRadius = (cs: number): number => 54.4 - 4.48 * cs;

export const PLAYFIELD = { w: 512, h: 384 } as const;
