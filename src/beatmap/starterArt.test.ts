import { strToU8, zipSync } from 'fflate';
import { describe, expect, it } from 'vitest';
import { starterBackground } from './starterArt';

const osu = (events: string) =>
  strToU8(`osu file format v14\n\n[Events]\n//Background and Video events\n${events}\n\n[TimingPoints]\n0,0,4,2,0,100,1,0\n`);

describe('starterBackground', () => {
  it('returns the image referenced by the background event, matching case-insensitively', () => {
    const osz = zipSync({
      'map.osu': osu('0,0,"BG Art.JPG",0,0'),
      'bg art.jpg': new Uint8Array([1, 2, 3]),
      'other.png': new Uint8Array([9]),
    });
    expect(starterBackground(osz)).toEqual({ name: 'bg art.jpg', bytes: new Uint8Array([1, 2, 3]) });
  });

  it('ignores archives whose background is missing or not an image', () => {
    expect(starterBackground(zipSync({ 'map.osu': osu('0,0,"missing.jpg",0,0') }))).toBeUndefined();
    expect(starterBackground(zipSync({ 'map.osu': osu('Video,0,"clip.mp4"'), 'clip.mp4': new Uint8Array([1]) }))).toBeUndefined();
  });
});
