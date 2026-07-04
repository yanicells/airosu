# airosu — Design Spec

**Date:** 2026-07-04
**Status:** Approved

## What this is

A webcam-controlled rhythm game that plays standard osu! beatmaps. The player moves
their hand in front of the camera to aim an on-screen cursor at circles and sliders —
a Wii/Kinect-style physical way to experience osu! maps. Not a replacement for
competitive osu!; a fun, forgiving, demoable party experience.

Everything runs client-side in the browser. Camera frames never leave the device.

## Goals (V1)

- Load a local `.osz` or `.osu` file, parse it, play it with audio.
- Whole-hand/palm aiming via webcam with calibration, smoothing, sensitivity.
- Two input modes: **Manual** (hand aims, keyboard taps) and **Relax** (hand aims,
  game auto-taps when the cursor is on the object at hit time).
- Circles and basic sliders. Score, combo, accuracy, misses. Pause/restart. Results screen.
- Two visual modes: **Arcade** (camera feed background) and **Focus** (dark background).
- Deployed free on GitHub Pages.

## Non-goals (V1)

- Spinners as real gameplay (they auto-complete with full score in V1).
- Gesture clicking, pinch input, two-hand modes, replays, skins, high scores,
  map library hosting, mobile support, competitive-accurate scoring/pp.

## Stack

| Concern | Choice | Why |
|---|---|---|
| Build/app | Vite + TypeScript + React | React for menus/settings only; fast dev loop; static output |
| Game rendering | PixiJS v8 | WebGL canvas over the camera `<video>` layer; cheap trails/particles |
| Beatmap parsing | `osu-parsers` + `osu-classes` (npm, kionell) | Decoders ported from osu!lazer source; browser-compatible; MIT |
| .osz extraction | `fflate` | Small, fast unzip in the browser |
| Hand tracking | `@mediapipe/tasks-vision` HandLandmarker | Maintained, client-side WASM, GPU delegate, `VIDEO` running mode, 21 landmarks |
| Audio | Web Audio API | `AudioContext.currentTime` is the master game clock |
| Hosting | GitHub Pages via GitHub Actions | Free, zero new accounts, fully static |
| Tests | Vitest | Pure-logic modules (parsing adapters, timing, judging, scoring, filters) are TDD'd |

Builder must verify current package versions/APIs at implementation time; pin exact
versions in the first PR.

## Architecture

Five modules with hard boundaries. `game/` is pure logic (no DOM, no Pixi, no
MediaPipe imports) so it is fully unit-testable.

```
src/
  cv/        camera capture, HandLandmarker wrapper, palm-center extraction,
             One Euro filter, calibration mapping, cursor source interface
  beatmap/   .osz/.osu ingestion, osu-parsers adapter, normalized internal
             map model (hit objects, timing, difficulty, audio blob)
  game/      game clock, object scheduler, hit judging, slider tracking,
             scoring/combo/accuracy, input modes (manual/relax) — pure TS
  render/    Pixi stage: layers = camera bg → playfield → objects → cursor → HUD
  ui/        React screens: home, map load, calibration, settings, gameplay
             shell, pause, results
```

Data flow: `cv/` emits a normalized cursor position (0–1 space) each frame →
`game/` consumes cursor + clock + parsed map, emits judgments and score state →
`render/` draws current state → `ui/` wraps it all.

### cv/ details

- HandLandmarker: `runningMode: "VIDEO"`, `numHands: 1`, GPU delegate with CPU fallback.
- Palm center = mean of landmarks 0, 5, 9, 13, 17 (wrist + finger bases). Whole-hand,
  no finger precision needed.
- Smoothing: One Euro filter (tunable `minCutoff`/`beta` exposed as sensitivity/
  smoothness settings).
- Calibration screen: player holds hand at comfortable corners; defines a movement
  box mapped to the full playfield. Small hand motion covers the whole field.
  Recenter button/key. Mirrored camera on by default (toggleable).
- Tracking loss: cursor freezes in place; brief on-screen indicator; no instant miss.

### beatmap/ details

- Accept `.osz` (unzip, pick a difficulty if several) and bare `.osu` + audio file.
- Adapter converts osu-parsers output to an internal model so the rest of the app
  never depends on library types.
- osu! playfield coordinates (512×384) preserved in the model; render maps to screen.

### game/ details

- Clock: audio time from `AudioContext`, with offset setting.
- Hit windows: start from osu! defaults for the map's OD, then widen by a global
  "forgiveness" multiplier (default ~1.5×, configurable). Target is fun, not rank.
- **Manual mode:** keyboard press (Z/X/space) judged against nearest active object;
  cursor must be within the object radius (radius also gets a forgiveness multiplier).
- **Relax mode:** at each object's hit time, if the cursor is within the (forgiving)
  radius → hit, quality based on distance/timing; otherwise miss.
- Sliders V1: hit the head, then keep cursor within a generous follow radius of the
  slider ball; ticks/ends scored simply. Slider paths computed via osu-parsers'
  path data.
- Spinners V1: auto-complete, full score, visual spin effect only.
- Scoring: simplified osu!-like — 300/100/50/miss, combo multiplier, accuracy %.

### render/ + visual modes

- **Arcade:** mirrored webcam feed as background, objects/effects on top, visible
  hand cursor with trail, hit bursts, combo pop.
- **Focus:** dark background (or dimmed/blurred camera), minimal HUD.
- Approach circles, slider bodies/balls, standard osu! visual language.

### Settings (V1)

Sensitivity, smoothing, forgiveness multiplier, audio offset, camera mirror,
visual mode, input mode, key bindings, master/music volume.

## Error handling

- No camera permission → clear blocking screen with retry.
- Unparseable map → error toast, stay on load screen.
- GPU delegate init failure → CPU fallback, warn about latency.
- Tab hidden / audio suspended → auto-pause.

## Licensing

- osu!lazer and kionell's libraries are MIT — porting logic/concepts is fine with
  attribution where code is adapted.
- Never deploy copyrighted beatmap audio. The bundled `Kira Kira Days.osz` is a test
  fixture only — kept out of the deployed site's assets entirely. The public site
  ships with no maps, or later a CC-licensed demo map.
- Do not use osu! trademarks/logo in branding; "plays osu! beatmaps" phrasing is fine.

## Milestones (each = one stacked PR)

1. **Scaffold:** Vite + React + TS + Vitest + ESLint/Prettier + GitHub Pages deploy
   workflow. Empty app deploys green.
2. **Beatmap:** .osz/.osu load, parse, internal model, audio decode. TDD against the
   Kira Kira Days fixture.
3. **Hand cursor:** webcam, HandLandmarker, palm center, One Euro filter, calibration
   screen, on-screen cursor demo.
4. **Core gameplay:** clock, circles, approach circles, judging, scoring, Manual +
   Relax modes, pause/restart. Playable with circles-only.
5. **Sliders + results:** slider rendering/tracking, spinners auto-complete, HUD
   (score/combo/acc), results screen.
6. **Polish:** Arcade/Focus modes, settings screen, hit/combo effects, cursor trail,
   error states, README.

## Risks and mitigations

- **Latency/jitter:** One Euro filter + Relax mode as flagship + forgiveness
  multipliers. GPU delegate.
- **Audio/visual sync:** single audio-clock source of truth; user-adjustable offset.
- **Slider feel:** oversized follow radius; sliders judged leniently by design.
- **Arm fatigue:** calibration box keeps required motion small.
