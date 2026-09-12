# Performance and aim-area audit — 2026-09-12

Based on `11057d6` (`codex/lazer-menu-and-scores`, PR #21). Working tree was clean. This is one follow-up milestone, stacked on the existing UI work.

- [x] Read the design, V1 plan, previous audit, and inspect the major directories.
- [x] Establish baseline: 119 tests, production build; entry JavaScript 553.93 kB (167.64 kB gzip).
- [ ] Move archive parsing and star calculations off the UI thread; reuse selected archives.
- [ ] Reduce CV latency, verify frame scheduling and resource cleanup.
- [ ] Add movable, resizable aim area with corner targets and live calibration preview.
- [ ] Remove proven dead code and repeated hot-path work; strengthen CI.
- [ ] Run focused regressions, full checks, browser verification, and record limitations.
