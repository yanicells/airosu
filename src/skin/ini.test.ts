import { describe, it, expect } from 'vitest';
import { parseSkinIni } from './ini';

const SAMPLE = `[General]
Name: Aristia(Edit)+trail
[Colours]
Combo1: 26,116,242
Combo2: 164,32,240
Combo3: 37,185,239
[Fonts]
HitCirclePrefix: default
HitCircleOverlap: 6
ScorePrefix: num\\berlin
ScoreOverlap: 4
ComboPrefix: num\\berlin
`;

describe('parseSkinIni', () => {
  it('parses combo colours in order as 0xRRGGBB', () => {
    const ini = parseSkinIni(SAMPLE);
    expect(ini.comboColors).toEqual([0x1a74f2, 0xa420f0, 0x25b9ef]);
  });

  it('normalizes font prefixes to forward slashes', () => {
    const ini = parseSkinIni(SAMPLE);
    expect(ini.scorePrefix).toBe('num/berlin');
    expect(ini.comboPrefix).toBe('num/berlin');
    expect(ini.scoreOverlap).toBe(4);
  });

  it('falls back to defaults when sections are missing', () => {
    const ini = parseSkinIni('');
    expect(ini.comboColors.length).toBeGreaterThan(0);
    expect(ini.scorePrefix).toBe('score');
    expect(ini.comboPrefix).toBe('score');
    expect(ini.scoreOverlap).toBe(0);
  });

  it('ignores malformed colour lines', () => {
    const ini = parseSkinIni('[Colours]\nCombo1: nonsense\nCombo2: 1,2\nCombo3: 10,20,30');
    expect(ini.comboColors).toEqual([0x0a141e]);
  });
});
