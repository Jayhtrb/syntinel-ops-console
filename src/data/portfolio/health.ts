import { PORTFOLIO_SEEDS, SERVICE_SEEDS, type PortfolioServiceSeed } from './mapping';
import { buildBuckets, buildWave, mulberry32, type Bucket } from '../mock/series';
import type { HealthStatus, IncidentTrend, PortfolioHealth, ServiceHealth } from '../../types/portfolio';

/**
 * Deterministic health synthesis for the mock data source.
 *
 * Portfolio and service RAG states, impact descriptions and incident series are
 * all pure functions of the seed ids, so a refresh always returns the same
 * picture. Curated degradations are listed explicitly; everything else falls
 * back to a seeded hash so the map still has realistic amber/red texture.
 */

const GREEN: HealthStatus = 'green';
const AMBER: HealthStatus = 'amber';
const RED: HealthStatus = 'red';

/** FNV-1a hash -> stable 32-bit integer for any id. */
function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Curated degradations: service name -> status + human impact line. */
const CURATED: Record<string, { status: HealthStatus; impact: string }> = {
  insertPayment: {
    status: RED,
    impact: 'Payment processing degraded — customer payments are failing or timing out; elevated timeouts reported.',
  },
  VerifyOTPsvc: {
    status: AMBER,
    impact: 'OTP verification latency above target — identity checks are slowing.',
  },
  CardSecurityService: {
    status: AMBER,
    impact: 'Card security verification intermittently unavailable.',
  },
  MWLookupService: {
    status: AMBER,
    impact: 'Downstream lookup latency above baseline.',
  },
  FDRLoginSvc: {
    status: RED,
    impact: 'Fraud application login failures — authentication to FDR is failing.',
  },
  getFraudUpdate: {
    status: AMBER,
    impact: 'Fraud investigation updates are delayed.',
  },
  getPayoffAmount: {
    status: AMBER,
    impact: 'Payoff amount lookups slower than baseline.',
  },
  infoUpdate: {
    status: AMBER,
    impact: 'Delinquent account status updates intermittently failing.',
  },
  memoManageUpdate: {
    status: AMBER,
    impact: 'Memo/notes updates returning elevated errors.',
  },
};

function curatedFor(name: string): { status: HealthStatus; impact: string } | null {
  return CURATED[name] ?? CURATED[name.toLowerCase()] ?? null;
}

function statusFor(seed: PortfolioServiceSeed): HealthStatus {
  const curated = curatedFor(seed.name);
  if (curated) return curated.status;
  const r = hash(`${seed.portfolioId}:${seed.id}`) % 100;
  if (r < 2) return RED;
  if (r < 9) return AMBER;
  return GREEN;
}

function impactFor(seed: PortfolioServiceSeed, status: HealthStatus): string {
  const curated = curatedFor(seed.name);
  if (curated) return curated.impact;
  if (status === RED) return `${seed.capability || 'Service'} degraded — requests are failing or timing out and may impact customer workflows.`;
  if (status === AMBER) return `${seed.capability || 'Service'} above baseline — performance is degraded but not failing.`;
  return 'No active impact — operating within tolerance.';
}

function scalarFor(seed: PortfolioServiceSeed, min: number, max: number): number {
  const rand = mulberry32(hash(`${seed.id}:${min}:${max}`));
  return Number((min + rand() * (max - min)).toFixed(1));
}

export function synthesizeServices(): ServiceHealth[] {
  return SERVICE_SEEDS.map((seed) => {
    const status = statusFor(seed);
    const rand = mulberry32(hash(`metrics:${seed.id}`));
    const latencyMs =
      status === RED ? scalarFor(seed, 800, 2600) : status === AMBER ? scalarFor(seed, 220, 640) : scalarFor(seed, 38, 130);
    const errorRate =
      status === RED ? scalarFor(seed, 2.0, 8.5) : status === AMBER ? scalarFor(seed, 0.5, 1.9) : Number((rand() * 0.05).toFixed(3));
    const openIncidents = status === RED ? 3 + Math.floor(rand() * 6) : status === AMBER ? 1 + Math.floor(rand() * 3) : 0;
    return {
      id: seed.id,
      name: seed.name,
      capability: seed.capability,
      description: seed.description,
      portfolioId: seed.portfolioId,
      status,
      impactDescription: impactFor(seed, status),
      incidentCount: openIncidents,
      openIncidents,
      latencyMs: Math.round(latencyMs),
      errorRate,
    };
  });
}

const STATUS_RANK: Record<HealthStatus, number> = { green: 0, amber: 1, red: 2 };

export function synthesizePortfolios(services: ServiceHealth[]): PortfolioHealth[] {
  return PORTFOLIO_SEEDS.map((seed) => {
    const owned = services.filter((service) => service.portfolioId === seed.id);
    const critical = owned.filter((service) => service.status === RED).length;
    const warning = owned.filter((service) => service.status === AMBER).length;
    const healthy = owned.filter((service) => service.status === GREEN).length;
    const status: HealthStatus = critical > 0 ? RED : warning > 0 ? AMBER : GREEN;
    const offenders = owned
      .filter((service) => service.status !== GREEN)
      .sort((a, b) => STATUS_RANK[b.status] - STATUS_RANK[a.status])
      .slice(0, 2)
      .map((service) => `${service.name} (${service.status})`);
    const impactSummary =
      status === GREEN
        ? 'All services healthy — no active impact.'
        : `${critical > 0 ? `${critical} critical` : ''}${critical > 0 && warning > 0 ? ', ' : ''}${warning > 0 ? `${warning} degraded` : ''}: ${offenders.join('; ')}.`;
    return {
      id: seed.id,
      name: seed.name,
      description: seed.description,
      serviceCount: owned.length,
      healthy,
      warning,
      critical,
      status,
      impactSummary,
      incidentCount: owned.reduce((sum, service) => sum + service.incidentCount, 0),
      sources: ['New Relic', 'ServiceNow', 'Splunk'],
    };
  });
}

function incidentBuckets(): Bucket[] {
  // 14 days at six-hour resolution is enough to see a trend and a recent spike.
  return buildBuckets(56, 360, 'dayClock');
}

export function synthesizeIncidentTrend(scope: {
  id: string;
  label: string;
  kind: 'portfolio' | 'service';
  status: HealthStatus;
}): IncidentTrend {
  const buckets = incidentBuckets();
  const seed = hash(`incidents:${scope.id}`);
  const base = scope.status === RED ? 3.2 : scope.status === AMBER ? 1.3 : 0.25;
  const values = buildWave(buckets, {
    seed,
    base,
    amplitude: base * 1.9,
    periodHours: 24,
    peakHour: 13,
    noise: base * 0.9,
    floor: 0,
    ceiling: 44,
    // Degraded scopes trend upward so the "recent escalation" reads instantly.
    drift: scope.status === RED ? 0.045 : scope.status === AMBER ? 0.018 : 0,
  });
  const points = buckets.map((bucket, index) => ({
    t: bucket.t,
    label: bucket.label,
    count: Math.max(0, Math.round(values[index] ?? 0)),
  }));
  const total = points.reduce((sum, point) => sum + point.count, 0);
  const peak = points.reduce((max, point) => Math.max(max, point.count), 0);
  return {
    scopeId: scope.id,
    scopeLabel: scope.label,
    scopeKind: scope.kind,
    source: 'ServiceNow',
    points,
    total,
    peak,
    current: points.length > 0 ? points[points.length - 1].count : 0,
  };
}
