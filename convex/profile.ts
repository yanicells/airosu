import { v } from 'convex/values';
import { query } from './_generated/server';
import type { Doc } from './_generated/dataModel';
import { userRanks } from './leaderboard';

export const byOsuId = query({
  args: { osuId: v.number() },
  handler: async (ctx, { osuId }) => {
    const user = await ctx.db
      .query('users')
      .withIndex('by_osuId', (q) => q.eq('osuId', osuId))
      .unique();
    if (!user) return null;

    const joinMap = async (s: Doc<'scores'>, weight?: number) => {
      const map = await ctx.db.get(s.mapId);
      return {
        scoreId: s._id,
        pp: s.pp,
        weight,
        accuracy: s.accuracy,
        grade: s.grade,
        maxCombo: s.maxCombo,
        inputMode: s.inputMode,
        forgiveness: s.forgiveness,
        cursorAnchor: s.cursorAnchor,
        playedAt: s._creationTime,
        map: map && {
          title: map.title,
          artist: map.artist,
          version: map.version,
          starRating: map.starRating,
          coverUrl: map.coverUrl,
          rankedStatus: map.rankedStatus,
          osuBeatmapId: map.osuBeatmapId,
          osuBeatmapSetId: map.osuBeatmapSetId,
        },
      };
    };

    const [best, recent, ranks] = await Promise.all([
      ctx.db
        .query('scores')
        .withIndex('by_user_best', (q) => q.eq('userId', user._id).eq('isBest', true))
        .order('desc')
        .take(50),
      ctx.db
        .query('scores')
        .withIndex('by_user', (q) => q.eq('userId', user._id))
        .order('desc')
        .take(20),
      userRanks(ctx, user),
    ]);
    const [topPlays, recentPlays] = await Promise.all([
      Promise.all(best.map((s, i) => joinMap(s, Math.pow(0.95, i)))),
      Promise.all(recent.map((s) => joinMap(s))),
    ]);

    return {
      user: {
        osuId: user.osuId,
        name: user.name,
        image: user.image,
        countryCode: user.countryCode,
        countryName: user.countryName,
        totalPp: user.totalPp ?? 0,
        playCount: user.playCount ?? 0,
        hitAccuracy: user.hitAccuracy ?? 0,
        osuPp: user.osuPp,
        osuGlobalRank: user.osuGlobalRank,
        osuStatsSyncedAt: user.osuStatsSyncedAt,
      },
      ...ranks,
      topPlays,
      recentPlays,
    };
  },
});
