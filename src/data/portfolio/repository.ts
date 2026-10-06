import { adapterForDomain, toolLabel } from '../sources';
import type { HealthStatus, IncidentTrend, PortfolioHealth, ServiceHealth } from '../../types/portfolio';

/**
 * Portfolio health repository.
 *
 * Assembles the RAG portfolio map and the per-service drill-down from whatever
 * adapter currently powers the `service-health` and `incidents` domains. Swapping
 * the data source is a `src/data/sources.ts` change; the UI never changes.
 */

export interface PortfolioSnapshot {
  portfolios: PortfolioHealth[];
  services: ServiceHealth[];
  /** Human-readable source labels for the footer/provenance line. */
  sourceLabels: { health: string; incidents: string };
}

export async function fetchPortfolioSnapshot(): Promise<PortfolioSnapshot> {
  const health = adapterForDomain('service-health');
  const incidents = adapterForDomain('incidents');
  const [portfolios, services] = await Promise.all([health.getPortfolios(), health.getServices()]);
  return {
    portfolios,
    services,
    sourceLabels: {
      health: toolLabel(health.kind),
      incidents: toolLabel(incidents.kind),
    },
  };
}

export async function fetchIncidentTrend(scope: {
  id: string;
  label: string;
  kind: 'portfolio' | 'service';
  status: HealthStatus;
}): Promise<IncidentTrend> {
  return adapterForDomain('incidents').getIncidentTrend(scope);
}
