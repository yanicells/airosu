import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';
import { authTables } from '@convex-dev/auth/server';

export default defineSchema({
  ...authTables,
  users: defineTable({
    // standard Convex Auth fields
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    email: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
    phone: v.optional(v.string()),
    phoneVerificationTime: v.optional(v.number()),
    isAnonymous: v.optional(v.boolean()),
    // airosu identity
    osuId: v.optional(v.number()),
    countryCode: v.optional(v.string()),
    countryName: v.optional(v.string()),
    // denormalized play stats (written by scores.submit)
    totalPp: v.optional(v.number()),
    playCount: v.optional(v.number()),
    hitAccuracy: v.optional(v.number()),
    ppVersion: v.optional(v.number()),
    // cached real-osu! stats
    osuPp: v.optional(v.number()),
    osuGlobalRank: v.optional(v.number()),
    osuStatsSyncedAt: v.optional(v.number()),
  })
    .index('email', ['email'])
    .index('phone', ['phone'])
    .index('by_osuId', ['osuId']),

  maps: defineTable({
    md5: v.string(),
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
    osuFileId: v.id('_storage'),
    // osu! website enrichment (best effort)
    osuBeatmapId: v.optional(v.number()),
    osuBeatmapSetId: v.optional(v.number()),
    rankedStatus: v.optional(v.string()), // ranked|approved|qualified|loved|graveyard|wip|pending|unknown
    coverUrl: v.optional(v.string()),
    officialStarRating: v.optional(v.number()),
  })
    .index('by_md5', ['md5'])
    .index('by_attributes_version', ['attributesVersion']),

  scores: defineTable({
    userId: v.id('users'),
    mapId: v.id('maps'),
    playId: v.string(), // crypto.randomUUID() per completed play; retry key
    count300: v.number(),
    count100: v.number(),
    count50: v.number(),
    countMiss: v.number(),
    maxCombo: v.number(),
    score: v.number(),
    accuracy: v.number(),
    grade: v.string(),
    pp: v.number(),
    ppVersion: v.number(),
    isBest: v.boolean(), // best pp play by this user on this map
    inputMode: v.union(v.literal('relax'), v.literal('manual')),
    forgiveness: v.number(),
    cursorAnchor: v.union(v.literal('palm'), v.literal('index')),
  })
    .index('by_user_play', ['userId', 'playId'])
    .index('by_user_map', ['userId', 'mapId'])
    .index('by_user_map_pp', ['userId', 'mapId', 'pp'])
    .index('by_map_best', ['mapId', 'isBest', 'pp'])
    .index('by_user_best', ['userId', 'isBest', 'pp'])
    .index('by_user', ['userId']),
});
