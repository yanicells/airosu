import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';
import { listDifficulties, loadFromOsz, oszBackground, previewOsz } from './load';

const osz = new Uint8Array(
  readFileSync('game-assets/maps/444335 HO-KAGO TEA TIME - Kira Kira Days.osz'),
);

describe('osz loading', () => {
  it('lists difficulties', () => {
    const diffs = listDifficulties(osz);
    expect(diffs.length).toBeGreaterThan(0);
  });

  it('parses a difficulty into internal model', () => {
    const name = listDifficulties(osz)[0].difficultyName;
    const map = loadFromOsz(osz, name);
    expect(map.objects.length).toBeGreaterThan(10);
    expect(map.objects[0].time).toBeGreaterThanOrEqual(0);
    expect(map.meta.audioFilename.toLowerCase()).toMatch(/\.(mp3|ogg)$/);
    expect(map.audio.byteLength).toBeGreaterThan(100_000);
    const times = map.objects.map((o) => o.time);
    expect([...times].sort((a, b) => a - b)).toEqual(times);
    for (const o of map.objects)
      if (o.kind === 'circle') {
        expect(o.pos.x).toBeGreaterThanOrEqual(0);
        expect(o.pos.x).toBeLessThanOrEqual(512);
      }
  });

  it('assigns combo indices that only step up on new combos', () => {
    const name = listDifficulties(osz)[0].difficultyName;
    const map = loadFromOsz(osz, name);
    let last = -1;
    for (const o of map.objects) {
      expect(o.comboIndex).toBeGreaterThanOrEqual(0);
      expect(o.comboIndex - last).toBeLessThanOrEqual(1);
      last = Math.max(last, o.comboIndex);
    }
    expect(last).toBeGreaterThan(0);
  });

  it('numbers objects within each combo starting at 1', () => {
    const name = listDifficulties(osz)[0].difficultyName;
    const map = loadFromOsz(osz, name);
    let prev: { comboIndex: number; comboNumber: number } | null = null;
    for (const o of map.objects) {
      if (prev && o.comboIndex === prev.comboIndex)
        expect(o.comboNumber).toBe(prev.comboNumber + 1);
      else expect(o.comboNumber).toBe(1);
      prev = o;
    }
  });

  it('exposes display stats: hp, bpm, length, creator', () => {
    const name = listDifficulties(osz)[0].difficultyName;
    const map = loadFromOsz(osz, name);
    expect(map.meta.hp).toBeGreaterThan(0);
    expect(map.meta.hp).toBeLessThanOrEqual(10);
    expect(map.meta.bpm).toBeGreaterThan(50);
    expect(map.meta.bpm).toBeLessThan(400);
    expect(map.meta.lengthMs).toBeGreaterThan(30_000);
    expect(map.meta.creator.length).toBeGreaterThan(0);
  });

  it('previews a mapset with stars ascending and a background', () => {
    const preview = previewOsz(osz);
    expect(preview.difficulties.length).toBeGreaterThan(3);
    const stars = preview.difficulties.map((d) => d.stars);
    expect([...stars].sort((a, b) => a - b)).toEqual(stars);
    for (const d of preview.difficulties) expect(d.stars).toBeGreaterThan(0.5);
    expect(preview.background).toBeInstanceOf(Blob);
  });

  it('extracts just the background without computing stars', () => {
    const bg = oszBackground(osz);
    expect(bg).toBeInstanceOf(Blob);
    expect(bg!.size).toBeGreaterThan(1000);
  });

  it('sliders have endTime > time and a path', () => {
    const name = listDifficulties(osz)[0].difficultyName;
    const s = loadFromOsz(osz, name).objects.find((o) => o.kind === 'slider');
    if (s && s.kind === 'slider') {
      expect(s.endTime).toBeGreaterThan(s.time);
      expect(s.path.length).toBeGreaterThan(1);
    }
  });
});
