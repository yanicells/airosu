'use node';
import { createHash } from 'node:crypto';
import { v } from 'convex/values';
import { action } from './_generated/server';
import { internal } from './_generated/api';
import type { Id } from './_generated/dataModel';
import { getAuthUserId } from '@convex-dev/auth/server';
import { computeMapAttributes } from '../src/beatmap/attributes';

/** Registers a difficulty by its .osu text. Idempotent by md5. Returns mapId. */
export const registerMap = action({
  args: { osuText: v.string() },
  handler: async (ctx, { osuText }): Promise<Id<'maps'>> => {
    if (!(await getAuthUserId(ctx))) throw new Error('not signed in');
    if (new TextEncoder().encode(osuText).byteLength > 1_000_000) {
      throw new Error('.osu file is too large');
    }
    const md5 = createHash('md5').update(osuText, 'utf8').digest('hex');
    const existing = await ctx.runQuery(internal.maps.byMd5, { md5 });
    if (existing) {
      if (!existing.rankedStatus) {
        await ctx.scheduler.runAfter(0, internal.osuApi.enrichMap, { mapId: existing._id });
      }
      return existing._id;
    }
    const a = computeMapAttributes(osuText);
    const osuFileId = await ctx.storage.store(new Blob([osuText], { type: 'text/plain' }));
    const inserted: { mapId: Id<'maps'>; created: boolean } = await ctx
      .runMutation(internal.maps.insert, {
        md5,
        osuFileId,
        title: a.title,
        artist: a.artist,
        version: a.version,
        creator: a.creator,
        bpm: a.bpm,
        lengthMs: a.lengthMs,
        cs: a.cs,
        ar: a.ar,
        od: a.od,
        hp: a.hp,
        starRating: a.starRating,
        maxCombo: a.maxCombo,
        objectCount: a.objectCount,
        judgmentCount: a.judgmentCount,
        ssPp: a.ssPp,
        attributesVersion: a.attributesVersion,
        osuBeatmapId: a.beatmapId,
        osuBeatmapSetId: a.beatmapSetId,
      })
      .catch(async (error) => {
        await ctx.storage.delete(osuFileId);
        throw error;
      });
    if (!inserted.created) await ctx.storage.delete(osuFileId); // concurrent registration lost
    await ctx.scheduler.runAfter(0, internal.osuApi.enrichMap, { mapId: inserted.mapId });
    return inserted.mapId;
  },
});
