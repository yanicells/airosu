import { describe, expect, it } from 'vitest';
import { placeCurrent } from './placement';

const rows = [
  { osuId: 1, pp: 300 },
  { osuId: 2, pp: 200 },
  { osuId: 3, pp: 150 },
  { osuId: 4, pp: 100 },
];

describe('placeCurrent', () => {
  it('puts better plays before and the rest after, keeping board order', () => {
    const { before, after } = placeCurrent(rows, 180);
    expect(before.map((row) => row.osuId)).toEqual([1, 2]);
    expect(after.map((row) => row.osuId)).toEqual([3, 4]);
  });

  it('ranks the current play above existing plays with equal pp, like the board (newer first)', () => {
    const { before, after } = placeCurrent(rows, 200);
    expect(before.map((row) => row.osuId)).toEqual([1]);
    expect(after.map((row) => row.osuId)).toEqual([2, 3, 4]);
  });

  it("drops the player's own board entry when this play replaced it", () => {
    const { before, after } = placeCurrent(rows, 250, 2);
    expect(before.map((row) => row.osuId)).toEqual([1]);
    expect(after.map((row) => row.osuId)).toEqual([3, 4]);
  });
});
