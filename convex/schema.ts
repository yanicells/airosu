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
});
