import { describe, it, expect } from 'vitest';
import { BeatmapDecoder } from 'osu-parsers';
import { toInternal } from './adapter';

const osu = (sliderLine: string) => `osu file format v14

[General]
AudioFilename: audio.mp3
Mode: 0

[Metadata]
Title:t
Artist:a
Creator:c
Version:v

[Difficulty]
HPDrainRate:5
CircleSize:4
OverallDifficulty:5
ApproachRate:5
SliderMultiplier:1
SliderTickRate:1

[TimingPoints]
0,500,4,2,0,100,1,0

[HitObjects]
${sliderLine}
`;

const decode = (text: string) =>
  toInternal(
    new BeatmapDecoder().decodeFromString(text, { parseStoryboard: false }),
    text,
    new ArrayBuffer(0),
  );

describe('toInternal sliders', () => {
  it('maps one reverse to two spans', () => {
    // slides=2 (one reverse), length 100 at SV 1 → 500 ms per span
    const map = decode(osu('100,100,1000,2,0,L|200:100,2,100'));
    const s = map.objects[0];
    expect(s.kind).toBe('slider');
    if (s.kind !== 'slider') return;
    expect(s.spans).toBe(2);
    expect(s.endTime - s.time).toBeCloseTo(1000);
  });

  it('maps a plain slider to one span', () => {
    const map = decode(osu('100,100,1000,2,0,L|200:100,1,100'));
    const s = map.objects[0];
    expect(s.kind === 'slider' && s.spans).toBe(1);
  });
});
