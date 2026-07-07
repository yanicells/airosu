import { useEffect, useState } from 'react';

/**
 * Object URL for a Blob, StrictMode-safe: the URL is created inside the
 * effect, so the double mount revokes the first URL and issues a fresh one
 * (a useMemo-created URL would survive the remount already revoked).
 */
export function useObjectUrl(blob: Blob | undefined): string | undefined {
  const [url, setUrl] = useState<string>();

  useEffect(() => {
    if (!blob) {
      setUrl(undefined);
      return;
    }
    const next = URL.createObjectURL(blob);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [blob]);

  return url;
}
