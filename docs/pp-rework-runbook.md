# pp rework runbook

For a formula-only change (`src/game/ppFormula.ts`):

1. Change the math and **bump `PP_VERSION`**.
2. Add the new version's expectations. Keep `pp.compat.test.ts` PP v1 values as
   named historical fixtures; do not silently rewrite them to make a refactor pass.
3. Deploy: `pnpm dlx convex dev --once` (dev) / `pnpm dlx convex deploy` (prod).
4. Refresh map attributes first if the parser/ruleset changed. `runPpRework`
   now stops with an actionable error when a score's map has no difficulty
   attributes; it does not silently skip that score.
5. Run the recalculation: `pnpm dlx convex run migrations:runPpRework`
   (add `--prod` for production). It replays: score pp → isBest flags → user
   totals (+ leaderboard aggregates). An interrupted run resumes by rerunning
   this command.
6. If an older run completed while maps were missing attributes, refresh those
   maps, then restart the whole series explicitly:
   `pnpm dlx convex run migrations:runPpRework '{"reset":true}'`.
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
