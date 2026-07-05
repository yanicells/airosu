# airosu

Play osu! beatmaps with your hand. A webcam-controlled rhythm game: move your palm in
front of the camera to aim the cursor at circles and sliders — a Wii/Kinect-style way
to experience osu! maps in the browser.

![demo](docs/demo.gif) <!-- TODO: record a demo GIF -->

Everything runs client-side. Camera frames never leave your device.

## How to play

1. Get a beatmap: download any `.osz` from [osu.ppy.sh/beatmapsets](https://osu.ppy.sh/beatmapsets)
   (a free osu! account is required to download maps).
2. Drop the `.osz` on the home screen and pick a difficulty.
3. Calibrate: hold your hand up-left, then down-right — this maps a small hand-movement
   box to the whole playfield.
4. Play. **Relax mode** (default): the game auto-taps when your cursor is on the object.
   **Manual mode**: aim with your hand, tap with Z/X/Space.

## Browser requirements

- A webcam and camera permission.
- WebGL and Web Audio (any current Chrome, Edge, Firefox, or Safari).
- GPU acceleration recommended — hand tracking falls back to CPU with more latency.

## Local development

```bash
pnpm install
pnpm run dev     # dev server
pnpm test        # vitest unit tests
pnpm run lint    # oxlint
pnpm run build   # production build (dist/)
```

## Architecture

Five modules with hard boundaries: `src/cv/` (camera → smoothed cursor),
`src/beatmap/` (.osz → internal model), `src/game/` (pure-TS clock/judging/scoring),
`src/render/` (PixiJS stage), `src/ui/` (React shell). See
`docs/superpowers/specs/2026-07-04-airosu-design.md`.

## Licensing

- Code: MIT.
- Beatmap parsing uses [osu-parsers](https://github.com/kionell/osu-parsers) and
  [osu-classes](https://github.com/kionell/osu-classes) (MIT, by kionell). Gameplay
  rules (hit windows, approach timing, relax behavior) adapted from
  [osu!lazer](https://github.com/ppy/osu) (MIT, ppy).
- `game-assets/` bundles a few beatmaps (`.osz`) and a skin (`.osk`) so the app is
  playable out of the box. All songs, artwork, and skin graphics belong to their
  original artists, mappers, and skin creators — they are redistributed here for a
  fan project, not owned by this repo. If you own any of this content and want it
  removed, open an issue. You can also drop your own `.osz` at any time.
- This project is not affiliated with osu! or ppy.
