# Repository audit — 2026-09-07

The audit branch is based on `cc13125` (`origin/v2.6-ui-cv-polish`), the newest remote branch after fetching and pulling. The existing stack ends at PR #19. Local `main` was five commits ahead of its remote and was preserved. This audit does not merge the existing stack or deploy the backend.

## Completed scope

- [x] Inspect every major directory and trace consumers before removing code.
- [x] Reproduce targeted logic and resource-lifecycle failures before fixing them.
- [x] Reduce initial JavaScript and repeated archive/render work.
- [x] Improve CI coverage and production asset checks.
- [x] Run focused tests, full tests, lint, backend type checking, and production build.
- [x] Verify local browser rendering, resize, cleanup, standalone audio, and synthetic game completion.

| Directory | Inspection and outcome |
| --- | --- |
| `src/beatmap/` | Reviewed archive loading, adapter, stars/attributes, IndexedDB transactions, and starter assets. Each load/preview/background operation now extracts once instead of twice. Removed the `bundled.ts` compatibility alias and migrated all callers. |
| `src/cv/` | Reviewed capture, tracker fallback, filters, palm/fingertip selection, and calibration. Shared in-flight startup prevents duplicate cameras; failure and cancellation release resources. Camera sessions stop on home/settings and app unmount; results retain the session for immediate retry. |
| `src/game/` | Reviewed timing, judgments, slider tracking, scoring, audio, and pp. Expired Relax targets now miss even when the cursor arrives on target. Audio contexts close on decode failure and stop only once. The pp formula and historical compatibility tests remain unchanged. |
| `src/render/` | Reviewed procedural/skinned layers, bursts, HUD, digit pooling, and stage ownership. Removed the unused resize API, subscribed layout to renderer resize, and render through the existing game frame loop instead of a second application ticker. Unchanged digit strings no longer rebuild sprite layout. |
| `src/skin/` | Reviewed archive resolution, font fallbacks, textures, and sound decoding. Retained functional format adapters and the existing skin; no speculative asset pruning. |
| `src/ui/` | Reviewed home/upload/library, calibration, play/pause, results, settings, shared controls, navigation, leaderboard, and profile. Split loading logic from the home component; reuse preview difficulty counts. Deferred calibration/play bundles. Removed inert recenter handling and its misleading tip. Calibration now applies selected cursor settings before sampling. Manual hits reach frame effects and live pp; held-key repeats are ignored. Cancel delayed completion on cleanup and release partially initialized stages exactly once. Added missing standalone `.osu` audio attachment. |
| `src/online/` | Reviewed automatic score submission, retry identity, error states, and result integration. Kept the existing idempotent play ID contract. |
| `convex/` | Reviewed schema/index consumers, authentication, map registration/storage cleanup, score validation, aggregates, profile queries, enrichment, and migrations. Reject combos larger than successful judgments. Run independent profile reads concurrently. Preserve schema and public endpoints. Generated files were inspected as generated interfaces, not hand-edited. |
| `.github/`, `scripts/`, root configuration | Lint now covers source, backend, and scripts and fails on warnings. CI explicitly type-checks the backend, has read-only repository permissions, a ten-minute timeout, and cancels superseded runs. Build verifies both source manifests and emitted archives. Existing pnpm lockfile and manually connected Vercel deployment workflow remain intact. |
| `game-assets/`, `public/` | Inspected starter manifest, permission records, fixture/skin inventory, and public assets. Removed three production map copies with `PENDING` permission records, preserving byte-identical originals in `test-maps/`. Public assets remain. |
| `docs/`, `.agents/`, `.claude/`, README | Read architecture/workflow guidance and inspected plans, runbook, skill, and launch configuration. Preserve historical plans and user tooling. Removed the missing demo image and corrected the README's unsupported offline-startup claim. |
| Tests and stylesheet | Removed the arithmetic smoke test, one duplicate submission assertion, and four manifest assertions duplicated by the build verifier. Kept behavioral, parser, filter, scoring, and pp compatibility tests. CSS candidates without literal references were dynamically constructed calibration classes, so they were retained. |

## Evidence

Baseline: **115 tests passed**, source lint passed, production build succeeded but emitted all three unlicensed starter archives.

Final verification: **119 tests passed in 27 files**; `pnpm run lint`, `pnpm run typecheck:backend`, `pnpm run build`, and `git diff --check` passed. No packages or lockfile entries changed. Ten regression cases were added and six low-value/duplicated cases removed.

Reproductions and corrections:

- A Relax cursor arriving at 1200 ms for a 1000 ms target with a 150 ms window returned 300; it now returns a miss.
- Mocked extraction counts were two per load, preview, and background operation; all three now assert exactly one. Home upload previously extracted four times across validation/preview/persistence metadata; it now uses one preview extraction.
- Concurrent camera startup, tracker failure cleanup, and stop-during-start all failed initially; three regression tests now pass.
- Audio decode failure leaked its context and repeated stop closed twice; both lifecycle regressions now pass.
- A submission with ten successful judgments, ninety misses, and an eleven-hit combo was accepted; it is now rejected.
- The starter checker initially accepted `PENDING` licenses. The strengthened check rejected the existing manifest before its unapproved assets were removed. Injecting a preserved fixture into `dist/` also correctly failed the production check; the temporary copy was removed and verification passed again.

### Performance measurements

| Measure | Baseline | Final |
| --- | ---: | ---: |
| Main entry JavaScript, Vite minified size | 1,041.93 KB | 546.58 KB |
| Main entry JavaScript, Vite gzip estimate | 310.17 KB | 165.50 KB |
| Unapproved starter archives in `dist/` | 10,679,607 bytes | 0 bytes |
| Archive inflations per load/preview/background call | 2 | 1 |

The entry JavaScript reduction is approximately 47.5%; deferred modules still download when gameplay needs them. These are build and operation-count measurements, not an FPS benchmark. The existing skin remains an 18.70 MB on-demand asset.

### Browser verification

Using `pnpm run dev` and the in-app browser:

- Home and settings navigation rendered successfully.
- A temporary harness rendered actual WebGL circles, sliders, cursor, score, accuracy, combo, and pp; resizing from 800×600 to 400×300 repositioned/scaled the playfield correctly. Destroying the stage left zero canvases.
- A synthetic silent WAV ended before two notes. Before the completion fix, results contained zero judgments and 100% accuracy. Afterward, results correctly contained two misses and 0% accuracy.
- Importing a synthetic standalone `.osu` showed an audio picker and disabled Play. Attaching its WAV enabled Play.
- Temporary harness files were removed. No real scores were submitted.

## Verification limits and retained work

Live camera tracking quality, physical palm/fingertip calibration, and signed-in production submission were not exercised. Camera lifecycle uses mocked regression tests; gameplay completion and rendering use real browser APIs with synthetic content. Backend checks are local; deployment and data migrations were not run.

The main entry still exceeds Vite's 500 KB advisory threshold. Skin repacking and long-map profiling (session scans, slider-path interpolation, timed pp lookup) remain potential improvements requiring representative performance and visual/audio equivalence measurements. The audit deliberately retains supported adapters, historical pp fixtures, generated code, existing schema/API contracts, and dynamically referenced styles.

CI concurrency and permissions follow [GitHub's concurrency documentation](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/control-workflow-concurrency) and [workflow syntax reference](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax).
