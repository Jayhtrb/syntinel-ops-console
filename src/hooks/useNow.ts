import { useEffect, useState } from 'react';

/**
 * Real wall-clock ticker, used only for relative "updated 12s ago" captions.
 * The telemetry timestamps themselves come from the snapshot.
 */
export function useNow(intervalMs = 1000): Date {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), intervalMs);
    return () => window.clearInterval(timer);
  }, [intervalMs]);

  return now;
}
