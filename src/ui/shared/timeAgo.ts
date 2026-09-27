const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 365 * 86_400_000],
  ['month', 30 * 86_400_000],
  ['week', 7 * 86_400_000],
  ['day', 86_400_000],
  ['hour', 3_600_000],
  ['minute', 60_000],
];

const format = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

/** "3 hours ago" style label for score rows; anything under a minute is "now". */
export function timeAgo(time: number, now = Date.now()): string {
  const elapsed = Math.max(0, now - time);
  for (const [unit, ms] of UNITS) {
    if (elapsed >= ms) return format.format(-Math.floor(elapsed / ms), unit);
  }
  return 'now';
}
