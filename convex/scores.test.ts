import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { convexTest } from 'convex-test';
import aggregate from '@convex-dev/aggregate/test';
import migrationComponent from '@convex-dev/migrations/test';
import { api, internal } from './_generated/api';
import schema from './schema';
import { PP_VERSION } from '../src/game/ppFormula';

const modules = import.meta.glob('./**/*.ts');

function makeTest() {
  const t = convexTest(schema, modules);
  aggregate.register(t, 'globalBoard');
  aggregate.register(t, 'countryBoard');
  migrationComponent.register(t);
  return t;
}

const mapAttributes = {
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
  difficulty: {
    starRating: 3,
    aimDifficulty: 1.5,
    speedDifficulty: 1.2,
    speedNoteCount: 60,
    flashlightDifficulty: 0,
    sliderFactor: 0.98,
    approachRate: 8,
    overallDifficulty: 7,
    drainRate: 5,
    hitCircleCount: 60,
    sliderCount: 20,
    spinnerCount: 0,
    maxCombo: 120,
  },
  attributesVersion: 2,
};

describe('scores.submit', () => {
  it('stores the same playId only once', async () => {
    const t = makeTest();
    const { userId, mapId } = await t.run(async (ctx) => {
      const userId = await ctx.db.insert('users', { osuId: 7, name: 'player' });
      const osuFileId = await ctx.storage.store(new Blob(['osu file format v14']));
      const mapId = await ctx.db.insert('maps', {
        md5: createHash('md5').update('osu file format v14').digest('hex'),
        ...mapAttributes,
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
    const history = await authed.query(api.scores.personalHistory, { mapId });
    expect(history?.best?.playId).toBe(args.playId);
    expect(history?.recent).toHaveLength(1);
    expect(await authed.action(api.mapsNode.findRegistered, { osuText: 'osu file format v14' })).toBe(mapId);
    expect(await authed.action(api.mapsNode.findRegistered, { osuText: 'unknown map' })).toBeNull();
    expect(await t.action(api.mapsNode.findRegistered, { osuText: 'osu file format v14' })).toBeNull();
    expect(await t.query(api.scores.personalHistory, { mapId })).toBeNull();
    const otherId = await t.run((ctx) => ctx.db.insert('users', { osuId: 99, name: 'other' }));
    const other = t.withIdentity({ subject: `${otherId}|other-session` });
    expect((await other.query(api.scores.personalHistory, { mapId }))?.recent).toEqual([]);

  });

  it('marks a better replay as best and flips the old flag', async () => {
    const t = makeTest();
    const { userId, mapId } = await t.run(async (ctx) => {
      const userId = await ctx.db.insert('users', { osuId: 8, name: 'p2' });
      const osuFileId = await ctx.storage.store(new Blob(['osu file format v14']));
      const mapId = await ctx.db.insert('maps', {
        md5: 'b'.repeat(32),
        ...mapAttributes,
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
    const history = await authed.query(api.scores.personalHistory, { mapId });
    expect(history?.best?.pp).toBeCloseTo(strong.pp, 10);
    expect(history?.recent.map((play) => play.playId)).toEqual([
      '33333333-3333-4333-8333-333333333333',
      '22222222-2222-4222-8222-222222222222',
    ]);
  });
});

describe('migrations.recalcScores', () => {
  it('fails until map attributes are refreshed, then resumes', async () => {
    const t = makeTest();
    const { mapId, scoreId } = await t.run(async (ctx) => {
      const userId = await ctx.db.insert('users', { name: 'player' });
      const osuFileId = await ctx.storage.store(new Blob(['pending map']));
      const mapId = await ctx.db.insert('maps', {
        md5: 'c'.repeat(32),
        ...mapAttributes,
        difficulty: undefined,
        attributesVersion: 1,
        osuFileId,
      });
      const scoreId = await ctx.db.insert('scores', {
        userId,
        mapId,
        playId: '44444444-4444-4444-8444-444444444444',
        count300: 100,
        count100: 0,
        count50: 0,
        countMiss: 0,
        maxCombo: 100,
        score: 1000,
        accuracy: 1,
        grade: 'SS',
        pp: 100,
        ppVersion: PP_VERSION - 1,
        isBest: true,
        inputMode: 'relax',
        forgiveness: 1.5,
        cursorAnchor: 'palm',
      });
      return { mapId, scoreId };
    });
    const migrationArgs = { cursor: null, oneBatchOnly: true, dryRun: false };
    await expect(t.mutation(internal.migrations.recalcScores, migrationArgs)).rejects.toThrow(
      /refreshAttributes/,
    );
    await t.run(async (ctx) => {
      await ctx.db.patch(mapId, {
        attributesVersion: 2,
        difficulty: mapAttributes.difficulty,
      });
    });
    const result = await t.mutation(internal.migrations.recalcScores, migrationArgs);
    expect(result).toMatchObject({ isDone: true, processed: 1 });
    await expect(
      t.run(async (ctx) => (await ctx.db.get(scoreId))?.ppVersion),
    ).resolves.toBe(PP_VERSION);
  });
});

describe('leaderboard.page', () => {
  it('rejects invalid offsets', async () => {
    const t = makeTest();
    for (const offset of [-1, 0.5, Number.MAX_SAFE_INTEGER + 1]) {
      await expect(t.query(api.leaderboard.page, { offset })).rejects.toThrow(
        'offset must be a non-negative safe integer',
      );
    }
  });
});

describe('migrations.backfillBoards', () => {
  it('initializes the country namespace for legacy ranked users', async () => {
    const t = makeTest();
    const userId = await t.run((ctx) =>
      ctx.db.insert('users', {
        osuId: 10,
        name: 'legacy',
        countryCode: 'PH',
        countryName: 'Philippines',
        totalPp: 100,
        playCount: 1,
        hitAccuracy: 1,
      }),
    );
    const result = await t.mutation(internal.migrations.backfillBoards, {
      cursor: null,
      oneBatchOnly: true,
      dryRun: false,
    });
    expect(result).toMatchObject({ isDone: true, processed: 1 });
    await expect(
      t.run(async (ctx) => (await ctx.db.get(userId))?.boardCountryCode),
    ).resolves.toBe('PH');
    await expect(t.query(api.leaderboard.page, { countryCode: 'PH', offset: 0 })).resolves.toMatchObject({
      total: 1,
      rows: [{ osuId: 10 }],
    });
  });
});
