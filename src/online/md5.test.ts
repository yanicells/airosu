import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { listDifficulties } from '../beatmap/load';
import { md5Hex } from './md5';

const node = (text: string) => createHash('md5').update(text, 'utf8').digest('hex');

describe('md5Hex', () => {
  it('matches node for edge lengths and non-ASCII text', () => {
    for (const text of ['', 'a', 'x'.repeat(55), 'x'.repeat(56), 'x'.repeat(64), 'ö 日本 🎵']) {
      expect(md5Hex(text)).toBe(node(text));
    }
  });

  it('matches node for real .osu files', () => {
    const osz = readFileSync('game-assets/test-maps/444335 HO-KAGO TEA TIME - Kira Kira Days.osz');
    for (const { osuText } of listDifficulties(new Uint8Array(osz))) {
      expect(md5Hex(osuText)).toBe(node(osuText));
    }
  });
});
