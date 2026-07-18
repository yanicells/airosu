# pp rework runbook

For a formula-only change (`src/game/ppFormula.ts`):

1. Change the math and **bump `PP_VERSION`**.
2. Add the new version's expectations. Keep `pp.compat.test.ts` PP v1 values as
   named historical fixtures; do not silently rewrite them to make a refactor pass.
3. Deploy: `pnpm dlx convex dev --once` (dev) / `pnpm dlx convex deploy` (prod).
4. Run the recalculation: `pnpm dlx convex run migrations:runPpRework` (add `--prod` for production).
   It replays: score pp → isBest flags → user totals (+ leaderboard aggregates).
5. Verify: spot-check a user in the dashboard — `users.ppVersion === PP_VERSION`,
   leaderboard order changed as expected. Scores keep their `ppVersion`, so an
   interrupted run is resumable by rerunning step 4.

For a parser or `osu-standard-stable` change that can alter star rating,
max combo, or SS worth:

1. Bump `ATTRIBUTES_VERSION` in `src/beatmap/attributes.ts` and also bump
   `PP_VERSION` so every dependent score is replayed.
2. Deploy, run the attribute-refresh runner
   (`pnpm dlx convex run mapsNode:refreshAttributes`) until no stale maps
   remain, then run `migrations:runPpRework`.
3. Verify sampled maps have the new `attributesVersion`, then verify scores,
   best flags, user totals, and leaderboard ranks as above.

Never edit stored pp by hand: stored hit stats + map attributes are the source
of truth; pp is always derivable.
