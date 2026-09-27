import { unzipSync } from 'fflate';

const image = /\.(jpe?g|png|webp|bmp)$/i;
const decoder = new TextDecoder();

/**
 * Finds the background image an .osz points at through its `[Events]` `0,0,"file"` line.
 * Runs at build time (vite.config) so the song carousel can show artwork without
 * downloading whole archives.
 */
export function starterBackground(osz: Uint8Array): { name: string; bytes: Uint8Array } | undefined {
  const files = unzipSync(osz, { filter: (e) => /\.osu$/i.test(e.name) || image.test(e.name) });
  const byName = new Map(Object.entries(files).map(([name, bytes]) => [name.toLowerCase(), { name, bytes }]));
  for (const [name, bytes] of Object.entries(files)) {
    if (!/\.osu$/i.test(name)) continue;
    const events = decoder.decode(bytes).split(/^\[Events\]/m)[1]?.split(/^\[/m)[0] ?? '';
    const path = events.match(/^\s*0\s*,\s*0\s*,\s*"?([^"\r\n]+?)"?\s*(,|$)/m)?.[1];
    const found = path && byName.get(path.replace(/\\/g, '/').toLowerCase());
    if (found && image.test(found.name)) return found;
  }
  return undefined;
}
