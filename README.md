# airosu

Play osu! beatmaps with your hand. A webcam-controlled rhythm game: move your palm
(or index fingertip) in front of the camera to aim the cursor at circles and sliders —
a Wii/Kinect-style way to experience osu! maps in the browser.

![demo](docs/demo.gif) <!-- TODO: record a demo GIF -->

The game runs entirely client-side; camera frames and audio never leave your device.
Signing in with osu! adds online scores, pp, leaderboards, and profiles ("airosu
online") — all optional, the game is fully playable signed out and offline.

## How to play

1. Get a beatmap: download any `.osz` from [osu.ppy.sh/beatmapsets](https://osu.ppy.sh/beatmapsets)
   (a free osu! account is required to download maps).
2. Drop the `.osz` on the home screen and pick a difficulty. Uploads persist in your
   browser under "your maps".
3. Calibrate: hold your hand up-left, then down-right — this maps a small hand-movement
   box to the whole playfield. Choose the palm (stable) or index fingertip (precise)
   cursor on the map card.
4. Play. **Relax mode** (default): the game auto-taps when your cursor is on the object.
   **Manual mode**: aim with your hand, tap with Z/X/Space.
5. Optional: sign in with osu! to submit scores, earn airosu pp, and climb the
   global/country leaderboards at `/leaderboard`; your profile lives at `/u/<osu id>`.

## Browser requirements

- A webcam and camera permission.
- WebGL and Web Audio (any current Chrome, Edge, Firefox, or Safari).
- GPU acceleration recommended — hand tracking falls back to CPU with more latency.

## Local development

```bash
pnpm install
pnpm run dev                  # dev server
pnpm test                     # vitest unit tests
pnpm run lint                 # oxlint
pnpm run build                # production build (dist/)
pnpm run verify:starter-maps  # starter-map manifest/rights audit
```

The online backend lives in `convex/`. `pnpm dlx convex dev` creates `.env.local`
(`CONVEX_DEPLOYMENT`, `VITE_CONVEX_URL`). Sign-in needs an osu! OAuth application
(callback `https://<deployment>.convex.site/api/auth/callback/osu`) with
`AUTH_OSU_ID`, `AUTH_OSU_SECRET`, and `SITE_URL` set via `pnpm dlx convex env set`.
Development and production use separate osu! OAuth applications.

## Architecture

Five client modules with hard boundaries: `src/cv/` (camera → smoothed cursor),
`src/beatmap/` (.osz → internal model, IndexedDB library), `src/game/` (pure-TS
clock/judging/scoring/pp), `src/render/` (PixiJS stage), `src/ui/` (React shell +
react-router pages). The Convex backend (`convex/`) handles osu!-only auth, map
registration (`.osu` text only), server-validated score submission with
authoritative pp, aggregate-backed leaderboards, and profiles. See
`docs/superpowers/specs/2026-07-04-airosu-design.md` and
`docs/superpowers/specs/2026-07-08-airosu-online-design.md`;
pp recalculation procedure: `docs/pp-rework-runbook.md`.

## Privacy and data storage

- Camera frames, audio, and `.osz` files stay in the browser. Uploaded mapsets are
  cached in your browser's IndexedDB only.
- Signing in stores your public osu! identity (id, username, avatar, country) and,
  per submitted play, the difficulty's `.osu` text plus hit statistics and settings
  (input mode, forgiveness, cursor anchor). Profiles and submitted plays are public.
- airosu never stores your osu! access token or email; ongoing osu! stat sync uses
  the app's own public-scope credentials.

## Licensing

- Code: MIT.
- Beatmap parsing uses [osu-parsers](https://github.com/kionell/osu-parsers) and
  [osu-classes](https://github.com/kionell/osu-classes) (MIT, by kionell). Gameplay
  rules (hit windows, approach timing, relax behavior) adapted from
  [osu!lazer](https://github.com/ppy/osu) (MIT, ppy).
- Bundled starter maps ship only with documented redistribution permission, listed
  in `game-assets/starter-maps/manifest.json` and verified in CI
  (`scripts/verify-starter-maps.mjs`). Other `.osz` files under `game-assets/test-maps/`
  are test fixtures only and never enter the production build. If you own bundled
  content and want it removed, open an issue.
- This project is not affiliated with osu! or ppy.
