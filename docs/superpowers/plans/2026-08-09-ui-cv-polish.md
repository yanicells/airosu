# UI and CV Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace browser-default controls, clarify palm versus fingertip calibration, improve easy high-value cursor stability, and make pause/navigation menus feel like one intentional airosu interface.

**Architecture:** Add focused shared React controls under `src/ui/shared/`, then migrate every native select and the raw key-binding field. Keep CV changes pure and tested: one helper chooses One Euro filter parameters by cursor anchor; calibration remains responsible only for guidance and sampling. Preserve existing app state and route boundaries.

**Tech Stack:** React 19, TypeScript, CSS, Vitest, MediaPipe Hand Landmarker, One Euro filter, Vite.

## Global Constraints

- Branch `v2.6-ui-cv-polish` from `v2.5-pp-rework`; PR base remains `v2.5-pp-rework`.
- Preserve airosu colors and Exo 2 typography. Palette: `#17111f` background, `#241b30` solid panel, `#ff66aa` pink, `#ff2d87` hot pink, `#66ccff` focus blue, `#ffcc55` gold.
- Signature interaction: selected/hovered menu choices grow slightly while idle siblings remain smaller, matching osu!-style song selection.
- All controls need visible keyboard focus and reduced-motion behavior.
- No new runtime dependency. pnpm only.
- Pure CV behavior gets a failing test before implementation.
- Commit after every green focused test cycle.

## File Map

- `src/ui/shared/SelectMenu.tsx`: reusable custom dropdown with keyboard selection, outside-click close, and listbox semantics.
- `src/ui/shared/selectMenuNavigation.ts`: pure wrapped keyboard navigation helper.
- `src/ui/shared/selectMenu.test.ts`: pure option-navigation coverage.
- `src/ui/shared/KeyBindingEditor.tsx`: key chips plus explicit next-key capture.
- `src/ui/shared/keyBindings.ts`: pure key normalization and non-empty binding updates.
- `src/ui/shared/keyBindings.test.ts`: key binding regression coverage.
- `src/ui/home/MapCard.tsx`: custom play option dropdowns.
- `src/ui/home/YourMaps.tsx`: inline designed delete confirmation instead of browser `confirm()`.
- `src/ui/settings/rows.tsx`: styled setting rows, custom dropdown, switch, and range classes.
- `src/ui/settings/SettingsScreen.tsx`: centered settings layout and custom key editor.
- `src/ui/leaderboard/LeaderboardPage.tsx`: custom country dropdown.
- `src/cv/cursorSource.ts`: anchor-aware filter profile.
- `src/cv/cursorSource.test.ts`: filter-profile regression coverage.
- `src/ui/calibrate/CalibrationScreen.tsx`: anchor-specific instructions.
- `src/ui/calibrate/CornerGuide.tsx`: palm ring versus fingertip target and copy.
- `src/ui/calibrate/CursorDot.tsx`: anchor-specific test cursor shape.
- `src/ui/play/PauseOverlay.tsx`: structured large pause menu.
- `src/ui/play/PlayScreen.tsx`: designed exit and fatal fallback actions.
- `src/ui/nav/AuthButton.tsx`, `src/ui/nav/NavBar.tsx`: capitalized copy and accessible profile menu state.
- `src/styles.css`: shared control, calibration, settings, auth, and pause styles.
- `pnpm-workspace.yaml`: allow required `esbuild` install script under pnpm 11.

---

### Task 1: Restore reproducible CI installation

**Files:**
- Create: `pnpm-workspace.yaml`

**Interfaces:**
- Produces: `pnpm install --frozen-lockfile` succeeds under pnpm 11 while allowing only `esbuild` to run its required install script.

- [x] **Step 1: Reproduce failure evidence**

Run: `gh run view 29685661742 --job 88189360271 --log-failed`

Expected decisive error: `[ERR_PNPM_IGNORED_BUILDS] Ignored build scripts: esbuild@0.27.0`.

- [x] **Step 2: Add narrow build approval**

Create `pnpm-workspace.yaml`:

```yaml
allowBuilds:
  esbuild: true
```

- [x] **Step 3: Verify and commit**

Run: `pnpm install --frozen-lockfile && pnpm run build`

Commit: `ci: allow esbuild install script`

### Task 2: Build custom dropdown primitive

**Files:**
- Create: `src/ui/shared/SelectMenu.tsx`
- Create: `src/ui/shared/selectMenuNavigation.ts`
- Create: `src/ui/shared/selectMenu.test.ts`
- Modify: `src/styles.css`

**Interfaces:**
- Produces: `SelectMenu({ ariaLabel, value, options, onChange, align? })` where options are `{ value: string; label: string; description?: string }[]`.
- Produces: `moveOptionIndex(current, direction, count)` for tested wrapping navigation.

- [x] **Step 1: Write failing navigation tests**

Cover next/previous wrap, Home, End, and starting from `-1`.

- [x] **Step 2: Run focused test and confirm failure**

Run: `pnpm test src/ui/shared/selectMenu.test.ts`

Expected: module/export missing.

- [x] **Step 3: Implement dropdown**

Use a styled trigger button with `aria-haspopup="listbox"`, `aria-expanded`, and `aria-controls`. Open on click, Enter, Space, ArrowDown, or ArrowUp. Move active option with arrows/Home/End, choose with Enter/Space, close with Escape/Tab/outside pointer. Render labels and optional descriptions in a floating listbox. Add pink selected rail, checkmark, chevron rotation, and small-to-large hover/focus scale.

- [x] **Step 4: Verify and commit**

Run: `pnpm test src/ui/shared/selectMenu.test.ts && pnpm run lint && pnpm run build`

Commit: `feat: add custom dropdown control`

### Task 3: Replace every native select

**Files:**
- Modify: `src/ui/home/MapCard.tsx`
- Modify: `src/ui/settings/rows.tsx`
- Modify: `src/ui/leaderboard/LeaderboardPage.tsx`
- Modify: `src/styles.css`

**Interfaces:**
- Consumes: `SelectMenu` from Task 2.
- Produces: no `<select>` elements under `src/`.

- [x] **Step 1: Migrate home and settings controls**

Keep existing setting values and labels. Use compact dropdown triggers on the map card and full-width triggers in settings.

- [x] **Step 2: Verify and commit home/settings migration**

Run: `pnpm run lint && pnpm run build`

Commit: `feat: style game option dropdowns`

- [x] **Step 3: Migrate country filter**

Map `undefined` to value `""`; reset pagination offset after selection.

- [x] **Step 4: Verify no native selects and commit**

Run: `! rg -n "<select" src && pnpm run lint && pnpm run build`

Commit: `feat: style leaderboard country dropdown`

### Task 4: Center and redesign settings inputs

**Files:**
- Create: `src/ui/shared/KeyBindingEditor.tsx`
- Modify: `src/ui/settings/SettingsScreen.tsx`
- Modify: `src/ui/settings/rows.tsx`
- Modify: `src/styles.css`

**Interfaces:**
- Produces: `KeyBindingEditor({ value: string[], onChange })` with unique key chips and explicit capture mode.

- [ ] **Step 1: Center settings canvas**

Wrap panel in `.settings-screen` using `min-height: 100%`, grid centering, safe padding, and inner scrolling for short viewports.

- [ ] **Step 2: Replace default-looking ranges and checkbox**

Apply branded range track/thumb classes. Render mirror camera as a switch with checked state, pink fill, visible focus, and text label.

- [x] **Step 3: Replace raw comma input**

Render each binding as a `<kbd>` chip with a remove button. “Add key” enters capture mode; next non-modifier key is normalized (`' '` displays as `Space`), added once, then capture ends. Escape cancels; Backspace removes the last binding when capture is idle. Never allow an empty binding set.

- [ ] **Step 4: Verify and commit**

Run: `pnpm run lint && pnpm run build`

Commit: `feat: redesign settings input controls`

### Task 4A: Remove remaining browser-default actions

**Files:**
- Modify: `src/ui/home/YourMaps.tsx`
- Modify: `src/ui/play/PlayScreen.tsx`
- Modify: `src/styles.css`

**Interfaces:**
- Produces: inline Remove/Cancel confirmation keyed by map ID; no browser `confirm()` call.
- Produces: styled gameplay exit and fatal fallback actions with accessible labels.

- [ ] **Step 1: Replace native delete confirmation**

First delete click marks one row pending and reveals “Remove” plus “Cancel” inside that row. “Remove” calls `library.remove(entry.id)`; “Cancel” clears pending state. Add a clear `aria-label` using the map label.

- [ ] **Step 2: Style gameplay fallback actions**

Give the top-left exit button a dedicated circular ghost class and `aria-label="Quit to song select"`. Give fatal “Back to home” the shared `.btn` class.

- [ ] **Step 3: Audit and verify**

Run: `! rg -n "\\b(alert|confirm|prompt)\\s*\\(" src && pnpm run lint && pnpm run build`

Commit: `fix: replace browser-default actions`

### Task 5: Tune fingertip filtering

**Files:**
- Create: `src/cv/cursorSource.test.ts`
- Modify: `src/cv/cursorSource.ts`

**Interfaces:**
- Produces: `cursorFilterOptions(smoothing, anchor): { minCutoff: number; beta: number }`.
- Palm keeps current curve: `minCutoff = max(1.5 - smoothing, 0.1)`, `beta = 0.007`.
- Index uses slightly more low-speed stabilization without deadening fast motion: `minCutoff = max(1.25 - smoothing, 0.1)`, `beta = 0.012`.

- [ ] **Step 1: Write failing profile tests**

Assert default palm `{ minCutoff: 1, beta: 0.007 }`; default index `{ minCutoff: 0.75, beta: 0.012 }`; both clamp at `0.1`.

- [ ] **Step 2: Confirm failure**

Run: `pnpm test src/cv/cursorSource.test.ts`

- [ ] **Step 3: Implement and use helper**

Build filters from both smoothing and current anchor. Rebuild only when settings are applied; existing filter reset behavior remains unchanged.

- [ ] **Step 4: Verify and commit**

Run: `pnpm test src/cv/cursorSource.test.ts src/cv/cursorPoint.test.ts src/cv/filters.test.ts`

Commit: `fix: stabilize fingertip cursor tracking`

### Task 6: Differentiate calibration modes

**Files:**
- Modify: `src/ui/calibrate/CalibrationScreen.tsx`
- Modify: `src/ui/calibrate/CornerGuide.tsx`
- Modify: `src/ui/calibrate/CursorDot.tsx`
- Modify: `src/styles.css`

**Interfaces:**
- Consumes: `settings.cursorAnchor`.
- Produces: palm copy and a broad ring; fingertip copy and a smaller crosshair/point target.

- [ ] **Step 1: Add mode-specific language**

Palm: ask for an open, camera-facing hand and center of palm. Fingertip: ask for an extended index finger and exact fingertip placement. Make intro, both corners, test copy, target label, and recenter tip consistent.

- [ ] **Step 2: Add mode-specific visuals**

Pass `anchor` into `CornerGuide`; use `.corner-target--palm` and `.corner-target--index`. Test cursor uses a 24px round palm marker or 16px fingertip crosshair.

- [ ] **Step 3: Verify and commit**

Run: `pnpm run lint && pnpm run build`

Commit: `feat: tailor calibration to cursor anchor`

### Task 7: Redesign pause menu

**Files:**
- Modify: `src/ui/play/PauseOverlay.tsx`
- Modify: `src/ui/play/PlayScreen.tsx`
- Modify: `src/styles.css`

**Interfaces:**
- Keeps callbacks `onResume`, `onRestart`, and `onQuit` unchanged.

- [ ] **Step 1: Build menu hierarchy**

Add blurred backdrop, compact “Game paused” eyebrow, large title, keyboard hint, and a 320px vertical action stack. Resume stays pink-primary; Restart and Quit remain quieter.

- [ ] **Step 2: Add selection pulse**

Idle actions render at `scale(0.96)`. Hovered or keyboard-focused action renders at `scale(1.04)`, brightens, and shifts its text slightly. Preserve reduced-motion behavior.

- [ ] **Step 3: Verify and commit**

Run: `pnpm run lint && pnpm run build`

Commit: `feat: redesign pause menu actions`

### Task 8: Normalize navigation copy and menu behavior

**Files:**
- Modify: `src/ui/nav/AuthButton.tsx`
- Modify: `src/ui/nav/NavBar.tsx`
- Modify: `src/ui/leaderboard/LeaderboardPage.tsx`
- Modify: `src/styles.css`

**Interfaces:**
- Produces: “Profile”, “Leaderboard”, “Sign out”, “Sign in with osu!”, “Performance ranking”, and title-cased table/pager actions.

- [ ] **Step 1: Normalize user-facing copy**

Use sentence/title case consistently for navigation and actions while retaining official `osu!` styling.

- [ ] **Step 2: Harden profile menu**

Add `aria-expanded`, `aria-haspopup="menu"`, Escape close, outside-click close, and a rotating chevron. Keep route and sign-out behavior unchanged.

- [ ] **Step 3: Verify and commit**

Run: `pnpm run lint && pnpm run build`

Commit: `fix: polish profile menu copy`

### Task 9: Full verification and stacked PR

**Files:**
- Modify: this plan, checking completed steps.

- [ ] **Step 1: Run automated verification**

Run: `pnpm test && pnpm run lint && pnpm run verify:starter-maps && pnpm run build`

Expected: all commands pass; starter-map manifest, size, hash, and approved production asset checks pass.

- [ ] **Step 2: Run browser verification**

At desktop and mobile widths verify custom dropdown click/keyboard behavior, centered settings, key capture, anchor-specific calibration copy, pause button scale states, title-cased profile/nav copy, visible focus, and clean console.

- [ ] **Step 3: Push and open stacked PR**

```bash
git push -u origin v2.6-ui-cv-polish
gh pr create --base v2.5-pp-rework --head v2.6-ui-cv-polish \
  --title "fix: polish controls, calibration, and pause menu" \
  --body-file /tmp/airosu-v2.6-pr.md
```

- [ ] **Step 4: Verify live topology and checks**

Run: `gh pr view --json number,url,headRefName,baseRefName,statusCheckRollup`.
