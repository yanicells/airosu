import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { listDifficulties } from './load';
import { computeMapAttributes } from './attributes';
import { MAP_LIMITS, MapLimitError } from './limits';

const osu = (difficulty: string, hitObjects: string) => `osu file format v14

[General]
AudioFilename: audio.mp3
Mode: 0

[Difficulty]
${difficulty}

[TimingPoints]
0,500,4,2,0,100,1,0

[HitObjects]
${hitObjects}
`;
const normal =
  'CircleSize:4\nApproachRate:5\nOverallDifficulty:5\nHPDrainRate:5\nSliderMultiplier:1\nSliderTickRate:1';

describe('map limits', () => {
  it('rejects a tiny file declaring a million slider spans before decoding it', () => {
    const text = osu(normal, '100,100,1000,2,0,L|200:100,1000000,100');
    expect(new TextEncoder().encode(text).byteLength).toBeLessThan(400);
    expect(() => computeMapAttributes(text)).toThrow(MapLimitError);
  });

  it('rejects maps whose slider ticks exceed the budget', () => {
    // 1000 spans × 20,000px at 0.5px tick spacing
    const dense = normal
      .replace('SliderMultiplier:1', 'SliderMultiplier:0.4')
      .replace('SliderTickRate:1', 'SliderTickRate:8');
    const text = osu(dense, `100,100,1000,2,0,L|200:100,${MAP_LIMITS.sliderSpans},2000`);
    expect(() => computeMapAttributes(text)).toThrow(/ticks/);
  });

  it('rejects out-of-range difficulty values', () => {
    const text = osu(normal.replace('CircleSize:4', 'CircleSize:1000'), '100,100,1000,1,0');
    expect(() => computeMapAttributes(text)).toThrow(/CircleSize/);
  });

  it('rejects absurdly long spinners', () => {
    const text = osu(normal, '256,192,1000,12,0,2000000000');
    expect(() => computeMapAttributes(text)).toThrow(/spinner/);
  });

  it('accepts real maps', () => {
    const osz = new Uint8Array(
      readFileSync('game-assets/test-maps/444335 HO-KAGO TEA TIME - Kira Kira Days.osz'),
    );
    for (const { osuText } of listDifficulties(osz)) {
      expect(() => computeMapAttributes(osuText)).not.toThrow();
    }
  });
});
