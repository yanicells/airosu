import Osu from '@auth/core/providers/osu';
import { convexAuth } from '@convex-dev/auth/server';
import { syncBoards } from './leaderboard';

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Osu({
      profile(profile) {
        return {
          id: String(profile.id),
          name: profile.username,
          image: profile.avatar_url,
          osuId: profile.id,
          countryCode: profile.country?.code,
          countryName: profile.country?.name,
        };
      },
    }),
  ],
  callbacks: {
    // Moves an already-ranked user between country namespaces when their
    // osu! country changes. New/unranked users enter the boards on first submit.
    async afterUserCreatedOrUpdated(ctx, { userId }) {
      const before = await ctx.db.get(userId);
      if (!before || before.boardCountryCode === before.countryCode) return;
      await ctx.db.patch(userId, { boardCountryCode: before.countryCode });
      const after = await ctx.db.get(userId);
      if (after) await syncBoards(ctx, before, after);
    },
  },
});
