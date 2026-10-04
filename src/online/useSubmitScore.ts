import { useCallback, useEffect, useRef, useState } from 'react';
import { useAction, useMutation, useQuery } from 'convex/react';
import { ConvexError } from 'convex/values';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import { useAppState } from '../ui/appState';
import { savePendingSubmission, scoreArgs } from './pendingSubmission';

export type SubmitStatus = 'signedOut' | 'idle' | 'submitting' | 'done' | 'error';

/** Submits the finished play once; exposes retry. Never blocks gameplay. */
export function useSubmitScore() {
  const { map, lastResult } = useAppState();
  const me = useQuery(api.users.me);
  const registerMap = useAction(api.mapsNode.registerMap);
  const submitScore = useMutation(api.scores.submit);
  const [status, setStatus] = useState<SubmitStatus>('idle');
  const [result, setResult] = useState<{ pp: number; isBest: boolean }>();
  const [mapId, setMapId] = useState<Id<'maps'>>();
  const [error, setError] = useState<string>();
  const startedRef = useRef(false);

  const submit = useCallback(() => {
    if (!map || !lastResult || !me) return;
    setStatus('submitting');
    setError(undefined);
    void (async () => {
      try {
        const mapId = await registerMap({ osuText: map.rawOsu });
        setMapId(mapId);
        const res = await submitScore(scoreArgs(lastResult, mapId));
        setResult({ pp: res.pp, isBest: res.isBest });
        setStatus('done');
      } catch (e) {
        setError(e instanceof ConvexError ? String(e.data) : 'submission failed');
        setStatus('error');
      }
    })();
  }, [map, lastResult, me, registerMap, submitScore]);

  useEffect(() => {
    if (me === null) {
      setStatus('signedOut');
      // osu! sign-in is a full-page redirect; keep the play so it can submit on return
      if (map && lastResult) savePendingSubmission({ osuText: map.rawOsu, play: lastResult });
      return;
    }
    if (me && !startedRef.current && map && lastResult) {
      startedRef.current = true;
      submit();
    }
  }, [me, map, lastResult, submit]);

  return { status, result, mapId, error, submit };
}
