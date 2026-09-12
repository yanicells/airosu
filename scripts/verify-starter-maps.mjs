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
// A populated pack must contain two or three maps.
if (manifest.maps.length > 3) fail('expected at most 3 maps');
if (manifest.maps.length === 1) fail('expected 2-3 maps once populated');

const diskFiles = (await readdir(dir)).filter((name) => name.endsWith('.osz')).sort();
const listedFiles = manifest.maps.map((entry) => entry.file).sort();
if (JSON.stringify(diskFiles) !== JSON.stringify(listedFiles)) fail('manifest/file mismatch');

// Explicit temporary test pack requested by the owner on 2026-09-07.
// Integrity checks still apply; this is not a claim of redistribution rights.
if (manifest.temporaryTestPack) console.log('Temporary test pack enabled; rights review pending before production release.');

let total = 0;
const ids = new Set();
for (const entry of manifest.maps) {
  if (!/^[a-z0-9-]+$/.test(entry.id) || ids.has(entry.id)) fail(`bad id ${entry.id}`);
  ids.add(entry.id);
  if (entry.file !== `${entry.id}.osz`) fail(`bad file ${entry.file}`);
  if (entry.evidence !== `LICENSES/${entry.id}.md`) fail(`bad evidence path ${entry.id}`);
  if (!entry.sourceUrl?.startsWith('https://')) fail(`bad source for ${entry.id}`);
  for (const field of ['artist', 'title', 'license', 'attribution', 'evidence']) {
    if (typeof entry[field] !== 'string' || !entry[field].trim()) fail(`${entry.id}: ${field}`);
  }
  if (!manifest.temporaryTestPack && /pending|provisional|unknown|tbd/i.test(entry.license)) fail(`${entry.id}: permission not documented`);
  const evidence = await readFile(join(dir, entry.evidence), 'utf8');
  if (!evidence.trim() || (!manifest.temporaryTestPack && /pending|provisionally bundled/i.test(evidence))) {
    fail(`${entry.id}: permission evidence incomplete`);
  }
  const bytes = await readFile(join(dir, entry.file));
  const hash = createHash('sha256').update(bytes).digest('hex');
  if (hash !== entry.sha256 || bytes.byteLength !== entry.byteLength) fail(`${entry.id}: hash/size`);
  const names = Object.keys(unzipSync(bytes)).map((name) => name.toLowerCase());
  if (!names.some((name) => name.endsWith('.osu'))) fail(`${entry.id}: no .osu`);
  if (names.some((name) => /\.(mp4|avi|flv|mov|webm)$/.test(name))) fail(`${entry.id}: video`);
  total += bytes.byteLength;
}
if (total > 15_000_000) fail('15 MB budget exceeded');
console.log(`verified ${manifest.maps.length} starter maps (${total} bytes)`);

// Check emitted archives too: a new public/ asset or broad import glob must not
// bypass the source manifest. Vite hashes filenames, so compare file contents.
if (process.argv.includes('--dist')) {
  const dist = join(root, 'dist');
  const approved = new Set(manifest.maps.map((entry) => entry.sha256));
  const files = await readdir(dist, { recursive: true });
  for (const file of files.filter((name) => /\.osz$/i.test(name))) {
    const bytes = await readFile(join(dist, file));
    const hash = createHash('sha256').update(bytes).digest('hex');
    if (manifest.temporaryTestPack) fail(`test pack leaked into production: ${file}`);
    if (!approved.has(hash)) fail(`unapproved production archive: ${file}`);
  }
  console.log('verified production archives');
}
