import Osu from '@auth/core/providers/osu';
import { convexAuth } from '@convex-dev/auth/server';

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
});
