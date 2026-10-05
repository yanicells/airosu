# pp rework runbook

For a formula-only change (`src/game/ppFormula.ts`):

1. Change the math and **bump `PP_VERSION`**.
2. Add the new version's expectations. Keep `pp.compat.test.ts` values of older
   versions (v1, v2) as named historical fixtures, each with its frozen formula;
   do not silently rewrite them to make a refactor pass.
3. Deploy: `pnpm dlx convex dev --once` (dev) / `pnpm dlx convex deploy` (prod).
4. Refresh map attributes first if the parser/ruleset changed. `runPpRework`
   now stops with an actionable error when a score's map has no difficulty
   attributes; it does not silently skip that score.
5. Run the recalculation: `pnpm dlx convex run migrations:runPpRework`
   (add `--prod` for production). It replays: score pp → isBest flags → user
   totals (+ leaderboard aggregates). The series runs in the background; check
   progress with `pnpm dlx convex run --component migrations lib:getStatus`.
   An interrupted run resumes by rerunning this command.
   Progress is stored per version (`migrations:recalcScores@pp<PP_VERSION>`,
   …), so after a `PP_VERSION` bump the same command replays every phase even
   though the previous version's series is marked done.
6. If a run of the current version completed while maps were missing
   attributes, refresh those maps, then restart that version's series
   explicitly: `pnpm dlx convex run migrations:runPpRework '{"reset":true}'`.
7. Verify: spot-check a user in the dashboard — `users.ppVersion === PP_VERSION`,
   leaderboard order changed as expected.

For a parser or `osu-standard-stable` change that can alter star rating,
max combo, or SS worth:

1. Bump `ATTRIBUTES_VERSION` in `src/beatmap/attributes.ts` and also bump
   `PP_VERSION` so every dependent score is replayed.
2. Deploy, run the attribute-refresh runner
   (`pnpm dlx convex run mapsNode:refreshAttributes`) until no stale maps
   remain, then run `migrations:runPpRework`.
3. Verify sampled maps have the new `attributesVersion`, then verify scores,
   best flags, user totals, and leaderboard ranks as above.

## PP v3 (2026-10-05): one judgement per slider

v1/v2 counted a slider's head and its end as two judgements, but
osu-standard-stable's calculator expects one per object. v3 judges each slider
once (head + follow parts, stable-style), makes the head combo-only, and scales
combo against airosu's max combo (circles + 2·sliders + spinners). It bumped
both `ATTRIBUTES_VERSION` (3: `judgmentCount`/`ssPp` per object) and
`PP_VERSION` (3), so roll out with the attribute path: deploy →
`mapsNode:refreshAttributes` → `migrations:runPpRework`. Submit validation
derives counts from `maps.difficulty`, so new plays are accepted before the
refresh finishes.

Scores stored before v3 keep their double-counted stats; the recalculation
replays them as-is (it never rejects stored stats), so their v3 pp is an
approximation. New plays are exact.

Before/after on the starter maps (airosu pp; v2 counting → v3 counting). The
"lazer SS × 2.25" column is lazer's own SS pp times `AIROSU_PP_MULTIPLIER`; v3
SS matches it exactly on every difficulty. The 97% FC spreads 100s over circles
and sliders in proportion; "3 misses" adds 2 missed circles and 1 fully missed
slider (v2 counted it as 2 misses) with a 40% max combo.

| map [difficulty] | ★ | circles/sliders/spinners | lazer SS × 2.25 | SS | ~97% FC | 3 misses |
| --- | --- | --- | --- | --- | --- | --- |
| kira-kira-days [Normal!!] | 2.30 | 84/101/1 | 35.9 | 36.4 → 35.9 | 24.4 → 23.6 | 8.9 → 9.1 |
| kira-kira-days [Shiawase!!] | 5.76 | 239/166/1 | 580.6 | 593.3 → 580.6 | 449.9 → 433.7 | 201.2 → 201.2 |
| quaver [Normal] | 2.56 | 47/79/1 | 46.3 | 46.9 → 46.3 | 33.8 → 32.8 | 12.0 → 11.9 |
| quaver [Ultimate Crescendo] | 6.47 | 278/43/1 | 829.1 | 833.8 → 829.1 | 664.5 → 657.9 | 303.9 → 318.6 |
| inferno [Normal] | 2.31 | 45/97/0 | 37.1 | 37.6 → 37.1 | 24.4 → 23.6 | 8.7 → 8.6 |
| inferno [Fire Force] | 4.90 | 181/138/0 | 374.1 | 380.5 → 374.1 | 262.1 → 253.8 | 112.6 → 114.7 |

v2 overpaid SS and FC plays slightly (the extra slider judgements inflated the
length bonus and the overall accuracy aim/speed read) and overcharged missed
sliders. The calculator's accuracy term only reads hit-circle accuracy, so it
was the same under both countings for these plays.

## Leaderboard aggregate repair

`runBackfillBoards` initializes `users.boardCountryCode` for ranked users and
removes a known old country namespace before inserting the current one. If a
legacy user has no `boardCountryCode`, the old namespace cannot be inferred
from the user document. Do not guess or delete a country namespace from the
dashboard. For that case, prepare an explicit operator-reviewed one-off
maintenance migration that clears both aggregate components and then reruns
`runBackfillBoards`; inspect the resulting global and country counts before
resuming normal writes. No aggregate clear or external migration is performed
by this repository's normal commands.

Never edit stored pp by hand: stored hit stats + map attributes are the source
of truth; pp is always derivable.
