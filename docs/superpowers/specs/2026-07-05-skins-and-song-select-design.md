# airosu — Skins (.osk) + Bundled Song Select

Date: 2026-07-05. Approved by owner in chat (ship bundled maps/skin publicly is accepted; note it in README).

## Goals

1. Render gameplay with the bundled osu! skin `Aristia(Edit)+trail.osk`: hitcircle,
   hitcircleoverlay, approachcircle, slider ball/follow circle/reverse arrow, cursor +
   trail, score/combo digit font, hit result sprites (hit300/100/50/0), hit sounds
   (normal-hitnormal on hit, combobreak on miss).
2. Bundled maps: everything in `game-assets/maps/*.osz` appears in an osu-style song
   select. Per-difficulty star ratings shown before picking. Difficulty pills colored
   with osu's star spectrum. Back navigation at every level (song list ⇄ difficulty
   list ⇄ ready-to-play card).
3. Custom skin upload: out of scope (future). Skin always the bundled one for now.

## Asset layout

- `game-assets/maps/*.osz` — bundled mapsets (moved from `/maps`).
- `game-assets/skins/*.osk` — bundled skins (first one is used).
- Discovery via `import.meta.glob('/game-assets/…', { query: '?url', eager: true })`;
  Vite `assetsInclude` gains `**/*.osz`, `**/*.osk`. No manifest script.
- These files ship in the deployed bundle by owner decision; README documents that the
  media belongs to the original artists/mappers/skinners.

## Architecture

- `src/skin/ini.ts` — pure skin.ini parser: combo colours (Combo1..8), ScorePrefix
  (backslash paths, e.g. `num\berlin`), HitCircleOverlap. TDD.
- `src/skin/resolve.ts` — pure element lookup over the zip file listing:
  case-insensitive, prefers `@2x` (resolution 2), root-level entries only, animation
  fallback `name-0.png` when `name.png` is missing. TDD.
- `src/skin/loadSkin.ts` — unzips the .osk (fflate), builds Pixi textures
  (createImageBitmap) and decodes sounds (Web Audio). Returns `Skin | null`; any
  failure degrades to the existing procedural rendering. Module-level cache.
- `src/skin/soundBank.ts` — own AudioContext; `play(name)`; volume from settings.
- `src/beatmap/stars.ts` — star rating per difficulty via `osu-standard-stable`
  (same kionell ecosystem as osu-parsers/osu-classes). TDD with the fixture.
- Renderer: `PlayfieldLayer`, `CursorLayer`, `HudLayer` take an optional `Skin`;
  sprite paths sized by the osu rule "128 logical px = circle diameter (2r)";
  slider body stays procedural Graphics (as in osu!). Hit bursts become skin sprites.
- `useGameLoop` loads the skin before `createStage`, passes it in, and fires sounds
  from `HitEvent`s.
- Home becomes song select: bundled list (filename `id Artist - Title.osz` parsed for
  display), on pick the .osz is fetched + difficulties parsed with stars, difficulty
  pills colored by star value (osu spectrum), background image shown, then the
  existing MapCard to play. Drop zone stays as a secondary path.

## Testing

TDD for: ini parser, resolver, star wrapper, bundled-name parser. Loader/renderer/UI
verified manually by the owner (webcam flows).
