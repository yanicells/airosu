/** ISO 3166-1 alpha-2 → flag emoji via regional indicator symbols. */
export function flagEmoji(code: string): string {
  if (!/^[a-zA-Z]{2}$/.test(code)) return '🏳️';
  return code.toUpperCase().replace(/./g, (c) => String.fromCodePoint(0x1f1a5 + c.charCodeAt(0)));
}
