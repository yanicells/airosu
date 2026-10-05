import { useMemo } from 'react';
import { useConvexAuth, useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import { md5Hex } from '../../online/md5';

/** The signed-in player's history on a difficulty; follows the map as soon as it gets registered. */
export function usePersonalScores(osuText?: string, registeredMapId?: Id<'maps'>) {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const md5 = useMemo(() => (osuText ? md5Hex(osuText) : undefined), [osuText]);
  const lookedUp = useQuery(
    api.maps.idByMd5,
    isAuthenticated && md5 && !registeredMapId ? { md5 } : 'skip',
  );
  const mapId = registeredMapId ?? lookedUp ?? undefined;
  const history = useQuery(
    api.scores.personalHistory,
    isAuthenticated && mapId ? { mapId } : 'skip',
  );
  return {
    history,
    mapId,
    isAuthenticated,
    loading:
      isLoading ||
      (isAuthenticated && !!md5 && !registeredMapId && lookedUp === undefined) ||
      (!!mapId && isAuthenticated && history === undefined),
  };
}
