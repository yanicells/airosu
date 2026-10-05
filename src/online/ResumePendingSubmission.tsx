import { useEffect, useRef } from 'react';
import { useAction, useMutation, useQuery } from 'convex/react';
import { ConvexError } from 'convex/values';
import { api } from '../../convex/_generated/api';
import { clearPendingSubmission, readPendingSubmission, scoreArgs } from './pendingSubmission';

/**
 * Submits a play a guest finished before signing in, once they return from the osu! OAuth
 * redirect. Renders nothing; the play shows up on their profile and the map's leaderboard.
 */
export function ResumePendingSubmission() {
  const me = useQuery(api.users.me);
  const registerMap = useAction(api.mapsNode.registerMap);
  const submitScore = useMutation(api.scores.submit);
  const startedRef = useRef(false);

  useEffect(() => {
    if (!me || startedRef.current) return;
    const pending = readPendingSubmission();
    if (!pending) return;
    startedRef.current = true;
    void (async () => {
      try {
        const mapId = await registerMap({ osuText: pending.osuText });
        await submitScore(scoreArgs(pending.play, mapId));
        clearPendingSubmission();
      } catch (error) {
        // the server rejected it for good; transient failures retry on the next load
        if (error instanceof ConvexError) clearPendingSubmission();
      }
    })();
  }, [me, registerMap, submitScore]);

  return null;
}
