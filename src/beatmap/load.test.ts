import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';
import { listDifficulties, loadFromOsz } from './load';

const osz = new Uint8Array(readFileSync('444335 HO-KAGO TEA TIME - Kira Kira Days.osz'));

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

  it('sliders have endTime > time and a path', () => {
    const name = listDifficulties(osz)[0].difficultyName;
    const s = loadFromOsz(osz, name).objects.find((o) => o.kind === 'slider');
    if (s && s.kind === 'slider') {
      expect(s.endTime).toBeGreaterThan(s.time);
      expect(s.path.length).toBeGreaterThan(1);
    }
  });
});
