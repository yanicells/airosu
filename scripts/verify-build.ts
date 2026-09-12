import { readFile, readdir, stat } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import { join } from 'node:path';

const html = await readFile('dist/index.html', 'utf8');
const entryPath = html.match(/<script[^>]+src="([^"]+\.js)"/)?.[1];
if (!entryPath) throw new Error('Build has no JavaScript entry');
const entry = await readFile(join('dist', entryPath));
const gzipBytes = gzipSync(entry).byteLength;
if (entry.byteLength > 425_000 || gzipBytes > 130_000) {
  throw new Error(
    `Entry bundle exceeds budget: ${entry.byteLength} bytes, ${gzipBytes} gzip bytes`,
  );
}
const scripts = (await readdir('dist/assets')).filter((file) => file.endsWith('.js'));
for (const worker of ['map.worker-', 'handTracker.worker-']) {
  if (!scripts.some((file) => file.startsWith(worker))) throw new Error(`Missing ${worker} bundle`);
}
for (const file of scripts) {
  if ((await stat(join('dist/assets', file))).size > 500_000) {
    throw new Error(`JavaScript chunk exceeds 500 kB: ${file}`);
  }
}
console.log(
  `verified bundle budgets: entry ${entry.byteLength} bytes (${gzipBytes} gzip), ${scripts.length} chunks`,
);
