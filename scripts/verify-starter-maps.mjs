import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { unzipSync } from 'fflate';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dir = join(root, 'game-assets/starter-maps');
const manifest = JSON.parse(await readFile(join(dir, 'manifest.json'), 'utf8'));
const fail = (message) => { throw new Error(`starter maps: ${message}`); };
if (manifest.version !== 1 || !Array.isArray(manifest.maps)) fail('invalid manifest');
// Empty manifest is allowed until licensed assets land (Human prerequisite 5);
// once populated, 2–3 maps are required.
if (manifest.maps.length > 3) fail('expected at most 3 maps');
if (manifest.maps.length === 1) fail('expected 2-3 maps once populated');

const diskFiles = (await readdir(dir)).filter((name) => name.endsWith('.osz')).sort();
const listedFiles = manifest.maps.map((entry) => entry.file).sort();
if (JSON.stringify(diskFiles) !== JSON.stringify(listedFiles)) fail('manifest/file mismatch');

let total = 0;
const ids = new Set();
for (const entry of manifest.maps) {
  if (!/^[a-z0-9-]+$/.test(entry.id) || ids.has(entry.id)) fail(`bad id ${entry.id}`);
  ids.add(entry.id);
  if (!/^[a-z0-9-]+\.osz$/.test(entry.file)) fail(`bad file ${entry.file}`);
  if (!/^LICENSES\/[a-z0-9-]+\.md$/.test(entry.evidence)) fail(`bad evidence path ${entry.id}`);
  if (!/^https:\/\//.test(entry.sourceUrl)) fail(`bad source for ${entry.id}`);
  for (const field of ['artist', 'title', 'license', 'attribution', 'evidence']) {
    if (typeof entry[field] !== 'string' || !entry[field].trim()) fail(`${entry.id}: ${field}`);
  }
  const bytes = await readFile(join(dir, entry.file));
  const hash = createHash('sha256').update(bytes).digest('hex');
  if (hash !== entry.sha256 || bytes.byteLength !== entry.byteLength) fail(`${entry.id}: hash/size`);
  await readFile(join(dir, entry.evidence), 'utf8');
  const names = Object.keys(unzipSync(bytes)).map((name) => name.toLowerCase());
  if (!names.some((name) => name.endsWith('.osu'))) fail(`${entry.id}: no .osu`);
  if (names.some((name) => /\.(mp4|avi|flv|mov|webm)$/.test(name))) fail(`${entry.id}: video`);
  total += bytes.byteLength;
}
if (total > 15_000_000) fail('15 MB budget exceeded');
console.log(`verified ${manifest.maps.length} starter maps (${total} bytes)`);
