import { v } from 'convex/values';
import { action, internalAction, internalMutation, internalQuery } from './_generated/server';
import { internal } from './_generated/api';

/** App-level token, `public` scope. Fetched fresh per action — usage is rare. */
export async function osuToken(): Promise<string> {
  const res = await fetch('https://osu.ppy.sh/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      client_id: Number(process.env.AUTH_OSU_ID),
      client_secret: process.env.AUTH_OSU_SECRET,
      grant_type: 'client_credentials',
      scope: 'public',
    }),
  });
  if (!res.ok) throw new Error(`osu! token: ${res.status}`);
  return (await res.json()).access_token as string;
}

export const enrichMap = internalAction({
  args: { mapId: v.id('maps') },
  handler: async (ctx, { mapId }) => {
    try {
      const map = await ctx.runQuery(internal.maps.getInternal, { mapId });
      if (!map) return;
      const token = await osuToken();
      const lookup = map.osuBeatmapId
        ? `id=${map.osuBeatmapId}`
        : `checksum=${encodeURIComponent(map.md5)}`;
      const res = await fetch(`https://osu.ppy.sh/api/v2/beatmaps/lookup?${lookup}`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      });
      if (res.status === 404) {
        await ctx.runMutation(internal.maps.patchEnrichment, { mapId, rankedStatus: 'unknown' });
        return;
      }
      if (!res.ok) throw new Error(`lookup ${res.status}`);
      const b = await res.json();
      await ctx.runMutation(internal.maps.patchEnrichment, {
        mapId,
        rankedStatus: b.status ?? 'unknown',
        osuBeatmapId: b.id ?? undefined,
        osuBeatmapSetId: b.beatmapset_id ?? undefined,
        coverUrl: b.beatmapset?.covers?.['cover@2x'] ?? b.beatmapset?.covers?.cover ?? undefined,
        officialStarRating: b.difficulty_rating ?? undefined,
      });
    } catch {
      // enrichment is best-effort; a later registerMap call retries it
    }
  },
});

/** Public throttled sync of a player's real osu! stats (1/24h per user). */
export const syncOsuStats = action({
  args: { osuId: v.number() },
  handler: async (ctx, { osuId }): Promise<void> => {
    const user = await ctx.runQuery(internal.osuApi.userByOsuId, { osuId });
    if (!user) return;
    if (user.osuStatsSyncedAt && Date.now() - user.osuStatsSyncedAt < 24 * 60 * 60 * 1000) return;
    try {
      const token = await osuToken();
      const res = await fetch(`https://osu.ppy.sh/api/v2/users/${osuId}/osu`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      });
      if (!res.ok) throw new Error(`users ${res.status}`);
      const u = await res.json();
      await ctx.runMutation(internal.osuApi.patchOsuStats, {
        userId: user._id,
        osuPp: u.statistics?.pp ?? 0,
        osuGlobalRank: u.statistics?.global_rank ?? undefined,
      });
    } catch {
      // best effort — profile shows stale/absent comparison
    }
  },
});

export const userByOsuId = internalQuery({
  args: { osuId: v.number() },
  handler: (ctx, { osuId }) =>
    ctx.db.query('users').withIndex('by_osuId', (q) => q.eq('osuId', osuId)).unique(),
});

export const patchOsuStats = internalMutation({
  args: { userId: v.id('users'), osuPp: v.number(), osuGlobalRank: v.optional(v.number()) },
  handler: async (ctx, { userId, ...patch }) => {
    await ctx.db.patch(userId, { ...patch, osuStatsSyncedAt: Date.now() });
  },
});
