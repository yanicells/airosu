import { useEffect, useState } from 'react';
import { useAction, useConvexAuth, useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';

export function usePersonalScores(osuText?: string, registeredMapId?: Id<'maps'>) {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const findRegistered = useAction(api.mapsNode.findRegistered);
  const [lookup, setLookup] = useState<{ text: string; id: Id<'maps'> | null; error?: string }>();
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!isAuthenticated || !osuText || registeredMapId) return;
    let active = true;
    setLookup(undefined);
    findRegistered({ osuText }).then((id) => {
      if (active) setLookup({ text: osuText, id });
    }).catch(() => {
      if (active) setLookup({ text: osuText, id: null, error: 'Could not load your scores.' });
    });
    return () => { active = false; };
  }, [isAuthenticated, osuText, registeredMapId, findRegistered, retry]);
  const current = lookup?.text === osuText ? lookup : undefined;
  const mapId = registeredMapId ?? current?.id;
  const history = useQuery(api.scores.personalHistory,
    isAuthenticated && mapId ? { mapId } : 'skip');
  return {
    history, mapId, isAuthenticated,
    loading: isLoading || (isAuthenticated && !!osuText && !current && !registeredMapId)
      || (!!mapId && isAuthenticated && history === undefined),
    error: current?.error,
    retry: () => setRetry((value) => value + 1),
  };
}
