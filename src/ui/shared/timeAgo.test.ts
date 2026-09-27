import { describe, expect, it } from 'vitest';
import { timeAgo } from './timeAgo';

const now = Date.UTC(2026, 8, 27, 12);

describe('timeAgo', () => {
  it('rounds down to the largest whole unit like lazer score rows', () => {
    expect(timeAgo(now - 30_000, now)).toBe('now');
    expect(timeAgo(now - 4 * 60_000, now)).toBe('4 minutes ago');
    expect(timeAgo(now - 3 * 3_600_000 - 59 * 60_000, now)).toBe('3 hours ago');
    expect(timeAgo(now - 400 * 86_400_000, now)).toBe('last year');
  });
});
