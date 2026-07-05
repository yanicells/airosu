/** osu!web difficulty colour spectrum (star rating → hex colour). */
const STOPS: [number, string][] = [
  [0.1, '#4290fb'],
  [1.25, '#4fc0ff'],
  [2.0, '#4fffd5'],
  [2.5, '#7cff4f'],
  [3.3, '#f6f05c'],
  [4.2, '#ff8068'],
  [4.9, '#ff4e6f'],
  [5.8, '#c645b8'],
  [6.7, '#6563de'],
  [7.7, '#18158e'],
  [9.0, '#000000'],
];

function hex(n: number): string {
  return Math.round(n).toString(16).padStart(2, '0');
}

export function starColor(stars: number): string {
  if (stars <= STOPS[0][0]) return STOPS[0][1];
  if (stars >= STOPS[STOPS.length - 1][0]) return STOPS[STOPS.length - 1][1];
  for (let i = 1; i < STOPS.length; i++) {
    const [hi, colorHi] = STOPS[i];
    if (stars > hi) continue;
    const [lo, colorLo] = STOPS[i - 1];
    const t = (stars - lo) / (hi - lo);
    const a = parseInt(colorLo.slice(1), 16);
    const b = parseInt(colorHi.slice(1), 16);
    const mix = (shift: number) =>
      ((a >> shift) & 0xff) + (((b >> shift) & 0xff) - ((a >> shift) & 0xff)) * t;
    return `#${hex(mix(16))}${hex(mix(8))}${hex(mix(0))}`;
  }
  return STOPS[STOPS.length - 1][1];
}
