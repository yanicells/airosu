/**
 * Splits a pp-ordered map leaderboard around the play being shown, like lazer's results strip.
 * `replacedOsuId` removes the player's own entry when this play is now their best (it *is* that entry).
 */
export function placeCurrent<T extends { pp: number; osuId?: number }>(
  rows: T[],
  currentPp: number,
  replacedOsuId?: number,
): { before: T[]; after: T[] } {
  const others = rows.filter((row) => replacedOsuId === undefined || row.osuId !== replacedOsuId);
  return {
    before: others.filter((row) => row.pp >= currentPp),
    after: others.filter((row) => row.pp < currentPp),
  };
}
