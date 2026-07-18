import { TableAggregate } from '@convex-dev/aggregate';
import { v } from 'convex/values';
import { components } from './_generated/api';
import { query, type MutationCtx, type QueryCtx } from './_generated/server';
import type { DataModel, Doc } from './_generated/dataModel';

export const globalBoard = new TableAggregate<{
  Key: number;
  DataModel: DataModel;
  TableName: 'users';
}>(components.globalBoard, { sortKey: (u) => -(u.totalPp ?? 0) });

export const countryBoard = new TableAggregate<{
  Namespace: string;
  Key: number;
  DataModel: DataModel;
  TableName: 'users';
}>(components.countryBoard, {
  namespace: (u) => u.boardCountryCode ?? u.countryCode ?? '??',
  sortKey: (u) => -(u.totalPp ?? 0),
});

/** Call whenever a user's totalPp (or country) may have changed. */
export async function syncBoards(
  ctx: MutationCtx,
  before: Doc<'users'> | null,
  after: Doc<'users'>,
): Promise<void> {
  const wasRanked = (before?.totalPp ?? 0) > 0;
  const isRanked = (after.totalPp ?? 0) > 0;
  if (wasRanked && isRanked && before) {
    await globalBoard.replace(ctx, before, after);
    await countryBoard.replace(ctx, before, after);
  } else if (wasRanked && before) {
    await globalBoard.deleteIfExists(ctx, before);
    await countryBoard.deleteIfExists(ctx, before);
  } else if (isRanked) {
    await globalBoard.insertIfDoesNotExist(ctx, after);
    await countryBoard.insertIfDoesNotExist(ctx, after);
  }
  if (isRanked && after.countryCode && after.countryName) {
    const seen = await ctx.db
      .query('countries')
      .withIndex('by_code', (q) => q.eq('code', after.countryCode!))
      .unique();
    if (!seen) {
      await ctx.db.insert('countries', { code: after.countryCode, name: after.countryName });
    }
  }
}

export async function userRanks(
  ctx: QueryCtx | MutationCtx,
  user: Doc<'users'>,
): Promise<{ globalRank: number | null; countryRank: number | null }> {
  if ((user.totalPp ?? 0) <= 0) return { globalRank: null, countryRank: null };
  const globalRank = 1 + (await globalBoard.indexOfDoc(ctx, user));
  const countryRank = user.countryCode
    ? 1 + (await countryBoard.indexOfDoc(ctx, user))
    : null;
  return { globalRank, countryRank };
}

const PAGE = 50;

export const page = query({
  args: { countryCode: v.optional(v.string()), offset: v.number() },
  handler: async (ctx, { countryCode, offset }) => {
    const total = countryCode
      ? await countryBoard.count(ctx, { namespace: countryCode, bounds: {} })
      : await globalBoard.count(ctx);
    const offsets = Array.from(
      { length: Math.max(0, Math.min(PAGE, total - offset)) },
      (_, i) => offset + i,
    );
    const items = countryCode
      ? await countryBoard.atBatch(
          ctx,
          offsets.map((itemOffset) => ({ offset: itemOffset, namespace: countryCode })),
        )
      : await globalBoard.atBatch(
          ctx,
          offsets.map((itemOffset) => ({ offset: itemOffset })),
        );
    const users = await Promise.all(items.map((item) => ctx.db.get(item.id)));
    const rows = users.flatMap((u, i) =>
      u
        ? [
            {
              rank: offsets[i] + 1,
              osuId: u.osuId,
              name: u.name,
              image: u.image,
              countryCode: u.countryCode,
              totalPp: u.totalPp ?? 0,
              hitAccuracy: u.hitAccuracy ?? 0,
              playCount: u.playCount ?? 0,
            },
          ]
        : [],
    );
    return { total, rows };
  },
});

export const countries = query({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query('countries').collect();
    return all
      .map(({ code, name }) => ({ code, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  },
});
