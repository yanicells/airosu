import { paginationOptsValidator } from 'convex/server';
import { v } from 'convex/values';
import { internalMutation, internalQuery, query } from './_generated/server';

export const byMd5 = internalQuery({
  args: { md5: v.string() },
  handler: (ctx, { md5 }) =>
    ctx.db.query('maps').withIndex('by_md5', (q) => q.eq('md5', md5)).unique(),
});

export const getInternal = internalQuery({
  args: { mapId: v.id('maps') },
  handler: (ctx, { mapId }) => ctx.db.get(mapId),
});

export const insert = internalMutation({
  args: {
    md5: v.string(),
    osuFileId: v.id('_storage'),
    title: v.string(),
    artist: v.string(),
    version: v.string(),
    creator: v.string(),
    bpm: v.number(),
    lengthMs: v.number(),
    cs: v.number(),
    ar: v.number(),
    od: v.number(),
    hp: v.number(),
    starRating: v.number(),
    maxCombo: v.number(),
    objectCount: v.number(),
    judgmentCount: v.number(),
    ssPp: v.number(),
    attributesVersion: v.number(),
    osuBeatmapId: v.optional(v.number()),
    osuBeatmapSetId: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('maps')
      .withIndex('by_md5', (q) => q.eq('md5', args.md5))
      .unique();
    if (existing) return { mapId: existing._id, created: false }; // registration raced
    return { mapId: await ctx.db.insert('maps', args), created: true };
  },
});

export const patchEnrichment = internalMutation({
  args: {
    mapId: v.id('maps'),
    rankedStatus: v.string(),
    osuBeatmapId: v.optional(v.number()),
    osuBeatmapSetId: v.optional(v.number()),
    coverUrl: v.optional(v.string()),
    officialStarRating: v.optional(v.number()),
  },
  handler: async (ctx, { mapId, ...patch }) => {
    await ctx.db.patch(mapId, patch);
  },
});

export const staleAttributes = internalQuery({
  args: { version: v.number(), paginationOpts: paginationOptsValidator },
  handler: (ctx, { version, paginationOpts }) =>
    ctx.db
      .query('maps')
      .withIndex('by_attributes_version', (q) => q.lt('attributesVersion', version))
      .paginate(paginationOpts),
});

export const patchAttributes = internalMutation({
  args: {
    mapId: v.id('maps'),
    attributesVersion: v.number(),
    title: v.string(),
    artist: v.string(),
    version: v.string(),
    creator: v.string(),
    bpm: v.number(),
    lengthMs: v.number(),
    cs: v.number(),
    ar: v.number(),
    od: v.number(),
    hp: v.number(),
    starRating: v.number(),
    maxCombo: v.number(),
    objectCount: v.number(),
    judgmentCount: v.number(),
    ssPp: v.number(),
    osuBeatmapId: v.optional(v.number()),
    osuBeatmapSetId: v.optional(v.number()),
  },
  handler: (ctx, { mapId, ...attributes }) => ctx.db.patch(mapId, attributes),
});

export const get = query({
  args: { mapId: v.id('maps') },
  handler: (ctx, { mapId }) => ctx.db.get(mapId),
});
