# Starter-map license evidence

Every starter `.osz` in `game-assets/starter-maps/` needs one evidence file
here, named `<map-id>.md`, documenting explicit permission to redistribute the
audio, background, hitsounds, and beatmap in airosu.

An osu! download page or Featured Artist listing alone is **not** sufficient
evidence for third-party bundling. Acceptable evidence: a license text (e.g.
CC-BY) covering all assets, or direct written permission from the rights
holders, quoted or linked with dates.

Each evidence file should contain:

- the exact license or permission grant
- who granted it, and when
- links to the source (HTTPS)
- the required attribution text

After adding a map + evidence, add its entry to `../manifest.json` with the
computed SHA-256 (`shasum -a 256 <file>`) and byte length (`wc -c <file>`),
then run `pnpm run verify:starter-maps`.
