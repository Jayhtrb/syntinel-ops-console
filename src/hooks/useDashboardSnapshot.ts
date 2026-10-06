import { useCallback, useEffect, useRef, useState } from 'react';
import type { CloudId, DashboardQuery, DashboardSnapshot, DataScenario, DateRangeId, ApplicationId, SnapshotPhase } from '../types/dashboard';
import { fetchDashboardSnapshot } from '../data/dashboardRepository';

export interface DashboardState {
  phase: SnapshotPhase;
  snapshot: DashboardSnapshot | null;
  error: string | null;
  /** Real wall-clock instant of the last successful load. */
  loadedAtIso: string | null;
  reload: () => void;
}

export interface DashboardQueryInput {
  application: ApplicationId;
  range: DateRangeId;
  cloud: CloudId;
  regionId: string;
  scenario: DataScenario;
}

/**
 * Loads the snapshot for a query.
 *
 * - first load and scenario switches show skeletons (`loading`)
 * - filter changes keep the previous snapshot visible and mark it `refreshing`,
 *   so the table never flashes empty while a filter settles
 * - failures keep the last good snapshot in state and surface an error banner
 */
export function useDashboardSnapshot(input: DashboardQueryInput): DashboardState {
  const [phase, setPhase] = useState<SnapshotPhase>('loading');
  const [snapshot, setSnapshot] = useState<DashboardSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadedAtIso, setLoadedAtIso] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  const snapshotRef = useRef<DashboardSnapshot | null>(null);
  snapshotRef.current = snapshot;

  const { application, range, cloud, regionId, scenario } = input;

  useEffect(() => {
    const controller = new AbortController();
    const query: DashboardQuery = { application, range, cloud, regionId, scenario };

    if (scenario === 'loading') {
      setPhase('loading');
      setError(null);
      return () => controller.abort();
    }

    setPhase(snapshotRef.current ? 'refreshing' : 'loading');
    setError(null);

    fetchDashboardSnapshot(query, { signal: controller.signal })
      .then((next) => {
        setSnapshot(next);
        setPhase('ready');
        setLoadedAtIso(new Date().toISOString());
      })
      .catch((cause: unknown) => {
        if (cause instanceof DOMException && cause.name === 'AbortError') return;
        setError(cause instanceof Error ? cause.message : 'Unknown telemetry failure');
        setPhase('error');
      });

    return () => controller.abort();
  }, [application, range, cloud, regionId, scenario, nonce]);

  const reload = useCallback(() => setNonce((value) => value + 1), []);

  return { phase, snapshot, error, loadedAtIso, reload };
}
