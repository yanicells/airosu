# Performance and aim-area audit — 2026-09-12

Based on `11057d6` (`codex/lazer-menu-and-scores`, PR #21). Working tree was clean. This is one follow-up milestone, stacked on the existing UI work.

- [x] Read the design, V1 plan, previous audit, and inspect the major directories.
- [x] Establish baseline: 119 tests, production build; entry JavaScript 553.93 kB (167.64 kB gzip).
- [x] Move archive parsing and star calculations off the UI thread; reuse selected archives.
- [x] Reduce CV latency, verify frame scheduling and resource cleanup.
- [x] Add movable, resizable aim area with corner targets and live calibration preview.
- [x] Remove proven dead code and repeated hot-path work; strengthen CI.
- [x] Run focused regressions, full checks, browser verification, and record limitations.

## Changes and safety evidence

| Area inspected | Findings, changes, and retained behavior |
| --- | --- |
| `src/beatmap/` | Archive decoding, star ratings, thumbnails, and timed pp preparation now run in one worker. The selected archive reuses extraction and parsed difficulties; starter downloads and thumbnail requests share pending work. Replaced the old synchronous load/preview wrappers with an archive interface. Fixture metadata, stars, audio, unsupported modes, cache reuse, and worker recovery have regression coverage. |
| `src/cv/` | MediaPipe runs in a worker where supported, with GPU/CPU and main-thread compatibility fallbacks. Camera callbacks submit at most one inference at a time and skip repeated frames. Zero smoothing now bypasses filtering; motion-sensitive filtering reduces lag. Tests cover dropped busy frames, start/stop races, tracking loss, and calibration mapping. Stopping during initialization immediately releases camera tracks. |
| `src/game/` | Monotonic head/active-object cursors avoid rescanning resolved history. Slider tracking removes finished entries; slider geometry is cached with binary search. Live pp uses binary search over prepared attributes. Existing scoring and pp compatibility tests remain; regressions cover overlapping objects and shared path geometry. |
| `src/render/` | Removed the always-false `judged` render field and its unreachable branches; render objects already contain only unresolved indices. Retained Pixi render layers and skin-dependent drawing. |
| `src/skin/` | Removed unused `comboPrefix` parsing and two corresponding assertions after checking all consumers. Retained archive, image, audio, font, and texture lifecycle handling. |
| `src/ui/` | Inspected app state, home/song selection, calibration, play, results, settings, leaderboard, profile, shared UI, and hooks. Added draggable/keyboard-adjustable aim area and four resize handles; both corner targets follow the chosen rectangle. Preview uses the gameplay cursor filter. Map loading rejects stale completions and disables Play while pending. Camera video stays attached in focus mode. Removed obsolete song/results CSS after checking static and dynamic class consumers. |
| `src/online/`, `convex/` | Inspected client setup, auth, maps, scores, ranking/profile queries, schema, migrations, validators, and scoring. Retained idempotency, authorization checks, generated files, compatibility fields, and meaningful backend tests. Removed only the stock Convex README; root setup documentation remains. Added backend typechecking to the required check command. |
| `scripts/`, `.github/`, root configuration | A shared `pnpm run check` gates lint, tests, backend types, and production build. CI preserves the `ci` check name, adds a timeout, immutable action pins, merge-queue support, and monthly grouped action updates. New build checks enforce entry/chunk budgets and emitted worker bundles. No deployment automation was added. |
| `game-assets/` (including `test-maps/`), `public/` | Inspected manifests, integrity checks, licenses, fixture references, skin inventory, and public assets. Temporary starter maps remain available locally but are omitted from production. A negative check proves leaked `.osz` archives fail the build. Fixtures, skin assets, and public branding remain in source. |
| `docs/`, `.agents/`, `.claude/` | Reviewed the original spec/plan, existing audit, pp migration runbook, design references, and project instructions. Retained historical decisions and migration documentation. This follow-up audit records the new scope. |

Removed the five-line `calibrationSampling` adapter and its implementation-mirroring tests: selected rectangle geometry is now authoritative, and calibration tests cover actual corner reachability. Three filter-constant assertions were replaced by behavioral scheduling and responsiveness checks. Functional helpers, backend regression tests, and legacy pp compatibility coverage were retained.

## Local measurements

Measurements are observations from this machine, not cross-device guarantees. Temporary measurement pages and benchmark tests were removed after verification.

| Measurement | Before | After |
| --- | --- | --- |
| Production entry JavaScript (Vite report) | 553.93 kB / 167.64 kB gzip | 367.56 kB / 112.59 kB gzip; about 34% smaller |
| Temporary starter archives in production | 10,679,607 bytes | 0 bytes; all three remain available in local development |
| Kira fixture preview plus first map | 123.6 ms synchronous UI-thread work | 119.7 ms worker round trip, with eight animation frames rendered while loading |
| Selected archive difficulty switch | Re-extraction and reparsing | 1.8 ms first switch; 0.7 ms cached switch |
| Synthetic 5,000-circle session, about 31,000 ticks/state reads | 274.52 ms | 6.18 ms |
| 100,000 slider positions on a 200-point path | 148.58 ms | 15.56 ms |

The map comparison used the same fixture and verified matching difficulty names and stars. The first load still requires decompression and star calculations; the improvement is UI responsiveness and reuse, not removal of that work. Gameplay timings isolate CPU functions rather than measuring game FPS.

A real MediaPipe GPU worker processed synthetic blank video: 30 warm detections had a 7.2 ms median and 14.5 ms p95, with 17 animation frames rendered during that run. Initial network/model startup varied substantially (about 3.75 seconds cold and 169 ms on a subsequent initialization). This does not measure hand accuracy or camera-to-screen latency. Synthetic cursor tests bound default-filter movement lag below 22 playfield pixels and stationary jitter below 0.5 pixels for both anchors.

## Validation

- `pnpm run check`: **131 tests across 29 files**, lint, frontend/backend typechecks, fixture verification, production build, and bundle checks passed. The final empty-library copy change also passed lint and production build.
- New regressions were first run against the failing behavior for pure logic changes. Existing scoring, parsing, pp, backend, and lifecycle coverage remains green.
- Production build emits both map and tracking workers. Direct browser execution of the compiled workers loaded the Kira fixture (seven difficulties) and initialized MediaPipe GPU inference successfully.
- Browser-tested local song loading and difficulty selection; stars and title matched the fixture. Production home/menu/song selection rendered, with import available and no temporary songs bundled.
- Browser-tested calibration using a synthetic camera stream: keyboard resize, pointer move/resize, corner target alignment, test mode, and Continue preserved the chosen box. At a 1280×720 viewport, controls remained visible. The camera preview preserved the video aspect ratio.
- Negative build checks rejected an intentionally leaked `.osz` and a 500,001-byte JavaScript chunk. Both temporary files were removed.
- No dependency installation or lockfile changes were needed; installed APIs were inspected. No Convex data mutation, migration, merge, or deployment was performed.

## Limits and follow-up verification

Real-hand gameplay, sustained thermal performance, Safari/Firefox worker fallbacks, low-end hardware, and live account/score submission were not exercised. Calibration choices currently persist within app state, matching the existing session lifecycle; reloading still requires calibration. MediaPipe assets remain remotely fetched on first use, so cold startup depends on the network. The bundled skin remains an approximately 18.7 MB lazy-loaded archive and is a separate possible first-play cost.

The current temporary test pack is intentionally development-only. Production users import their own maps until the manifest contains reviewed distributable starter maps.

Implementation references: [MediaPipe hand tracking for web](https://developers.google.com/edge/mediapipe/solutions/vision/hand_landmarker/web_js), [video frame callbacks](https://developer.mozilla.org/en-US/docs/Web/API/HTMLVideoElement/requestVideoFrameCallback), and [One Euro filter](https://gery.casiez.net/1euro/).
