# Gameplay freeze and cleanup follow-up — 2026-09-13

This milestone follows `feat/performance-and-aim-area` at `6746722` (PR #22).
The review covered every major directory; implementation keeps the existing
architecture and scoring rules. The original V1 plan is historical context,
not a request to rebuild completed features.

- [x] Trace camera, inference, audio-clock, and rendering lifecycles.
- [x] Inspect all client modules, Convex, tests, assets, documentation, and CI.
- [x] Remove proven redundant code and unused bundled skin assets.
- [x] Fix asynchronous selection, lifecycle, migration, and persistence bugs.
- [x] Measure rendering changes and compare rendered pixels.
- [x] Finish production browser checks and full validation.

## Safe deletions

- Removed the empty `init.md` and the unsupported “no layout shift” comment.
- Removed the test-only string constructor from `PpCounter`; tests explicitly
  prepare attributes, as the production map worker already does. Parser/ruleset
  instances are created only during preparation.
- Pruned the skin to its consumed files. No runtime dependency, public endpoint,
  historical PP fixture, generated Convex file, or useful lifecycle helper was
  found safe to delete. They remain.

## Simplifications and bug fixes

- A generation check immediately after `video.play()` prevents a cancelled
  camera session from starting an orphan tracker.
- Tracking uses a worker exclusively. GPU-to-CPU fallback remains inside the
  worker. Unsupported browsers and worker failures now show an error instead of
  switching to synchronous inference on the UI thread. This deliberately narrows
  compatibility; it does not guarantee support on every browser.
- Bitmap creation and inference share one in-flight guard. Closing during bitmap
  creation closes the eventual bitmap; startup/transfer errors terminate workers.
- Interrupted audio pauses gameplay visibly. Resume waits for the audio context
  to run before advancing gameplay. Terminal tracking failures stop the game.
- Standalone audio reads check both request and map identity before updating
  state, preventing an old read from restoring a previously selected map.
- Saved settings validate known types, ranges, and tap keys. Malformed skin
  spacing uses defaults. No validation dependency was added.
- Custom listboxes expose their active option to assistive technology and keep
  options out of the Tab sequence. Profile refresh attempts track the player ID.
- PP migration batches fail when difficulty attributes are missing, preserving
  retryability. Tests invoke the actual migration and then resume after adding
  attributes. The runbook explains resets for previously completed skipped runs.
- Leaderboard offsets reject invalid integers. Backfill initializes the country
  namespace and removes a known stale namespace. Unknown historical namespaces
  still require an explicit data repair; no live migration was run.

## Performance evidence

Measurements use local synthetic browser workloads, not physical-camera gameplay
or FPS guarantees. The exact cause on the reported device remains unverified.

- Before the changes, forcing main-thread inference produced a 159.4 ms animation
  gap during first detection while the worker comparison stayed at 17.5 ms.
  The main-thread path is now removed. Current real-worker checks measured warm
  detection at 10.3 ms median / 16.6 ms p95, with a 23 ms maximum animation gap
  and no gaps over 50 ms. Network/model startup took 4.34 seconds.
- Slider paths are retained only while their objects are visible and destroyed
  when those objects leave. Balls, spinners, alpha, and object order still update.
  Across 35 fixture difficulties, the heaviest visible sample contained 193 path
  points in two sliders: Make a Move / NiNo's Insane at 25,316 ms. Paired rendering
  runs at 1280×720 reduced median CPU from 0.4–1.4 ms to 0.2–0.5 ms. A sequence of
  22 frames, covering skinned/procedural sliders and spinners, matched baseline
  pixels exactly. Absolute timings varied with local browser/system conditions.
- Seven Kira difficulties now retain one shared 2,276,136-byte encoded audio
  buffer instead of seven copies, saving 13,656,816 bytes in that cache. Worker
  replies still clone their data; transferring retained buffers would detach them.
- The skin archive fell from 18,698,485 to 366,498 bytes (98% smaller). Its 35
  retained files expand to 551,908 bytes rather than 731 files / 24,442,702 bytes.
  Every retained file is byte-identical. Browser texture dimensions/resolutions
  and audio metadata match the original. Six-run local skin loading measurements
  were about 296 ms before pruning and 17.4 ms after. Parallel loading only
  improved the pruned case to 15.8 ms, so that extra code was discarded.

Unproven candidates remain unchanged: camera resizing, extra frame queues,
allocation pools, broader code splitting, and a renderer rewrite. The earlier
all-miss simulation was already inexpensive; changing scoring scans again was
not justified.

## CI and verification

The existing pinned actions, frozen lockfile, cache, timeout, and read-only
permissions remain. CI now checks test and script types, requires a backend URL
at build time, and opens the production build in Chromium. Playwright is the
only added development dependency; its installed version was verified and pinned.
Build URL validation uses Convex's existing client validation without connecting.
Missing, malformed, non-HTTP, and HTTP-action URLs fail before output is emitted.

Browser tests use generated maps/audio and a synthetic camera, block backend
connections, and replace only the tracking worker. Separate local checks exercise
real MediaPipe. Test maps remain excluded from production; no deployment workflow,
Vercel CLI action, merge, score submission, or production data change is included.

The emitted production tracking worker also initialized with the GPU delegate
and returned a detection result from a transferred synthetic `ImageBitmap`.

`pnpm run check` passed all 147 tests across 33 files, lint, frontend/backend
typechecks, and build/asset checks. `CI=true pnpm run test:browser` passed all
four browser tests against the build with a placeholder `VITE_CONVEX_URL`.
The stale-audio browser regression also failed against a temporary build of the
original `AudioPicker`, then passed with the fix. Production entry JavaScript is
368,594 bytes; both workers are emitted and no test-map archive is present in the production build.

Physical-camera accuracy, sustained thermal behavior,
Safari/Firefox, and production authentication/score submission remain untested.
