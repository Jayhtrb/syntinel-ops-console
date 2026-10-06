/**
 * Domain model for the SynTinel operations console.
 *
 * These types are the contract between the mock/real data layer (`src/data`)
 * and the presentation layer (`src/components`). Components never read from a
 * mock file directly - they receive a `DashboardSnapshot`.
 */

/** Operational health vocabulary. `idle` = no traffic, `unknown` = not reported. */
export type StatusLevel = 'nominal' | 'watch' | 'warning' | 'critical' | 'idle' | 'unknown';

/**
 * Demo/QA scenarios injected by the data layer. `live` derives its state from
 * the data itself; the others exercise the non-happy paths of the UI.
 */
export type DataScenario = 'live' | 'loading' | 'empty' | 'error' | 'warning' | 'critical';

export type ApplicationId = 'all' | 'mw-services' | 'citrix' | 'vista' | 'workstation' | 'workforce';

export type DateRangeId = '24h' | '7d' | '14d';

export type CloudId = 'aws' | 'azure';

export type TrendMetricId = 'load' | 'sla' | 'activity' | 'sessions' | 'adherence' | 'aht' | 'occupancy' | 'forecast' | 'ivr';

export type TableTabId = 'clients' | 'services' | 'regions' | 'workforce';

export type AttentionKind = 'sla' | 'queue' | 'inactive' | 'service' | 'session' | 'workforce';

export interface DeltaInfo {
  /** Absolute change against the previous comparable window. */
  value: number;
  unit: string;
  direction: 'up' | 'down' | 'flat';
  /** True when the movement is good news, which depends on the metric. */
  good: boolean;
  /** Movement is reported without a verdict (used for volume metrics). */
  neutral?: boolean;
  caption: string;
}

export interface KpiCard {
  id: string;
  label: string;
  /** Pre-formatted display value (`—` when the scope reports nothing). */
  display: string;
  caption: string;
  status: StatusLevel;
  targetCaption?: string;
  delta?: DeltaInfo;
  /** Deterministic mini series for the card sparkline. */
  spark?: number[];
  sparkTone?: 'nominal' | 'watch' | 'warning' | 'critical' | 'idle';
}

export interface ClientRow {
  id: string;
  name: string;
  callsQueued: number;
  callsActive: number;
  /** `null` when the client produced no calls in the window. */
  slaToday: number | null;
  slaTarget: number;
  status: StatusLevel;
  attention: AttentionKind[];
  /** Short human note explaining why the row is flagged. */
  note: string;
}

export interface ServiceRow {
  id: string;
  name: string;
  /** Disambiguates repeated service names as they appear in the source view. */
  instance: string;
  capabilityId: string;
  capabilityLabel: string;
  errorCount: number;
  throughput: number;
  errorRate: number;
  status: StatusLevel;
  note: string;
}

export interface CapabilitySummary {
  id: string;
  label: string;
  errorRate: number;
  serviceCount: number;
  status: StatusLevel;
}

export interface RegionSessionRow {
  id: string;
  cloud: CloudId;
  cloudLabel: string;
  region: string;
  current: number;
  peak: number;
  average: number;
  deltaPercent: number;
  status: StatusLevel;
}

export interface LoginRow {
  id: string;
  application: string;
  users: number;
  /** Historic ceiling for the window, used as the meter denominator. */
  peak: number;
  changeVsPriorDay: number;
  status: StatusLevel;
  note: string;
}

/**
 * One workforce team (Verint WFO). Aggregates agent schedule adherence, handle
 * time, occupancy, forecast accuracy and IVR containment into a single row so a
 * struggling team surfaces with one glance.
 */
export interface WorkforceRow {
  id: string;
  team: string;
  scheduled: number;
  loggedIn: number;
  /** Schedule adherence, percent. */
  adherence: number;
  adherenceTarget: number;
  /** Average handle time including after-call work, in seconds. */
  ahtSeconds: number;
  ahtTargetSeconds: number;
  /** Percent of logged-in time on calls or after-call work. */
  occupancy: number;
  occupancyTarget: number;
  /** Actual / forecast call volume. 1.0 is on forecast, >1 is over, <1 is under. */
  forecastActualRatio: number;
  /** Percent of contacts resolved in IVR without reaching an agent. */
  ivrContainment: number;
  ivrTarget: number;
  status: StatusLevel;
  attention: AttentionKind[];
  note: string;
}

/** Whole-workforce roll-up, weighted across teams. */
export interface WorkforceSummary {
  adherence: number | null;
  adherenceTarget: number;
  ahtSeconds: number | null;
  ahtTargetSeconds: number;
  occupancy: number | null;
  occupancyTarget: number;
  ivrContainment: number | null;
  ivrTarget: number;
  forecastActualRatio: number | null;
  scheduled: number | null;
  loggedIn: number | null;
  shrinkage: number | null;
  previous: {
    adherence: number | null;
    ahtSeconds: number | null;
    occupancy: number | null;
    ivrContainment: number | null;
    forecastActualRatio: number | null;
  };
}

export interface SeriesPoint {
  /** ISO timestamp of the bucket. */
  t: string;
  /** Pre-formatted axis label. */
  label: string;
  /** Primary metric value. */
  value: number;
  /** Comparison metric value, when the view plots two series. */
  compare?: number;
}

export interface TrendSeriesDef {
  key: 'value' | 'compare';
  label: string;
  color: string;
  kind: 'area' | 'line';
  unit: string;
  axis: 'left' | 'right';
}

export interface TrendView {
  id: TrendMetricId;
  label: string;
  /** Short description of what the view plots, shown under the chart. */
  description: string;
  unit: string;
  series: TrendSeriesDef[];
  points: SeriesPoint[];
  leftAxisLabel: string;
  leftAxisMin?: number;
  leftAxisMax?: number;
  rightAxisLabel?: string;
  rightAxisMax?: number;
  target?: { value: number; label: string };
  summary: { primary: string; primaryCaption: string; secondary: string; secondaryCaption: string };
  /** Screen-reader narrative for the chart, since SVG is not readable. */
  ariaSummary: string;
}

export interface SystemStatus {
  activeUsers: number | null;
  callsQueued: number | null;
  callsActive: number | null;
  slaToday: number | null;
  slaTarget: number;
  servicesMonitored: number;
  capabilities: number;
  errorRate: number | null;
  throughput: number | null;
  previous: {
    activeUsers: number | null;
    callsQueued: number | null;
    callsActive: number | null;
    slaToday: number | null;
    errorRate: number | null;
  };
  windowLabel: string;
  lastUpdatedLabel: string;
}

export interface AttentionItem {
  id: string;
  kind: AttentionKind;
  severity: StatusLevel;
  label: string;
  /** Full human sentence, used for tooltips and the row note. */
  detail: string;
  /** Compact readout for dense chips, e.g. `80.8% vs 95%`. */
  short: string;
  /** Weight of the signal (number of affected clients/services/regions). */
  count: number;
  clientId?: string;
}

export type NoticeSeverity = 'info' | 'warning' | 'critical';

export interface Notice {
  id: string;
  severity: NoticeSeverity;
  title: string;
  message: string;
}

export interface ScopeMeta {
  id: ApplicationId;
  label: string;
  description: string;
  tableTabs: TableTabId[];
  defaultTableTab: TableTabId;
  showLogins: boolean;
  /** Explains the scoped empty state when `showLogins` is false. */
  loginEmptyReason?: string;
  showCloudControls: boolean;
  availableTrends: TrendMetricId[];
  defaultTrend: TrendMetricId;
  /** Which summary sits in the right-hand column beside the performance table. */
  rightPanel?: 'logins' | 'workforce';
}

export interface DashboardQuery {
  application: ApplicationId;
  range: DateRangeId;
  cloud: CloudId;
  regionId: string;
  scenario: DataScenario;
}

export interface DashboardSnapshot {
  generatedAt: string;
  dataWindowLabel: string;
  scope: ScopeMeta;
  system: SystemStatus;
  kpis: KpiCard[];
  clients: ClientRow[];
  services: ServiceRow[];
  capabilities: CapabilitySummary[];
  regions: RegionSessionRow[];
  logins: LoginRow[];
  workforce: WorkforceRow[];
  workforceSummary: WorkforceSummary;
  trends: TrendView[];
  attention: AttentionItem[];
  notices: Notice[];
  clientTotals: {
    queued: number;
    active: number;
    slaToday: number | null;
    slaTarget: number;
  } | null;
  /** Subtotal across the client rows the table actually shows. */
  visibleTotals: {
    queued: number;
    active: number;
    slaToday: number | null;
    slaTarget: number;
  } | null;
}

export type SnapshotPhase = 'loading' | 'refreshing' | 'ready' | 'error';
