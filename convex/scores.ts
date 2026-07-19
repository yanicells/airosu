import { ConvexError, v } from 'convex/values';
import { getAuthUserId } from '@convex-dev/auth/server';
import { mutation, query, type MutationCtx } from './_generated/server';
import type { Id } from './_generated/dataModel';
import { PP_VERSION } from '../src/game/ppFormula';
import { scoreDerived, validateSubmission, weightedTotals } from './lib/scoring';

export async function recomputeUserTotals(ctx: MutationCtx, userId: Id<'users'>): Promise<void> {
  const best = await ctx.db
    .query('scores')
    .withIndex('by_user_best', (q) => q.eq('userId', userId).eq('isBest', true))
    .order('desc')
    .take(100);
  const totals = weightedTotals(best);
  await ctx.db.patch(userId, {
    totalPp: totals.totalPp,
    hitAccuracy: totals.hitAccuracy,
    ppVersion: PP_VERSION,
  });
}

export const submit = mutation({
  args: {
    playId: v.string(),
    mapId: v.id('maps'),
    count300: v.number(),
    count100: v.number(),
    count50: v.number(),
    countMiss: v.number(),
    maxCombo: v.number(),
    score: v.number(),
    inputMode: v.union(v.literal('relax'), v.literal('manual')),
    forgiveness: v.number(),
    cursorAnchor: v.union(v.literal('palm'), v.literal('index')),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError('not signed in');
    if (!/^[0-9a-f-]{36}$/i.test(args.playId)) throw new ConvexError('invalid play id');
    const duplicate = await ctx.db
      .query('scores')
      .withIndex('by_user_play', (q) => q.eq('userId', userId).eq('playId', args.playId))
      .unique();
    if (duplicate) {
      return {
        pp: duplicate.pp,
        isBest: duplicate.isBest,
        grade: duplicate.grade,
        accuracy: duplicate.accuracy,
      };
    }
    const map = await ctx.db.get(args.mapId);
    if (!map) throw new ConvexError('unknown map');
    if (!Number.isSafeInteger(args.score) || args.score < 0) {
      throw new ConvexError('score could not be verified: invalid score');
    }
    if (!Number.isFinite(args.forgiveness) || args.forgiveness < 1 || args.forgiveness > 2.5) {
      throw new ConvexError('score could not be verified: invalid forgiveness');
    }

    const stats = {
      count300: args.count300,
      count100: args.count100,
      count50: args.count50,
      countMiss: args.countMiss,
      maxCombo: args.maxCombo,
    };
    const invalid = validateSubmission(map, stats);
    if (invalid) throw new ConvexError(`score could not be verified: ${invalid}`);

    const derived = scoreDerived(map, stats);

    // previous best on this map, indexed by pp
    const prevBest = await ctx.db
      .query('scores')
      .withIndex('by_user_map_pp', (q) => q.eq('userId', userId).eq('mapId', args.mapId))
      .order('desc')
      .first();
    // A pp tie replaces the older play, matching the index's pp/creation-time order.
    const isBest = !prevBest || derived.pp >= prevBest.pp;
    if (isBest && prevBest) await ctx.db.patch(prevBest._id, { isBest: false });

    await ctx.db.insert('scores', {
      userId,
      playId: args.playId,
      mapId: args.mapId,
      ...stats,
      score: args.score,
      inputMode: args.inputMode,
      forgiveness: args.forgiveness,
      cursorAnchor: args.cursorAnchor,
      accuracy: derived.accuracy,
      grade: derived.grade,
      pp: derived.pp,
      ppVersion: derived.ppVersion,
      isBest,
    });

    const user = await ctx.db.get(userId);
    await ctx.db.patch(userId, { playCount: (user?.playCount ?? 0) + 1 });
    if (isBest) await recomputeUserTotals(ctx, userId);

    return { pp: derived.pp, isBest, grade: derived.grade, accuracy: derived.accuracy };
  },
});

export const mapLeaderboard = query({
  args: { mapId: v.id('maps') },
  handler: async (ctx, { mapId }) => {
    const rows = await ctx.db
      .query('scores')
      .withIndex('by_map_best', (q) => q.eq('mapId', mapId).eq('isBest', true))
      .order('desc')
      .take(50);
    return Promise.all(
      rows.map(async (s) => {
        const u = await ctx.db.get(s.userId);
        return {
          scoreId: s._id,
          pp: s.pp,
          accuracy: s.accuracy,
          grade: s.grade,
          maxCombo: s.maxCombo,
          inputMode: s.inputMode,
          forgiveness: s.forgiveness,
          cursorAnchor: s.cursorAnchor,
          playedAt: s._creationTime,
          osuId: u?.osuId,
          name: u?.name,
          image: u?.image,
          countryCode: u?.countryCode,
        };
      }),
    );
  },
});
