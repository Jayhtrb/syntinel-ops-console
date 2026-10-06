import type {
  CapabilitySummary,
  ClientRow,
  CloudId,
  DeltaInfo,
  KpiCard,
  LoginRow,
  RegionSessionRow,
  ScopeMeta,
  ServiceRow,
  SystemStatus,
  TrendView,
  WorkforceRow,
  WorkforceSummary,
} from '../types/dashboard';
import { formatAht, formatCompact, formatForecastDeviation, formatInteger, formatPercent, formatRatio } from '../lib/format';
import {
  adherenceStatus,
  ahtStatus,
  errorRateStatus,
  forecastStatus,
  ivrContainmentStatus,
  occupancyStatus,
  queueStatus,
  slaStatus,
  SESSION_IMBALANCE_WARNING,
  worstStatus,
} from '../lib/status';
import { buildSpark, cloudTotals, TREND_COLORS } from './mock/platforms';

/**
 * KPI derivation.
 *
 * One pure function per application scope, all consuming the same snapshot. The
 * KPI row therefore changes meaning with the scope without any component-level
 * branching, and stays testable without rendering React.
 */
export interface KpiSource {
  scope: ScopeMeta;
  cloud: CloudId;
  /** Currently selected region id, so citrix KPIs follow the region filter. */
  regionId: string;
  system: SystemStatus;
  clients: ClientRow[];
  services: ServiceRow[];
  capabilities: CapabilitySummary[];
  logins: LoginRow[];
  regions: RegionSessionRow[];
  workforce: WorkforceRow[];
  workforceSummary: WorkforceSummary;
  trends: TrendView[];
}

const BLANK = '—';

function deltaOf(
  current: number | null,
  previous: number | null,
  unit: '%' | 'count' | 'pp',
  goodDirection: 'up' | 'down',
  betterCopy: string,
  worseCopy: string,
  neutral = false,
): DeltaInfo | undefined {
  if (current === null || previous === null || Number.isNaN(current) || Number.isNaN(previous)) return undefined;
  const diff = current - previous;
  const direction: DeltaInfo['direction'] = diff > 0 ? 'up' : diff < 0 ? 'down' : 'flat';
  const good = direction === 'flat' ? true : direction === goodDirection;
  const magnitude =
    unit === 'count' ? formatInteger(Math.abs(diff)) : unit === 'pp' ? `${Math.abs(diff).toFixed(1)}pt` : `${Math.abs(diff).toFixed(2)}pp`;
  return {
    value: diff,
    unit,
    direction,
    good,
    neutral,
    caption: direction === 'flat' ? 'Unchanged vs prior window' : `${good ? betterCopy : worseCopy} ${magnitude} vs prior window`,
  };
}

function sparkFrom(trends: TrendView[], id: TrendView['id'], key: 'value' | 'compare', take = 16): number[] {
  const trend = trends.find((t) => t.id === id);
  if (!trend || trend.points.length === 0) return [];
  const series = trend.points.map((point) => (key === 'compare' ? (point.compare ?? point.value) : point.value));
  return series.slice(-take);
}

function sparkTone(status: KpiCard['status']): KpiCard['sparkTone'] {
  if (status === 'critical') return 'critical';
  if (status === 'warning') return 'warning';
  if (status === 'watch') return 'watch';
  if (status === 'idle' || status === 'unknown') return 'idle';
  return 'nominal';
}

function peakOf(trend: TrendView | undefined, key: 'value' | 'compare'): number | null {
  if (!trend || trend.points.length === 0) return null;
  const series = trend.points.map((point) => (key === 'compare' ? (point.compare ?? point.value) : point.value));
  return series.length > 0 ? Math.max(...series) : null;
}

function buildAllScopeKpis(src: KpiSource): KpiCard[] {
  const { system, services, trends } = src;
  const errorStatus = errorRateStatus(system.errorRate);
  const slaLevel = slaStatus(system.slaToday, system.slaTarget);
  const queueLevel = queueStatus(system.callsQueued);
  const hasData = system.callsActive !== null || system.slaToday !== null;

  return [
    {
      id: 'active-users',
      label: 'Active users',
      display: formatInteger(system.activeUsers),
      caption: 'Concurrent workstation sessions',
      status: system.activeUsers === null ? 'unknown' : 'nominal',
      delta: deltaOf(system.activeUsers, system.previous.activeUsers, 'count', 'up', 'Up', 'Down'),
      spark: buildSpark(11, 16, 3, 1.4),
      sparkTone: 'nominal',
    },
    {
      id: 'calls-queued',
      label: 'Calls queued',
      display: formatInteger(system.callsQueued),
      caption: 'Waiting across all client queues',
      targetCaption: 'Target 0',
      status: queueLevel,
      delta: deltaOf(system.callsQueued, system.previous.callsQueued, 'count', 'down', 'Down', 'Up'),
      spark: sparkFrom(trends, 'load', 'compare'),
      sparkTone: sparkTone(queueLevel),
    },
    {
      id: 'calls-active',
      label: 'Calls active',
      display: formatInteger(system.callsActive),
      caption: 'Connected to an agent or in IVR',
      status: hasData ? 'nominal' : 'unknown',
      // Volume alone is neither good nor bad, so this delta carries no verdict.
      delta: deltaOf(system.callsActive, system.previous.callsActive, 'count', 'up', 'Up', 'Down', true),
      spark: sparkFrom(trends, 'load', 'value'),
      sparkTone: 'nominal',
    },
    {
      id: 'sla-today',
      label: 'SLA today',
      display: formatPercent(system.slaToday),
      caption: 'Weighted across scored queues',
      targetCaption: `Target ${system.slaTarget}%`,
      status: slaLevel,
      delta: deltaOf(system.slaToday, system.previous.slaToday, 'pp', 'up', 'Up', 'Down'),
      spark: sparkFrom(trends, 'sla', 'value'),
      sparkTone: sparkTone(slaLevel),
    },
    {
      id: 'service-error-rate',
      label: 'Service error rate',
      display: system.errorRate === null ? BLANK : `${formatRatio(system.errorRate, 2)}%`,
      caption: `${services.length} services · ${formatCompact(system.throughput)} calls`,
      targetCaption: 'Target < 0.05%',
      status: errorStatus,
      delta: deltaOf(system.errorRate, system.previous.errorRate, 'pp', 'down', 'Down', 'Up'),
      spark: buildSpark(29, 16, 22, 14),
      sparkTone: sparkTone(errorStatus),
    },
  ];
}

function buildMwScopeKpis(src: KpiSource): KpiCard[] {
  const { services, capabilities, system } = src;
  const worst = services.length > 0 ? services.reduce((a, b) => (b.errorCount > a.errorCount ? b : a)) : null;
  const totalThroughput = services.reduce((sum, row) => sum + row.throughput, 0);
  const activeCapabilities = capabilities.filter((c) => c.serviceCount > 0).length;
  const status = worstStatus(services.map((row) => row.status));

  return [
    {
      id: 'services-monitored',
      label: 'Services monitored',
      display: services.length === 0 ? BLANK : formatInteger(services.length),
      caption: 'Middleware endpoints under watch',
      status: services.length === 0 ? 'unknown' : 'nominal',
      spark: buildSpark(41, 16, 10, 2),
      sparkTone: 'nominal',
    },
    {
      id: 'throughput',
      label: 'Throughput',
      display: services.length === 0 ? BLANK : formatCompact(totalThroughput),
      caption: 'Calls served in the window',
      status: services.length === 0 ? 'unknown' : 'nominal',
      delta: deltaOf(totalThroughput, system.previous.callsActive === null ? null : 152_400, 'count', 'up', 'Up', 'Down'),
      spark: buildSpark(53, 16, 60, 22),
      sparkTone: 'nominal',
    },
    {
      id: 'error-rate',
      label: 'Error rate',
      display: system.errorRate === null ? BLANK : `${formatRatio(system.errorRate, 2)}%`,
      caption: 'Highest capability error rate',
      targetCaption: 'Target < 0.05%',
      status: errorRateStatus(system.errorRate),
      delta: deltaOf(system.errorRate, system.previous.errorRate, 'pp', 'down', 'Down', 'Up'),
      spark: buildSpark(67, 16, 18, 16),
      sparkTone: sparkTone(errorRateStatus(system.errorRate)),
    },
    {
      id: 'top-error-count',
      label: 'Highest error count',
      display: worst === null ? BLANK : formatRatio(worst.errorCount),
      caption: worst === null ? 'No service telemetry' : `${worst.name} · ${formatCompact(worst.throughput)} calls`,
      status: worst === null ? 'unknown' : worst.status,
      spark: buildSpark(83, 16, 40, 26),
      sparkTone: sparkTone(status),
    },
    {
      id: 'capabilities',
      label: 'Business capabilities',
      display: capabilities.length === 0 ? BLANK : formatInteger(capabilities.length),
      caption: `${activeCapabilities} with traffic · ${capabilities.length - activeCapabilities} without`,
      status: capabilities.length === 0 ? 'unknown' : 'nominal',
      spark: buildSpark(97, 16, 4, 1.5),
      sparkTone: 'nominal',
    },
  ];
}

function buildCitrixScopeKpis(src: KpiSource): KpiCard[] {
  const { regions, cloud, regionId } = src;
  const aws = cloudTotals(regions, 'aws');
  const azure = cloudTotals(regions, 'azure');
  const selected = regions.find((row) => row.id === regionId) ?? regions.find((row) => row.cloud === cloud) ?? null;
  const online = regions.filter((row) => row.current > 0).length;
  const totalSessions = aws.current + azure.current;
  const divergence = totalSessions > 0 ? Math.abs((aws.current - azure.current) / totalSessions) * 100 : 0;
  const divergenceStatus = divergence >= SESSION_IMBALANCE_WARNING ? 'warning' : 'nominal';
  const offline = regions.length - online;

  return [
    {
      id: 'aws-sessions',
      label: 'AWS sessions',
      display: formatInteger(aws.current),
      caption: `${aws.regions} regions · peak ${formatInteger(aws.peak)}`,
      status: aws.current > 0 ? 'nominal' : 'critical',
      spark: sparkFrom(src.trends, 'sessions', cloud === 'aws' ? 'value' : 'compare'),
      sparkTone: 'nominal',
    },
    {
      id: 'azure-sessions',
      label: 'Azure sessions',
      display: formatInteger(azure.current),
      caption: `${azure.regions} regions · peak ${formatInteger(azure.peak)}`,
      status: azure.current > 0 ? 'nominal' : 'critical',
      spark: sparkFrom(src.trends, 'sessions', cloud === 'azure' ? 'value' : 'compare'),
      sparkTone: 'nominal',
    },
    {
      id: 'selected-cloud',
      label: 'Selected region',
      display: formatInteger(selected ? selected.current : null),
      caption: selected
        ? `${selected.cloudLabel.replace('Citrix Cloud ', '')} ${selected.region.replace('Azure ', '')} · avg ${formatInteger(selected.average)} · peak ${formatInteger(selected.peak)}`
        : 'No region selected',
      status: selected ? selected.status : 'unknown',
      spark: [],
    },
    {
      id: 'regions-online',
      label: 'Regions online',
      display: regions.length === 0 ? BLANK : `${online}/${regions.length}`,
      caption: offline > 0 ? `${offline} region${offline === 1 ? '' : 's'} with no sessions` : 'All regions carrying sessions',
      status: offline === 0 ? 'nominal' : offline >= 2 ? 'warning' : 'watch',
      spark: buildSpark(131, 16, 8, 1.5),
      sparkTone: offline === 0 ? 'nominal' : 'warning',
    },
    {
      id: 'cloud-divergence',
      label: 'Cloud divergence',
      display: totalSessions === 0 ? BLANK : `${divergence.toFixed(1)}%`,
      caption: totalSessions === 0 ? 'No session telemetry' : `AWS ${formatInteger(aws.current)} vs Azure ${formatInteger(azure.current)}`,
      targetCaption: `Alert ≥ ${SESSION_IMBALANCE_WARNING}%`,
      status: totalSessions === 0 ? 'unknown' : divergenceStatus,
      spark: [],
    },
  ];
}

function buildVistaScopeKpis(src: KpiSource): KpiCard[] {
  const { trends, system, logins, clients } = src;
  const activity = trends.find((t) => t.id === 'activity');
  const peakLogins = peakOf(activity, 'value');
  const peakPayments = peakOf(activity, 'compare');
  const activeApps = logins.filter((row) => row.users > 0).length;
  const slaLevel = slaStatus(system.slaToday, system.slaTarget);

  return [
    {
      id: 'peak-logins',
      label: 'Peak login count',
      display: formatInteger(peakLogins),
      caption: 'Vista business capability peak',
      status: peakLogins === null ? 'unknown' : 'nominal',
      spark: sparkFrom(trends, 'activity', 'value'),
      sparkTone: 'nominal',
    },
    {
      id: 'peak-payments',
      label: 'Peak payment count',
      display: formatInteger(peakPayments),
      caption: 'Vista payment capability peak',
      status: peakPayments === null ? 'unknown' : 'nominal',
      spark: sparkFrom(trends, 'activity', 'compare'),
      sparkTone: 'nominal',
    },
    {
      id: 'active-users',
      label: 'Active users',
      display: formatInteger(system.activeUsers),
      caption: 'Concurrent workstation sessions',
      status: system.activeUsers === null ? 'unknown' : 'nominal',
      delta: deltaOf(system.activeUsers, system.previous.activeUsers, 'count', 'up', 'Up', 'Down'),
      spark: buildSpark(151, 16, 3, 1.2),
      sparkTone: 'nominal',
    },
    {
      id: 'sla-today',
      label: 'SLA today',
      display: formatPercent(system.slaToday),
      caption: `${clients.filter((row) => row.slaToday !== null).length} scored queues`,
      targetCaption: `Target ${system.slaTarget}%`,
      status: slaLevel,
      delta: deltaOf(system.slaToday, system.previous.slaToday, 'pp', 'up', 'Up', 'Down'),
      spark: sparkFrom(trends, 'sla', 'value'),
      sparkTone: sparkTone(slaLevel),
    },
    {
      id: 'capabilities-active',
      label: 'Applications active',
      display: logins.length === 0 ? BLANK : `${activeApps}/${logins.length}`,
      caption: `${logins.length - activeApps} with no logins in the window`,
      status: logins.length === 0 ? 'unknown' : activeApps === logins.length ? 'nominal' : 'warning',
      spark: buildSpark(163, 16, 5, 1.8),
      sparkTone: activeApps === logins.length ? 'nominal' : 'warning',
    },
  ];
}

function buildWorkstationScopeKpis(src: KpiSource): KpiCard[] {
  const { logins, system, clients } = src;
  const total = logins.reduce((sum, row) => sum + row.users, 0);
  const idle = logins.filter((row) => row.users === 0);
  const slaLevel = slaStatus(system.slaToday, system.slaTarget);

  return [
    {
      id: 'active-users',
      label: 'Active users',
      display: formatInteger(system.activeUsers),
      caption: 'Concurrent workstation sessions',
      status: system.activeUsers === null ? 'unknown' : 'nominal',
      delta: deltaOf(system.activeUsers, system.previous.activeUsers, 'count', 'up', 'Up', 'Down'),
      spark: buildSpark(179, 16, 3, 1.2),
      sparkTone: 'nominal',
    },
    {
      id: 'logins-today',
      label: 'Logins today',
      display: logins.length === 0 ? BLANK : formatInteger(total),
      caption: `Across ${logins.length} applications`,
      status: logins.length === 0 ? 'unknown' : 'nominal',
      spark: sparkFrom(src.trends, 'activity', 'value'),
      sparkTone: 'nominal',
    },
    {
      id: 'applications',
      label: 'Applications',
      display: logins.length === 0 ? BLANK : formatInteger(logins.length),
      caption: 'Workstation applications reporting',
      status: logins.length === 0 ? 'unknown' : 'nominal',
      spark: buildSpark(191, 16, 5, 1.6),
      sparkTone: 'nominal',
    },
    {
      id: 'idle-applications',
      label: 'Idle applications',
      display: logins.length === 0 ? BLANK : formatInteger(idle.length),
      caption: idle.length > 0 ? idle.map((row) => row.application).join(', ') : 'Every application served a login',
      status: idle.length === 0 ? 'nominal' : idle.length >= 2 ? 'warning' : 'watch',
      spark: buildSpark(197, 16, 2, 2),
      sparkTone: idle.length === 0 ? 'nominal' : 'warning',
    },
    {
      id: 'sla-today',
      label: 'SLA today',
      display: formatPercent(system.slaToday),
      caption: `${clients.filter((row) => row.callsActive > 0).length} queues with live calls`,
      targetCaption: `Target ${system.slaTarget}%`,
      status: slaLevel,
      delta: deltaOf(system.slaToday, system.previous.slaToday, 'pp', 'up', 'Up', 'Down'),
      spark: sparkFrom(src.trends, 'sla', 'value'),
      sparkTone: sparkTone(slaLevel),
    },
  ];
}

function buildWorkforceScopeKpis(src: KpiSource): KpiCard[] {
  const { workforceSummary: wf, trends } = src;
  const adherenceLevel = adherenceStatus(wf.adherence);
  const ahtLevel = ahtStatus(wf.ahtSeconds, wf.ahtTargetSeconds);
  const occupancyLevel = occupancyStatus(wf.occupancy);
  const forecastLevel = forecastStatus(wf.forecastActualRatio);
  const ivrLevel = ivrContainmentStatus(wf.ivrContainment);

  return [
    {
      id: 'adherence',
      label: 'Schedule adherence',
      display: formatPercent(wf.adherence),
      caption: `${formatInteger(wf.loggedIn)} of ${formatInteger(wf.scheduled)} agents on schedule`,
      targetCaption: `Target ≥ ${wf.adherenceTarget}%`,
      status: adherenceLevel,
      delta: deltaOf(wf.adherence, wf.previous.adherence, 'pp', 'up', 'Up', 'Down'),
      spark: sparkFrom(trends, 'adherence', 'value'),
      sparkTone: sparkTone(adherenceLevel),
    },
    {
      id: 'aht',
      label: 'Average handle time',
      display: formatAht(wf.ahtSeconds),
      caption: 'Talk + after-call work, whole estate',
      targetCaption: `Target ≤ ${formatAht(wf.ahtTargetSeconds)}`,
      status: ahtLevel,
      delta: deltaOf(wf.ahtSeconds, wf.previous.ahtSeconds, 'count', 'down', 'Down', 'Up'),
      spark: sparkFrom(trends, 'aht', 'value'),
      sparkTone: sparkTone(ahtLevel),
    },
    {
      id: 'occupancy',
      label: 'Occupancy',
      display: formatPercent(wf.occupancy),
      caption: 'Logged-in time on calls or ACW',
      targetCaption: `Safe ≤ ${wf.occupancyTarget}%`,
      status: occupancyLevel,
      delta: deltaOf(wf.occupancy, wf.previous.occupancy, 'pp', 'down', 'Down', 'Up'),
      spark: sparkFrom(trends, 'occupancy', 'value'),
      sparkTone: sparkTone(occupancyLevel),
    },
    {
      id: 'forecast',
      label: 'Volume vs forecast',
      display: formatForecastDeviation(wf.forecastActualRatio),
      caption: 'Actual call volume against plan',
      status: forecastLevel,
      spark: sparkFrom(trends, 'forecast', 'value'),
      sparkTone: sparkTone(forecastLevel),
    },
    {
      id: 'ivr',
      label: 'IVR containment',
      display: formatPercent(wf.ivrContainment),
      caption: 'Contacts resolved without an agent',
      targetCaption: `Target ≥ ${wf.ivrTarget}%`,
      status: ivrLevel,
      delta: deltaOf(wf.ivrContainment, wf.previous.ivrContainment, 'pp', 'up', 'Up', 'Down'),
      spark: sparkFrom(trends, 'ivr', 'value'),
      sparkTone: sparkTone(ivrLevel),
    },
  ];
}

export function buildKpis(src: KpiSource): KpiCard[] {
  switch (src.scope.id) {
    case 'mw-services':
      return buildMwScopeKpis(src);
    case 'citrix':
      return buildCitrixScopeKpis(src);
    case 'vista':
      return buildVistaScopeKpis(src);
    case 'workstation':
      return buildWorkstationScopeKpis(src);
    case 'workforce':
      return buildWorkforceScopeKpis(src);
    case 'all':
    default:
      return buildAllScopeKpis(src);
  }
}

export const KPI_TREND_COLORS = TREND_COLORS;
