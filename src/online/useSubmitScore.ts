import { useCallback, useEffect, useRef, useState } from 'react';
import { useAction, useMutation, useQuery } from 'convex/react';
import { ConvexError } from 'convex/values';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import { useAppState } from '../ui/appState';

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
        const res = await submitScore({
          playId: lastResult.playId,
          mapId,
          count300: lastResult.counts[300],
          count100: lastResult.counts[100],
          count50: lastResult.counts[50],
          countMiss: lastResult.counts[0],
          maxCombo: lastResult.maxCombo,
          score: lastResult.score,
          inputMode: lastResult.inputMode,
          forgiveness: lastResult.forgiveness,
          cursorAnchor: lastResult.cursorAnchor,
        });
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
      return;
    }
    if (me && !startedRef.current && map && lastResult) {
      startedRef.current = true;
      submit();
    }
  }, [me, map, lastResult, submit]);

  return { status, result, mapId, error, submit };
}
