# airosu

Play osu! beatmaps with your hand. A webcam-controlled rhythm game: move your palm
(or index fingertip) in front of the camera to aim the cursor at circles and sliders —
a Wii/Kinect-style way to experience osu! maps in the browser.

The game runs entirely client-side; camera frames and audio never leave your device.
Signing in with osu! adds online scores, pp, leaderboards, and profiles ("airosu
online") — all optional, gameplay requires no sign-in. Initial startup needs network access for the hand-tracking model and runtime.

## How to play

1. Get a beatmap: download any `.osz` from [osu.ppy.sh/beatmapsets](https://osu.ppy.sh/beatmapsets)
   (a free osu! account is required to download maps).
2. Open Play and drop the `.osz` on song select and pick a difficulty. Uploads persist in your
   browser under "your maps".
3. Calibrate: drag the aim area to a comfortable position and resize its corners.
   Check the top-left and bottom-right targets, or choose "Use this area" to test
   the same cursor smoothing used in play. Arrow keys adjust focused controls;
   Shift moves faster. Choose palm or index fingertip on the song screen.
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
pnpm run verify:starter-maps   # starter-map manifest/rights audit
pnpm run check                # lint, tests, backend types, build and bundle budget
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
react-router pages). Map extraction, difficulty preparation, and supported hand
tracking run in workers; camera frames stay on-device. Hand tracking has a main-thread
fallback for browsers without worker graphics support. The Convex backend (`convex/`) handles osu!-only auth, map
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
- The temporary test pack is available with `pnpm dev` only. Production builds
  exclude it while `temporaryTestPack` is enabled. Imported maps still work in
  production. CI checks emitted archives and rejects any test-pack leak. Resolve
  redistribution rights before disabling that flag to ship licensed starter maps.
  Fixtures under `game-assets/test-maps/` remain local test data.
- This project is not affiliated with osu! or ppy.
