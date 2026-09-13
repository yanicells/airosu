import { Migrations } from '@convex-dev/migrations';
import { components, internal } from './_generated/api';
import { internalMutation } from './_generated/server';
import type { DataModel } from './_generated/dataModel';
import { PP_VERSION } from '../src/game/ppFormula';
import { scoreDerived } from './lib/scoring';
import { recomputeUserTotals } from './scores';
import { countryBoard, syncBoards } from './leaderboard';

export const migrations = new Migrations<DataModel>(components.migrations, { internalMutation });

/** Phase 1: recompute pp for every score under the current PP_VERSION. */
export const recalcScores = migrations.define({
  table: 'scores',
  migrateOne: async (ctx, score) => {
    if (score.ppVersion === PP_VERSION) return;
    const map = await ctx.db.get(score.mapId);
    if (!map?.difficulty) {
      throw new Error(
        `Cannot recalculate score ${score._id}: map ${score.mapId} has no difficulty attributes; run mapsNode:refreshAttributes first.`,
      );
    }
    const d = scoreDerived(map, score);
    return { pp: d.pp, accuracy: d.accuracy, grade: d.grade, ppVersion: PP_VERSION };
  },
});

/** Phase 2: new formula may reorder plays on a map — refresh each flag with an indexed lookup. */
export const recalcBestFlags = migrations.define({
  table: 'scores',
  migrateOne: async (ctx, score) => {
    const best = await ctx.db
      .query('scores')
      .withIndex('by_user_map_pp', (q) => q.eq('userId', score.userId).eq('mapId', score.mapId))
      .order('desc')
      .first();
    return { isBest: best?._id === score._id };
  },
});

/** Phase 3: recompute denormalized totals (also refreshes leaderboard aggregates). */
export const recalcUsers = migrations.define({
  table: 'users',
  migrateOne: async (ctx, user) => {
    await recomputeUserTotals(ctx, user._id);
  },
});

export const runPpRework = migrations.runner([
  internal.migrations.recalcScores,
  internal.migrations.recalcBestFlags,
  internal.migrations.recalcUsers,
]);

/** One-time backfill of leaderboard aggregates from existing ranked users. */
export const backfillBoards = migrations.define({
  table: 'users',
  migrateOne: async (ctx, user) => {
    if (!user.totalPp) return;
    // Repair known old namespaces before inserting the current one. If the
    // field was absent, the old aggregate namespace is unknowable; insertion
    // remains idempotent and the runbook documents the safe clear/rebuild path.
    if (user.boardCountryCode !== user.countryCode) {
      await ctx.db.patch(user._id, { boardCountryCode: user.countryCode });
      if (user.boardCountryCode !== undefined) await countryBoard.deleteIfExists(ctx, user);
      const after = await ctx.db.get(user._id);
      if (after) await syncBoards(ctx, null, after);
      return;
    }
    await syncBoards(ctx, null, user);
  },
});
export const runBackfillBoards = migrations.runner(internal.migrations.backfillBoards);
