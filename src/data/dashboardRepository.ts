import type {
  CloudId,
  DashboardQuery,
  DashboardSnapshot,
  TrendSeriesDef,
  TrendView,
  WorkforceSummary,
} from '../types/dashboard';
import { buildBuckets, buildWave, zipPoints, summarise, MOCK_NOW_ISO, type Bucket } from './mock/series';
import {
  buildCapabilities,
  buildClientRows,
  buildServiceRows,
  summariseClients,
} from './mock/operations';
import {
  buildActivitySeries,
  buildLoginRows,
  buildRegionRows,
  buildSessionSeries,
  CLOUD_LABELS,
  REGION_SEEDS,
  TREND_COLORS,
} from './mock/platforms';
import { buildWorkforceRows, summariseWorkforce } from './mock/workforce';
import { scenarioInputs } from './mock/scenarios';
import { toSystemStatus } from './mock/system';
import { buildKpis } from './kpis';
import { buildAttention, buildNotices, buildWorkforceAttention } from './insights';
import { rangeConfig, scopeFor } from './scopes';
import { formatAht, formatForecastDeviation, formatInteger, formatPercent, formatStamp } from '../lib/format';

/**
 * Dashboard repository.
 *
 * The single seam between telemetry and UI. Swapping this file for a real HTTP
 * client is the whole migration: the snapshot shape, the derivation of KPIs,
 * attention items and notices all already live behind this interface.
 */

const LATENCY: Record<string, number> = { live: 460, warning: 420, critical: 420, empty: 320 };

function delay(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Aborted', 'AbortError'));
      return;
    }
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    function onAbort() {
      clearTimeout(timer);
      reject(new DOMException('Aborted', 'AbortError'));
    }
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

function safeMax(values: number[], fallback = 0): number {
  return values.length > 0 ? Math.max(...values) : fallback;
}

interface TrendContext {
  buckets: Bucket[];
  system: ReturnType<typeof toSystemStatus>;
  cloud: CloudId;
  regionId: string;
}

function loadTrend(ctx: TrendContext): TrendView {
  const { buckets, system } = ctx;
  const active = buildWave(buckets, {
    seed: 2201,
    base: 46,
    amplitude: 26,
    periodHours: 24,
    peakHour: 13,
    noise: 16,
    floor: 6,
    ceiling: 140,
    pinLast: system.callsActive ?? undefined,
    pinSpan: 3,
  });
  const queued = buildWave(buckets, {
    seed: 3307,
    base: 2.2,
    amplitude: 2.4,
    periodHours: 24,
    peakHour: 14,
    noise: 2.8,
    floor: 0,
    ceiling: 32,
    pinLast: system.callsQueued ?? undefined,
    pinSpan: 2,
  });
  const series: TrendSeriesDef[] = [
    { key: 'value', label: 'Calls active', color: TREND_COLORS.primary, kind: 'area', unit: 'calls', axis: 'left' },
    { key: 'compare', label: 'Calls queued', color: TREND_COLORS.tertiary, kind: 'line', unit: 'calls', axis: 'right' },
  ];
  return {
    id: 'load',
    label: 'Call load',
    description: 'Active calls against queue depth. Queue depth uses the right-hand axis.',
    unit: 'calls',
    series,
    points: zipPoints(buckets, active, queued),
    leftAxisLabel: 'Calls active',
    rightAxisLabel: 'Queued',
    rightAxisMax: 32,
    summary: {
      primary: formatInteger(safeMax(active)),
      primaryCaption: 'Peak active in window',
      secondary: formatInteger(system.callsQueued),
      secondaryCaption: 'Queued right now',
    },
    ariaSummary: `Call load across the window: active calls peaked at ${formatInteger(safeMax(active))} and stand at ${formatInteger(system.callsActive)} now, with a deepest observed queue of ${formatInteger(safeMax(queued))}.`,
  };
}

function slaTrend(ctx: TrendContext): TrendView {
  const { buckets, system } = ctx;
  const values = buildWave(buckets, {
    seed: 5501,
    base: 92.4,
    amplitude: 3.2,
    periodHours: 24,
    peakHour: 15,
    noise: 3.4,
    floor: system.slaTarget - 26,
    ceiling: 99.6,
    drift: -0.014,
    decimals: 2,
    pinLast: system.slaToday ?? undefined,
    pinSpan: 4,
  });
  const series: TrendSeriesDef[] = [
    { key: 'value', label: 'SLA %', color: TREND_COLORS.secondary, kind: 'area', unit: '%', axis: 'left' },
  ];
  const lowest = values.length > 0 ? Math.min(...values) : 0;
  return {
    id: 'sla',
    label: 'Service level',
    description: `Weighted SLA against the ${system.slaTarget}% target line. Values are percentages.`,
    unit: '%',
    series,
    points: zipPoints(buckets, values),
    leftAxisLabel: 'SLA %',
    leftAxisMin: Math.max(0, Math.floor(lowest - 4)),
    leftAxisMax: 100,
    target: { value: system.slaTarget, label: `Target ${system.slaTarget}%` },
    summary: {
      primary: formatPercent(system.slaToday),
      primaryCaption: 'SLA right now',
      secondary: formatPercent(lowest),
      secondaryCaption: 'Lowest point in window',
    },
    ariaSummary: `Service level across the window: currently ${formatPercent(system.slaToday)} against a ${system.slaTarget}% target, with a low of ${formatPercent(lowest)}.`,
  };
}

function activityTrend(ctx: TrendContext): TrendView {
  const { buckets } = ctx;
  const { logins, payments } = buildActivitySeries(buckets);
  const series: TrendSeriesDef[] = [
    { key: 'value', label: 'Login count', color: TREND_COLORS.primary, kind: 'area', unit: 'logins', axis: 'left' },
    { key: 'compare', label: 'Payment count', color: TREND_COLORS.secondary, kind: 'line', unit: 'payments', axis: 'left' },
  ];
  return {
    id: 'activity',
    label: 'Workstation activity',
    description: 'Vista business capability activity: login count against payment count.',
    unit: 'events',
    series,
    points: zipPoints(buckets, logins, payments),
    leftAxisLabel: 'Count',
    summary: {
      primary: formatInteger(safeMax(logins)),
      primaryCaption: 'Peak logins',
      secondary: formatInteger(safeMax(payments)),
      secondaryCaption: 'Peak payments',
    },
    ariaSummary: `Workstation activity: logins peaked at ${formatInteger(safeMax(logins))} and payments at ${formatInteger(safeMax(payments))} across the window.`,
  };
}

function sessionsTrend(ctx: TrendContext): TrendView {
  const { buckets, cloud, regionId } = ctx;
  const suffix = regionId.split('-').slice(1).join('-');
  const counterpartCloud: CloudId = cloud === 'aws' ? 'azure' : 'aws';
  const counterpartId = `${counterpartCloud}-${suffix}`;

  const primarySeries = buildSessionSeries(regionId, buckets);
  const compareSeries = buildSessionSeries(counterpartId, buckets);
  const regionName = (id: string) =>
    REGION_SEEDS.find((seed) => seed.id === id)?.region ?? suffix.replace(/-/g, ' ');
  const cloudLabel = (id: string) => CLOUD_LABELS[(id.startsWith('aws') ? 'aws' : 'azure') as CloudId];

  const series: TrendSeriesDef[] = [
    {
      key: 'value',
      label: `${cloudLabel(regionId)} · ${regionName(regionId)}`,
      color: cloud === 'aws' ? TREND_COLORS.primary : TREND_COLORS.secondary,
      kind: 'area',
      unit: 'sessions',
      axis: 'left',
    },
    {
      key: 'compare',
      label: `${cloudLabel(counterpartId)} · ${regionName(counterpartId)}`,
      color: counterpartCloud === 'aws' ? TREND_COLORS.primary : TREND_COLORS.secondary,
      kind: 'line',
      unit: 'sessions',
      axis: 'left',
    },
  ];

  const current = primarySeries.length > 0 ? primarySeries[primarySeries.length - 1] : 0;
  const counterpartNow = compareSeries.length > 0 ? compareSeries[compareSeries.length - 1] : 0;
  const peak = safeMax(primarySeries);
  const stats = summarise(primarySeries);

  return {
    id: 'sessions',
    label: 'Concurrent sessions',
    description: 'Paired cloud regions. Twin daily peaks reflect the working-day session curve.',
    unit: 'sessions',
    series,
    points: zipPoints(buckets, primarySeries, compareSeries),
    leftAxisLabel: 'Established sessions',
    summary: {
      primary: formatInteger(peak),
      primaryCaption: 'Peak sessions in window',
      secondary: formatInteger(stats.average),
      secondaryCaption: 'Average sessions',
    },
    ariaSummary: `Concurrent sessions for ${cloudLabel(regionId)} ${regionName(regionId)}: peak ${formatInteger(peak)}, average ${formatInteger(stats.average)}, currently ${formatInteger(current)}. The paired ${cloudLabel(counterpartId)} region currently stands at ${formatInteger(counterpartNow)}.`,
  };
}

function buildTrends(buckets: Bucket[], system: ReturnType<typeof toSystemStatus>, cloud: CloudId, regionId: string) {
  const ctx: TrendContext = { buckets, system, cloud, regionId };
  return [loadTrend(ctx), slaTrend(ctx), activityTrend(ctx), sessionsTrend(ctx)];
}

function adherenceTrend(buckets: Bucket[], summary: WorkforceSummary): TrendView {
  const values = buildWave(buckets, {
    seed: 811,
    base: 86,
    amplitude: 5.4,
    periodHours: 24,
    peakHour: 11,
    noise: 3.2,
    floor: 55,
    ceiling: 99,
    drift: 0.01,
    decimals: 1,
    pinLast: summary.adherence ?? undefined,
    pinSpan: 4,
  });
  const lowest = values.length > 0 ? Math.min(...values) : 0;
  return {
    id: 'adherence',
    label: 'Adherence',
    description: `Agent schedule adherence against the ${summary.adherenceTarget}% target.`,
    unit: '%',
    series: [{ key: 'value', label: 'Adherence %', color: TREND_COLORS.primary, kind: 'area', unit: '%', axis: 'left' }],
    points: zipPoints(buckets, values),
    leftAxisLabel: 'Adherence %',
    leftAxisMin: Math.max(0, Math.floor(lowest - 4)),
    leftAxisMax: 100,
    target: { value: summary.adherenceTarget, label: `Target ${summary.adherenceTarget}%` },
    summary: {
      primary: formatPercent(summary.adherence),
      primaryCaption: 'Adherence right now',
      secondary: formatPercent(lowest),
      secondaryCaption: 'Lowest point in window',
    },
    ariaSummary: `Schedule adherence is ${formatPercent(summary.adherence)} against a ${summary.adherenceTarget}% target, with a low of ${formatPercent(lowest)} across the window.`,
  };
}

function ahtTrend(buckets: Bucket[], summary: WorkforceSummary): TrendView {
  const values = buildWave(buckets, {
    seed: 1319,
    base: 390,
    amplitude: 42,
    periodHours: 24,
    peakHour: 12,
    noise: 22,
    floor: 300,
    ceiling: 560,
    drift: -0.02,
    pinLast: summary.ahtSeconds ?? undefined,
    pinSpan: 4,
  });
  const lowest = values.length > 0 ? Math.min(...values) : 0;
  const highest = values.length > 0 ? Math.max(...values) : 0;
  return {
    id: 'aht',
    label: 'Handle time',
    description: `Average handle time in seconds against the ${formatAht(summary.ahtTargetSeconds)} target.`,
    unit: 's',
    series: [{ key: 'value', label: 'AHT', color: TREND_COLORS.tertiary, kind: 'area', unit: 's', axis: 'left' }],
    points: zipPoints(buckets, values),
    leftAxisLabel: 'Seconds',
    leftAxisMin: Math.max(0, Math.floor(lowest - 30)),
    leftAxisMax: Math.ceil(highest + 30),
    target: { value: summary.ahtTargetSeconds, label: `Target ${formatAht(summary.ahtTargetSeconds)}` },
    summary: {
      primary: formatAht(summary.ahtSeconds),
      primaryCaption: 'AHT right now',
      secondary: formatAht(lowest),
      secondaryCaption: 'Best (lowest) in window',
    },
    ariaSummary: `Average handle time is ${formatAht(summary.ahtSeconds)} against a ${formatAht(summary.ahtTargetSeconds)} target, with a best of ${formatAht(lowest)} across the window.`,
  };
}

function occupancyTrend(buckets: Bucket[], summary: WorkforceSummary): TrendView {
  const values = buildWave(buckets, {
    seed: 1601,
    base: 82,
    amplitude: 9,
    periodHours: 24,
    peakHour: 14,
    noise: 5,
    floor: 55,
    ceiling: 98,
    decimals: 1,
    pinLast: summary.occupancy ?? undefined,
    pinSpan: 4,
  });
  const peak = values.length > 0 ? Math.max(...values) : 0;
  return {
    id: 'occupancy',
    label: 'Occupancy',
    description: `Logged-in time on calls or after-call work. Above ${summary.occupancyTarget}% is a burnout signal.`,
    unit: '%',
    series: [{ key: 'value', label: 'Occupancy %', color: TREND_COLORS.secondary, kind: 'area', unit: '%', axis: 'left' }],
    points: zipPoints(buckets, values),
    leftAxisLabel: 'Occupancy %',
    leftAxisMin: 0,
    leftAxisMax: 100,
    target: { value: summary.occupancyTarget, label: `Safe ${summary.occupancyTarget}%` },
    summary: {
      primary: formatPercent(summary.occupancy),
      primaryCaption: 'Occupancy right now',
      secondary: formatPercent(peak),
      secondaryCaption: 'Peak occupancy in window',
    },
    ariaSummary: `Occupancy is ${formatPercent(summary.occupancy)} against a ${summary.occupancyTarget}% safe ceiling, peaking at ${formatPercent(peak)} across the window.`,
  };
}

function forecastTrend(buckets: Bucket[], summary: WorkforceSummary): TrendView {
  const ratio = summary.forecastActualRatio ?? 1;
  const forecast = buildWave(buckets, {
    seed: 1709,
    base: 2300,
    amplitude: 900,
    periodHours: 24,
    peakHour: 13,
    noise: 260,
    floor: 420,
    ceiling: 5200,
  });
  const actual = buildWave(buckets, {
    seed: 2029,
    base: 2300 * ratio,
    amplitude: 900,
    periodHours: 24,
    peakHour: 13,
    noise: 300,
    floor: 420,
    ceiling: 5600,
  });
  const actualNow = actual.length > 0 ? actual[actual.length - 1] : 0;
  const forecastNow = forecast.length > 0 ? forecast[forecast.length - 1] : 0;
  return {
    id: 'forecast',
    label: 'Forecast vs actual',
    description: 'Observed call volume against the planned forecast. A persistent gap is a staffing miss in either direction.',
    unit: 'calls',
    series: [
      { key: 'value', label: 'Actual', color: TREND_COLORS.primary, kind: 'area', unit: 'calls', axis: 'left' },
      { key: 'compare', label: 'Forecast', color: TREND_COLORS.tertiary, kind: 'line', unit: 'calls', axis: 'left' },
    ],
    points: zipPoints(buckets, actual, forecast),
    leftAxisLabel: 'Calls',
    summary: {
      primary: formatForecastDeviation(summary.forecastActualRatio),
      primaryCaption: 'Actual vs forecast right now',
      secondary: `${formatInteger(actualNow)} vs ${formatInteger(forecastNow)}`,
      secondaryCaption: 'Actual vs forecast calls',
    },
    ariaSummary: `Call volume is ${formatForecastDeviation(summary.forecastActualRatio)} against forecast, with ${formatInteger(actualNow)} observed versus ${formatInteger(forecastNow)} planned right now.`,
  };
}

function ivrTrend(buckets: Bucket[], summary: WorkforceSummary): TrendView {
  const values = buildWave(buckets, {
    seed: 2311,
    base: 46,
    amplitude: 8,
    periodHours: 24,
    peakHour: 10,
    noise: 6,
    floor: 18,
    ceiling: 68,
    decimals: 1,
    pinLast: summary.ivrContainment ?? undefined,
    pinSpan: 4,
  });
  const lowest = values.length > 0 ? Math.min(...values) : 0;
  return {
    id: 'ivr',
    label: 'IVR containment',
    description: `Contacts resolved in self-service without reaching an agent, against the ${summary.ivrTarget}% target.`,
    unit: '%',
    series: [{ key: 'value', label: 'Containment %', color: TREND_COLORS.secondary, kind: 'area', unit: '%', axis: 'left' }],
    points: zipPoints(buckets, values),
    leftAxisLabel: 'Containment %',
    leftAxisMin: 0,
    leftAxisMax: 100,
    target: { value: summary.ivrTarget, label: `Target ${summary.ivrTarget}%` },
    summary: {
      primary: formatPercent(summary.ivrContainment),
      primaryCaption: 'Containment right now',
      secondary: formatPercent(lowest),
      secondaryCaption: 'Lowest point in window',
    },
    ariaSummary: `IVR self-service containment is ${formatPercent(summary.ivrContainment)} against a ${summary.ivrTarget}% target, with a low of ${formatPercent(lowest)} across the window.`,
  };
}

function buildWorkforceTrends(buckets: Bucket[], summary: WorkforceSummary): TrendView[] {
  return [
    adherenceTrend(buckets, summary),
    ahtTrend(buckets, summary),
    occupancyTrend(buckets, summary),
    forecastTrend(buckets, summary),
    ivrTrend(buckets, summary),
  ];
}

function buildSnapshot(query: DashboardQuery): DashboardSnapshot {
  const scope = scopeFor(query.application);
  const range = rangeConfig(query.range);
  const inputs = scenarioInputs(query.scenario);
  const buckets = inputs.empty ? [] : buildBuckets(range.buckets, range.stepMinutes, range.id === '24h' ? 'clock' : 'dayClock');

  const clients = buildClientRows(inputs.clients, inputs.system.slaTarget);
  const services = buildServiceRows(inputs.services);
  const capabilities = buildCapabilities(services);
  // All regions are kept so cross-cloud divergence stays measurable; the
  // selected cloud only decides emphasis and the paired trend chart.
  const regions = buildRegionRows(inputs.regions);
  const logins = buildLoginRows(inputs.logins);
  const workforce = buildWorkforceRows(inputs.workforce);
  const workforceSummary = summariseWorkforce(workforce);

  const resolvedRegion =
    regions.find((row) => row.id === query.regionId) ??
    regions.find((row) => row.cloud === query.cloud) ??
    null;

  const windowLabel = `${range.label} · ${formatStamp(MOCK_NOW_ISO)}`;
  const system = toSystemStatus(inputs.system, windowLabel, formatStamp(MOCK_NOW_ISO));

  const trends = [
    ...buildTrends(buckets, system, query.cloud, resolvedRegion?.id ?? `${query.cloud}-singapore`),
    ...buildWorkforceTrends(buckets, workforceSummary),
  ];

  const visible = summariseClients(clients, inputs.system.slaTarget);

  const snapshot: DashboardSnapshot = {
    generatedAt: MOCK_NOW_ISO,
    dataWindowLabel: windowLabel,
    scope,
    system,
    kpis: [],
    clients,
    services,
    capabilities,
    regions,
    logins,
    workforce,
    workforceSummary,
    trends,
    attention: [],
    notices: [],
    clientTotals:
      system.callsQueued === null
        ? null
        : {
            queued: system.callsQueued,
            active: system.callsActive ?? 0,
            slaToday: system.slaToday,
            slaTarget: system.slaTarget,
          },
    visibleTotals: visible,
  };

  snapshot.kpis = buildKpis({
    scope,
    cloud: query.cloud,
    regionId: resolvedRegion?.id ?? `${query.cloud}-singapore`,
    system,
    clients,
    services,
    capabilities,
    logins,
    regions,
    workforce,
    workforceSummary,
    trends,
  });
  snapshot.attention =
    scope.id === 'workforce' ? buildWorkforceAttention(workforce) : buildAttention(clients, services, regions);
  // Workforce signals surface on the combined view and the workforce scope only,
  // so a service-specific scope stays noise-free.
  const showWorkforceSignals = scope.id === 'all' || scope.id === 'workforce';
  snapshot.notices = buildNotices({
    system,
    clients,
    services,
    logins: scope.showLogins ? logins : [],
    workforce: showWorkforceSignals ? workforce : [],
    workforceSummary: showWorkforceSignals ? workforceSummary : null,
    empty: inputs.empty,
  });

  return snapshot;
}

/**
 * Loads one snapshot for a query. `loading` never settles (the UI keeps its
 * skeletons up), `error` rejects after the usual latency so retry paths get a
 * realistic failure, and every other scenario resolves deterministically.
 */
export async function fetchDashboardSnapshot(
  query: DashboardQuery,
  options: { signal?: AbortSignal } = {},
): Promise<DashboardSnapshot> {
  const { signal } = options;

  if (query.scenario === 'loading') {
    return new Promise<DashboardSnapshot>((_resolve, reject) => {
      signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true });
    });
  }

  await delay(LATENCY[query.scenario] ?? LATENCY.live, signal);

  if (query.scenario === 'error') {
    throw new Error(
      'Telemetry gateway returned HTTP 503 after three retries. The last good snapshot is 12 minutes old and is not displayed to avoid stale SLA readings.',
    );
  }

  return buildSnapshot(query);
}
