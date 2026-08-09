export type SelectMenuMove = 'next' | 'previous' | 'first' | 'last';

export function moveOptionIndex(
  current: number,
  move: SelectMenuMove,
  count: number,
): number {
  if (count === 0) return -1;
  if (move === 'first') return 0;
  if (move === 'last') return count - 1;
  if (current < 0) return move === 'next' ? 0 : count - 1;
  return move === 'next' ? (current + 1) % count : (current - 1 + count) % count;
}
