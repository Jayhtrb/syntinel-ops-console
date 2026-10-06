import { tokens } from '../theme/tokens';
import type { AttentionKind, ClientRow, StatusLevel } from '../types/dashboard';
import { formatAht, formatForecastDeviation } from './format';

/**
 * Thresholds and status vocabulary.
 *
 * The SLA floor mirrors the source view: 95% is the contractual target, a
 * sustained drop below 85% is a breach that needs a person, not a dashboard.
 */
export const SLA_TARGET = 95;
export const SLA_CRITICAL = 85;

/** Queue depth thresholds, calibrated for the payment call queues in scope. */
export const QUEUE_WATCH = 1;
export const QUEUE_WARNING = 5;
export const QUEUE_CRITICAL = 15;

/** Service error-rate thresholds, in percent. */
export const ERROR_WATCH = 0.05;
export const ERROR_WARNING = 0.5;
export const ERROR_CRITICAL = 2;

/** Session divergence between clouds that is worth an operator's attention. */
export const SESSION_IMBALANCE_WARNING = 30;

/** Verint WFO thresholds. Adherence and IVR fall the further they drift from target. */
export const ADHERENCE_TARGET = 90;
export const ADHERENCE_CRITICAL = 80;
export const OCCUPANCY_TARGET = 85;
export const OCCUPANCY_CRITICAL = 95;
export const OCCUPANCY_LOW = 55;
export const IVR_TARGET = 45;
export const IVR_CRITICAL = 30;
/** Forecast band: within ±12% is nominal, beyond ±25% is a miss worth escalating. */
export const FORECAST_WARN = 0.12;
export const FORECAST_CRITICAL = 0.25;

export interface StatusMeta {
  label: string;
  /** Short label for dense rows. */
  short: string;
  color: string;
  /** Ordering weight - higher means more urgent. */
  weight: number;
}

export const STATUS_META: Record<StatusLevel, StatusMeta> = {
  critical: { label: 'Critical', short: 'Crit', color: tokens.status.critical, weight: 5 },
  warning: { label: 'Below target', short: 'Warn', color: tokens.status.warning, weight: 4 },
  watch: { label: 'Watch', short: 'Watch', color: tokens.status.watch, weight: 3 },
  nominal: { label: 'Nominal', short: 'OK', color: tokens.status.nominal, weight: 2 },
  idle: { label: 'Idle', short: 'Idle', color: tokens.status.idle, weight: 1 },
  unknown: { label: 'No data', short: 'N/A', color: tokens.status.unknown, weight: 0 },
};

export const ATTENTION_META: Record<AttentionKind, { label: string; color: string }> = {
  sla: { label: 'SLA', color: tokens.status.critical },
  queue: { label: 'Queue', color: tokens.status.warning },
  service: { label: 'Service', color: tokens.status.warning },
  session: { label: 'Sessions', color: tokens.status.watch },
  inactive: { label: 'No activity', color: tokens.status.idle },
  workforce: { label: 'Workforce', color: tokens.status.warning },
};

export function slaStatus(sla: number | null | undefined, target: number = SLA_TARGET): StatusLevel {
  if (sla === null || sla === undefined || Number.isNaN(sla)) return 'unknown';
  if (sla < SLA_CRITICAL) return 'critical';
  if (sla < target) return 'warning';
  return 'nominal';
}

export function queueStatus(queued: number | null | undefined): StatusLevel {
  if (queued === null || queued === undefined) return 'unknown';
  if (queued >= QUEUE_CRITICAL) return 'critical';
  if (queued >= QUEUE_WARNING) return 'warning';
  if (queued >= QUEUE_WATCH) return 'watch';
  return 'nominal';
}

export function errorRateStatus(rate: number | null | undefined): StatusLevel {
  if (rate === null || rate === undefined) return 'unknown';
  if (rate >= ERROR_CRITICAL) return 'critical';
  if (rate >= ERROR_WARNING) return 'warning';
  if (rate >= ERROR_WATCH) return 'watch';
  return 'nominal';
}

/**
 * Session health is measured against the region's own window average rather
 * than its peak: every region looks "down" against a peak at 07:00, so peak
 * ratios produce false alarms. Only a genuine drain (no sessions at all) or a
 * collapse well under the window average is worth an operator's attention.
 */
export function sessionStatus(current: number, average: number): StatusLevel {
  if (average <= 0) return current > 0 ? 'nominal' : 'idle';
  if (current <= 0) return 'critical';
  if (current < average * 0.25) return 'warning';
  if (current < average * 0.5) return 'watch';
  return 'nominal';
}

/** Schedule adherence: higher is better; a drop below 80% is a breach. */
export function adherenceStatus(value: number | null | undefined): StatusLevel {
  if (value === null || value === undefined || Number.isNaN(value)) return 'unknown';
  if (value < ADHERENCE_CRITICAL) return 'critical';
  if (value < ADHERENCE_TARGET) return 'warning';
  return 'nominal';
}

/** Average handle time: lower is better; anything past ~15% over target escalates. */
export function ahtStatus(seconds: number | null | undefined, target: number): StatusLevel {
  if (seconds === null || seconds === undefined || Number.isNaN(seconds)) return 'unknown';
  if (seconds > target * 1.15) return 'critical';
  if (seconds > target) return 'warning';
  return 'nominal';
}

/**
 * Occupancy is a two-sided signal: over-occupancy means burnout, under-occupancy
 * means the roster is over-provisioned. Both are worth a look.
 */
export function occupancyStatus(value: number | null | undefined): StatusLevel {
  if (value === null || value === undefined || Number.isNaN(value)) return 'unknown';
  if (value >= OCCUPANCY_CRITICAL) return 'critical';
  if (value >= OCCUPANCY_TARGET) return 'warning';
  if (value < OCCUPANCY_LOW) return 'watch';
  return 'nominal';
}

/** IVR self-service containment: higher is better. */
export function ivrContainmentStatus(value: number | null | undefined): StatusLevel {
  if (value === null || value === undefined || Number.isNaN(value)) return 'unknown';
  if (value < IVR_CRITICAL) return 'critical';
  if (value < IVR_TARGET) return 'warning';
  return 'nominal';
}

/** Forecast vs actual volume: deviation in either direction is a staffing miss. */
export function forecastStatus(ratio: number | null | undefined): StatusLevel {
  if (ratio === null || ratio === undefined || Number.isNaN(ratio)) return 'unknown';
  const deviation = Math.abs(ratio - 1);
  if (deviation >= FORECAST_CRITICAL) return 'critical';
  if (deviation >= FORECAST_WARN) return 'warning';
  return 'nominal';
}

/**
 * Rolls the five workforce signals into one row-level verdict and note.
 * The note names the specific failure so the row explains itself without a hover.
 */
export function classifyWorkforce(input: {
  adherence: number;
  adherenceTarget: number;
  ahtSeconds: number;
  ahtTargetSeconds: number;
  occupancy: number;
  occupancyTarget: number;
  forecastActualRatio: number;
  ivrContainment: number;
}): { status: StatusLevel; attention: AttentionKind[]; note: string } {
  const levels: StatusLevel[] = [];
  const notes: string[] = [];

  const adh = adherenceStatus(input.adherence);
  levels.push(adh);
  if (adh === 'critical' || adh === 'warning') {
    notes.push(`Adherence ${input.adherence.toFixed(1)}% vs ${input.adherenceTarget}%`);
  }

  const aht = ahtStatus(input.ahtSeconds, input.ahtTargetSeconds);
  levels.push(aht);
  if (aht === 'critical' || aht === 'warning') {
    notes.push(`AHT ${formatAht(input.ahtSeconds)} vs ${formatAht(input.ahtTargetSeconds)}`);
  }

  const occ = occupancyStatus(input.occupancy);
  levels.push(occ);
  if (occ === 'critical' || occ === 'warning') {
    notes.push(occ === 'critical' ? `Occupancy ${input.occupancy.toFixed(1)}% · burnout risk` : `Occupancy ${input.occupancy.toFixed(1)}%`);
  }

  const fcast = forecastStatus(input.forecastActualRatio);
  levels.push(fcast);
  if (fcast === 'critical' || fcast === 'warning') {
    notes.push(`Volume ${formatForecastDeviation(input.forecastActualRatio)} vs forecast`);
  }

  const ivr = ivrContainmentStatus(input.ivrContainment);
  levels.push(ivr);
  if (ivr === 'critical' || ivr === 'warning') {
    notes.push(`IVR ${input.ivrContainment.toFixed(1)}% vs ${IVR_TARGET}%`);
  }

  const flagged = notes.length > 0;
  return {
    status: flagged ? worstStatus(levels) : 'nominal',
    attention: flagged ? ['workforce'] : [],
    note: notes.length > 0 ? notes.join(' · ') : 'Within target',
  };
}

/** Worst status wins - used to roll rows up into a section headline. */
export function worstStatus(levels: StatusLevel[]): StatusLevel {
  if (levels.length === 0) return 'unknown';
  return levels.reduce((worst, next) =>
    STATUS_META[next].weight > STATUS_META[worst].weight ? next : worst,
  );
}

/**
 * Derives every row-level flag from the raw numbers so the presentation layer
 * never re-implements thresholds.
 *
 * Note the deliberate asymmetry: SLA is a cumulative, day-to-date figure, so a
 * client with no live traffic can still be below target for the day. Rows are
 * flagged for SLA on that basis, and separately flagged `inactive` when no call
 * is currently queued or connected.
 */
export function classifyClient(input: {
  callsQueued: number;
  callsActive: number;
  slaToday: number | null;
  slaTarget?: number;
}): { status: StatusLevel; attention: ClientRow['attention']; note: string } {
  const target = input.slaTarget ?? SLA_TARGET;
  const attention: ClientRow['attention'] = [];
  const notes: string[] = [];

  const serviceLevel = slaStatus(input.slaToday, target);
  const queueLevel = queueStatus(input.callsQueued);
  const noLiveTraffic = input.callsQueued === 0 && input.callsActive === 0;

  if (serviceLevel === 'critical' || serviceLevel === 'warning') {
    attention.push('sla');
    notes.push(
      serviceLevel === 'critical'
        ? `SLA ${input.slaToday?.toFixed(1)}% · ${(SLA_CRITICAL - (input.slaToday ?? 0)).toFixed(1)}pt below the ${SLA_CRITICAL}% floor`
        : `SLA ${input.slaToday?.toFixed(1)}% · under the ${target}% target`,
    );
  }

  if (queueLevel === 'critical' || queueLevel === 'warning' || queueLevel === 'watch') {
    attention.push('queue');
    notes.push(`${input.callsQueued} call${input.callsQueued === 1 ? '' : 's'} waiting`);
  }

  if (noLiveTraffic) {
    attention.push('inactive');
    notes.push(serviceLevel === 'unknown' ? 'No calls routed in the window' : 'No live calls, day-to-date score retained');
  }

  // A client that reported nothing at all is idle rather than nominal.
  const status: StatusLevel = noLiveTraffic && serviceLevel === 'unknown' ? 'idle' : worstStatus([serviceLevel, queueLevel]);

  return {
    status,
    attention,
    note: notes.length > 0 ? notes.join(' · ') : 'Within target',
  };
}
