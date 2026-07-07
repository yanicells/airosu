// Adapted concepts from kionell/osu-parsers and ppy/osu (both MIT).
import type { Beatmap } from 'osu-classes';
import { SlidableObject, SpinnableObject } from 'osu-parsers';
import type { HitObject, LoadedBeatmap, Vec2 } from './model';

const PATH_STEP = 5; // osu!px between sampled slider path points

function sliderPath(slider: SlidableObject): Vec2[] {
  const start = slider.startPosition;
  const distance = slider.path.distance;
  const points: Vec2[] = [];
  const steps = Math.max(1, Math.ceil(distance / PATH_STEP));
  for (let i = 0; i <= steps; i++) {
    const rel = slider.path.curvePositionAt(i / steps, 1);
    points.push({ x: start.x + rel.x, y: start.y + rel.y });
  }
  return points;
}

export function toInternal(
  decoded: Beatmap,
  rawOsu: string,
  audio: ArrayBuffer,
  background?: Blob,
): LoadedBeatmap {
  const objects: HitObject[] = [];

  let comboIndex = -1;
  let comboNumber = 0;
  for (const obj of decoded.hitObjects) {
    const isNewCombo = (obj as unknown as { isNewCombo?: boolean }).isNewCombo ?? false;
    if (isNewCombo || comboIndex === -1) {
      comboIndex++;
      comboNumber = 0;
    }
    comboNumber++;

    if (obj instanceof SlidableObject) {
      objects.push({
        kind: 'slider',
        time: obj.startTime,
        pos: { x: obj.startPosition.x, y: obj.startPosition.y },
        endTime: obj.endTime,
        repeats: obj.repeats,
        path: sliderPath(obj),
        comboIndex,
        comboNumber,
      });
    } else if (obj instanceof SpinnableObject) {
      objects.push({
        kind: 'spinner',
        time: obj.startTime,
        endTime: obj.endTime,
        comboIndex,
        comboNumber,
      });
    } else {
      const pos = (obj as unknown as { startPosition?: { x: number; y: number } }).startPosition;
      objects.push({
        kind: 'circle',
        time: obj.startTime,
        pos: pos ? { x: pos.x, y: pos.y } : { x: 256, y: 192 },
        comboIndex,
        comboNumber,
      });
    }
  }

  objects.sort((a, b) => a.time - b.time);

  return {
    meta: {
      title: decoded.metadata.title,
      artist: decoded.metadata.artist,
      version: decoded.metadata.version,
      audioFilename: decoded.general.audioFilename,
      creator: decoded.metadata.creator,
      cs: decoded.difficulty.circleSize,
      od: decoded.difficulty.overallDifficulty,
      ar: decoded.difficulty.approachRate,
      hp: decoded.difficulty.drainRate,
      bpm: decoded.bpm,
      lengthMs: decoded.length,
    },
    rawOsu,
    objects,
    audio,
    background,
  };
}
