import { tokens } from '../../theme/tokens';
import type { CloudId, LoginRow, RegionSessionRow } from '../../types/dashboard';
import { buildBuckets, buildWave, mulberry32 } from './series';
import { sessionStatus } from '../../lib/status';

/**
 * Platform telemetry: Citrix cloud sessions and workstation application logins.
 *
 * PROVENANCE
 * - Captured: AWS Singapore current = 298, Azure Singapore current = 206, and the
 *   AWS/Azure region tab labels for both clouds.
 * - Captured: workstation login totals - Customer Service 219, Collections 1,
 *   Fraud 84, Deposit 0, Echat 0 - plus "Active Users: 3".
 * - Synthesised: every other region's session count, all peak/average values, the
 *   login `peak` capacity reference and the day-over-day login deltas. Series
 *   shapes follow the captured 24h waveform (twin daily peaks, overnight troughs).
 */

export const ACTIVE_USERS = 3;

export interface RegionSeed {
  id: string;
  cloud: CloudId;
  region: string;
  /** Current concurrent sessions - 298/206 are captured, the rest synthesised. */
  current: number;
  peak: number;
  average: number;
  deltaPercent: number;
}

export const REGION_SEEDS: RegionSeed[] = [
  { id: 'aws-singapore', cloud: 'aws', region: 'Singapore', current: 298, peak: 2136, average: 842, deltaPercent: 12.4 },
  { id: 'aws-mumbai', cloud: 'aws', region: 'Mumbai', current: 154, peak: 604, average: 231, deltaPercent: -4.1 },
  { id: 'aws-us-east', cloud: 'aws', region: 'US East', current: 96, peak: 388, average: 147, deltaPercent: 2.8 },
  { id: 'aws-us-west', cloud: 'aws', region: 'US West', current: 41, peak: 176, average: 66, deltaPercent: -11.6 },
  { id: 'azure-singapore', cloud: 'azure', region: 'Azure Singapore', current: 206, peak: 522, average: 214, deltaPercent: 6.2 },
  { id: 'azure-mumbai', cloud: 'azure', region: 'Azure Mumbai', current: 118, peak: 342, average: 138, deltaPercent: 1.4 },
  { id: 'azure-us-east', cloud: 'azure', region: 'Azure US East', current: 74, peak: 246, average: 96, deltaPercent: -3.3 },
  { id: 'azure-us-west', cloud: 'azure', region: 'Azure US West', current: 33, peak: 118, average: 44, deltaPercent: -8.9 },
];

export const CLOUD_LABELS: Record<CloudId, string> = {
  aws: 'Citrix Cloud AWS',
  azure: 'Citrix Cloud Azure',
};

export function buildRegionRows(seeds: RegionSeed[] = REGION_SEEDS): RegionSessionRow[] {
  return seeds.map((seed) => ({
    id: seed.id,
    cloud: seed.cloud,
    cloudLabel: CLOUD_LABELS[seed.cloud],
    region: seed.region,
    current: seed.current,
    peak: seed.peak,
    average: seed.average,
    deltaPercent: seed.deltaPercent,
    status: sessionStatus(seed.current, seed.average),
  }));
}

/** Concurrent-session wave for one region, scaled to its captured amplitude. */
export function buildSessionSeries(regionId: string, buckets: ReturnType<typeof buildBuckets>): number[] {
  const seed = REGION_SEEDS.find((r) => r.id === regionId) ?? REGION_SEEDS[0];
  const cloudOffset = seed.cloud === 'aws' ? 0 : 71;

  // Twin daily peaks (period 12h) reproduce the captured Citrix sawtooth.
  return buildWave(buckets, {
    seed: 1013 + cloudOffset + seed.id.length * 17,
    base: seed.peak * 0.06,
    amplitude: seed.peak * 0.47,
    periodHours: 12,
    peakHour: seed.cloud === 'aws' ? 7 : 8,
    noise: seed.peak * 0.06,
    floor: 0,
    ceiling: seed.peak * 1.06,
    daySkew: 0.34,
    pinLast: seed.current,
    pinSpan: 3,
  });
}

/** Aggregate current sessions per cloud, for the KPI row and cloud switch. */
export function cloudTotals(rows: RegionSessionRow[], cloud: CloudId) {
  const owned = rows.filter((row) => row.cloud === cloud);
  return {
    current: owned.reduce((sum, row) => sum + row.current, 0),
    peak: owned.reduce((sum, row) => sum + row.peak, 0),
    regions: owned.length,
  };
}

export interface LoginSeed {
  id: string;
  application: string;
  users: number;
  /** Synthesised capacity reference used as the meter denominator. */
  peak: number;
  changeVsPriorDay: number;
}

/** Captured workstation login table. */
export const LOGIN_SEEDS: LoginSeed[] = [
  { id: 'customer-service', application: 'Customer Service', users: 219, peak: 246, changeVsPriorDay: 6.3 },
  { id: 'fraud', application: 'Fraud', users: 84, peak: 96, changeVsPriorDay: 2.4 },
  { id: 'collections', application: 'Collections', users: 1, peak: 14, changeVsPriorDay: -85.7 },
  { id: 'deposit', application: 'Deposit', users: 0, peak: 0, changeVsPriorDay: -100 },
  { id: 'echat', application: 'Echat', users: 0, peak: 0, changeVsPriorDay: 0 },
];

export function buildLoginRows(seeds: LoginSeed[] = LOGIN_SEEDS): LoginRow[] {
  return seeds.map((seed) => ({
    id: seed.id,
    application: seed.application,
    users: seed.users,
    peak: seed.peak,
    changeVsPriorDay: seed.changeVsPriorDay,
    status: seed.users > 0 ? 'nominal' : 'idle',
    note: seed.users > 0 ? 'Sessions active' : 'No logins recorded in the window',
  }));
}

/** Login/payment activity waves used by the "Workstation activity" trend view. */
export function buildActivitySeries(buckets: ReturnType<typeof buildBuckets>) {
  const logins = buildWave(buckets, {
    seed: 4409,
    base: 560,
    amplitude: 300,
    periodHours: 24,
    peakHour: 14,
    noise: 150,
    floor: 120,
    ceiling: 1000,
    daySkew: 0.2,
  });
  const payments = buildWave(buckets, {
    seed: 7717,
    base: 360,
    amplitude: 230,
    periodHours: 24,
    peakHour: 11,
    noise: 120,
    floor: 60,
    ceiling: 900,
    daySkew: 0.24,
  });
  return { logins, payments };
}

/** Small, deterministic sparkline for a KPI card. */
export function buildSpark(seed: number, length = 14, base = 50, amplitude = 18): number[] {
  const rand = mulberry32(seed);
  const out: number[] = [];
  for (let i = 0; i < length; i += 1) {
    const value = base + Math.sin(i / 2.2 + seed * 0.05) * amplitude + (rand() - 0.5) * amplitude * 0.5;
    out.push(Number(value.toFixed(2)));
  }
  return out;
}

export const TREND_COLORS = {
  primary: tokens.chart.series1,
  secondary: tokens.chart.series2,
  tertiary: tokens.chart.series3,
  critical: tokens.chart.series4,
  muted: tokens.chart.series5,
} as const;
