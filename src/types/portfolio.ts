/**
 * Portfolio health domain model.
 *
 * The RAG (red / amber / green) health hierarchy is the executive view: each
 * portfolio rolls up the health of its services, and every service carries a
 * human impact description plus an incident trend.
 */

export type HealthStatus = 'green' | 'amber' | 'red';

export interface PortfolioHealth {
  id: string;
  name: string;
  description: string;
  serviceCount: number;
  healthy: number;
  warning: number;
  critical: number;
  status: HealthStatus;
  /** Human summary of what is wrong, or a clear "all healthy" statement. */
  impactSummary: string;
  incidentCount: number;
  /** Tools that feed this portfolio's health. */
  sources: string[];
}

export interface ServiceHealth {
  id: string;
  name: string;
  capability: string;
  description: string;
  portfolioId: string;
  status: HealthStatus;
  impactDescription: string;
  incidentCount: number;
  openIncidents: number;
  latencyMs: number | null;
  errorRate: number | null;
}

export interface IncidentPoint {
  t: string;
  label: string;
  count: number;
}

export interface IncidentTrend {
  scopeId: string;
  scopeLabel: string;
  scopeKind: 'portfolio' | 'service';
  source: string;
  points: IncidentPoint[];
  total: number;
  peak: number;
  current: number;
}
