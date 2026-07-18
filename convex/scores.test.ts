import { describe, expect, it } from 'vitest';
import { convexTest } from 'convex-test';
import aggregate from '@convex-dev/aggregate/test';
import { api } from './_generated/api';
import schema from './schema';

const modules = import.meta.glob('./**/*.ts');

function makeTest() {
  const t = convexTest(schema, modules);
  aggregate.register(t, 'globalBoard');
  aggregate.register(t, 'countryBoard');
  return t;
}

describe('scores.submit', () => {
  it('stores the same playId only once', async () => {
    const t = makeTest();
    const { userId, mapId } = await t.run(async (ctx) => {
      const userId = await ctx.db.insert('users', { osuId: 7, name: 'player' });
      const osuFileId = await ctx.storage.store(new Blob(['osu file format v14']));
      const mapId = await ctx.db.insert('maps', {
        md5: 'a'.repeat(32),
        title: 'T',
        artist: 'A',
        version: 'Hard',
        creator: 'M',
        bpm: 120,
        lengthMs: 60_000,
        cs: 4,
        ar: 8,
        od: 7,
        hp: 5,
        starRating: 3,
        maxCombo: 120,
        objectCount: 80,
        judgmentCount: 100,
        ssPp: 100,
        attributesVersion: 1,
        osuFileId,
      });
      return { userId, mapId };
    });
    const authed = t.withIdentity({ subject: `${userId}|test-session` });
    const args = {
      playId: '11111111-1111-4111-8111-111111111111',
      mapId,
      count300: 100,
      count100: 0,
      count50: 0,
      countMiss: 0,
      maxCombo: 100,
      score: 123_456,
      inputMode: 'relax' as const,
      forgiveness: 1.5,
      cursorAnchor: 'palm' as const,
    };

    const first = await authed.mutation(api.scores.submit, args);
    const second = await authed.mutation(api.scores.submit, args);
    expect(second).toEqual(first);
    const state = await t.run(async (ctx) => ({
      scores: await ctx.db.query('scores').collect(),
      user: await ctx.db.get(userId),
    }));
    expect(state.scores).toHaveLength(1);
    expect(state.user?.playCount).toBe(1);
  });

  it('marks a better replay as best and flips the old flag', async () => {
    const t = makeTest();
    const { userId, mapId } = await t.run(async (ctx) => {
      const userId = await ctx.db.insert('users', { osuId: 8, name: 'p2' });
      const osuFileId = await ctx.storage.store(new Blob(['osu file format v14']));
      const mapId = await ctx.db.insert('maps', {
        md5: 'b'.repeat(32),
        title: 'T',
        artist: 'A',
        version: 'Hard',
        creator: 'M',
        bpm: 120,
        lengthMs: 60_000,
        cs: 4,
        ar: 8,
        od: 7,
        hp: 5,
        starRating: 3,
        maxCombo: 120,
        objectCount: 80,
        judgmentCount: 100,
        ssPp: 100,
        attributesVersion: 1,
        osuFileId,
      });
      return { userId, mapId };
    });
    const authed = t.withIdentity({ subject: `${userId}|test-session` });
    const base = {
      mapId,
      count50: 0,
      score: 1000,
      inputMode: 'relax' as const,
      forgiveness: 1.5,
      cursorAnchor: 'palm' as const,
    };
    const weak = await authed.mutation(api.scores.submit, {
      ...base,
      playId: '22222222-2222-4222-8222-222222222222',
      count300: 60,
      count100: 30,
      countMiss: 10,
      maxCombo: 40,
    });
    const strong = await authed.mutation(api.scores.submit, {
      ...base,
      playId: '33333333-3333-4333-8333-333333333333',
      count300: 100,
      count100: 0,
      countMiss: 0,
      maxCombo: 100,
    });
    expect(weak.isBest).toBe(true);
    expect(strong.isBest).toBe(true);
    expect(strong.pp).toBeGreaterThan(weak.pp);
    const state = await t.run(async (ctx) => ({
      best: (await ctx.db.query('scores').collect()).filter((s) => s.isBest),
      user: await ctx.db.get(userId),
    }));
    expect(state.best).toHaveLength(1);
    expect(state.best[0].pp).toBeCloseTo(strong.pp, 10);
    expect(state.user?.totalPp).toBeCloseTo(strong.pp, 10);
    expect(state.user?.playCount).toBe(2);
  });
});
