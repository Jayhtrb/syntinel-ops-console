import type { WorkforceRow, WorkforceSummary } from '../../types/dashboard';
import {
  ADHERENCE_TARGET,
  IVR_TARGET,
  OCCUPANCY_TARGET,
  classifyWorkforce,
} from '../../lib/status';

/**
 * Verint WFO workforce telemetry.
 *
 * PROVENANCE
 * Synthesised around the same operating window as the JTOCC capture
 * (2026-10-05, early shift). Adherence, AHT, occupancy, forecast-vs-actual and
 * IVR containment follow plausible contact-centre ranges and are deterministic,
 * so a refresh always returns identical figures.
 */

export interface WorkforceSeed {
  id: string;
  team: string;
  scheduled: number;
  loggedIn: number;
  adherence: number;
  ahtSeconds: number;
  ahtTargetSeconds: number;
  occupancy: number;
  forecastActualRatio: number;
  ivrContainment: number;
}

export const WORKFORCE_SEEDS: WorkforceSeed[] = [
  { id: 'customer-service', team: 'Customer Service', scheduled: 42, loggedIn: 39, adherence: 88.4, ahtSeconds: 412, ahtTargetSeconds: 420, occupancy: 79, forecastActualRatio: 1.06, ivrContainment: 51 },
  { id: 'fraud', team: 'Fraud', scheduled: 18, loggedIn: 18, adherence: 93.1, ahtSeconds: 388, ahtTargetSeconds: 360, occupancy: 88, forecastActualRatio: 1.12, ivrContainment: 38 },
  { id: 'collections', team: 'Collections', scheduled: 12, loggedIn: 9, adherence: 74.6, ahtSeconds: 462, ahtTargetSeconds: 420, occupancy: 93, forecastActualRatio: 0.82, ivrContainment: 29 },
  { id: 'credit-operations', team: 'Credit Operations', scheduled: 22, loggedIn: 21, adherence: 91.8, ahtSeconds: 341, ahtTargetSeconds: 350, occupancy: 82, forecastActualRatio: 0.98, ivrContainment: 56 },
  { id: 'digital-support', team: 'Digital Support', scheduled: 15, loggedIn: 6, adherence: 61.2, ahtSeconds: 528, ahtTargetSeconds: 400, occupancy: 96, forecastActualRatio: 0.71, ivrContainment: 22 },
];

/** Synthesised prior window for delta indicators. */
const WORKFORCE_PREVIOUS = {
  adherence: 87.9,
  ahtSeconds: 396,
  occupancy: 81.2,
  ivrContainment: 47.8,
  forecastActualRatio: 1.02,
} as const;

export function buildWorkforceRows(seeds: WorkforceSeed[] = WORKFORCE_SEEDS): WorkforceRow[] {
  return seeds.map((seed) => {
    const classified = classifyWorkforce({
      adherence: seed.adherence,
      adherenceTarget: ADHERENCE_TARGET,
      ahtSeconds: seed.ahtSeconds,
      ahtTargetSeconds: seed.ahtTargetSeconds,
      occupancy: seed.occupancy,
      occupancyTarget: OCCUPANCY_TARGET,
      forecastActualRatio: seed.forecastActualRatio,
      ivrContainment: seed.ivrContainment,
    });
    return {
      id: seed.id,
      team: seed.team,
      scheduled: seed.scheduled,
      loggedIn: seed.loggedIn,
      adherence: seed.adherence,
      adherenceTarget: ADHERENCE_TARGET,
      ahtSeconds: seed.ahtSeconds,
      ahtTargetSeconds: seed.ahtTargetSeconds,
      occupancy: seed.occupancy,
      occupancyTarget: OCCUPANCY_TARGET,
      forecastActualRatio: seed.forecastActualRatio,
      ivrContainment: seed.ivrContainment,
      ivrTarget: IVR_TARGET,
      status: classified.status,
      attention: classified.attention,
      note: classified.note,
    };
  });
}

function weighted(values: Array<[number, number]>): number {
  const totalWeight = values.reduce((sum, [, weight]) => sum + weight, 0);
  if (totalWeight === 0) return 0;
  return values.reduce((sum, [value, weight]) => sum + value * weight, 0) / totalWeight;
}

/**
 * Whole-workforce roll-up. Adherence and occupancy are weighted by schedule and
 * login headcount respectively so a big team moves the aggregate more than a
 * small one; AHT and IVR follow logged-in headcount.
 */
export function summariseWorkforce(rows: WorkforceRow[]): WorkforceSummary {
  if (rows.length === 0) {
    return {
      adherence: null,
      adherenceTarget: ADHERENCE_TARGET,
      ahtSeconds: null,
      ahtTargetSeconds: 0,
      occupancy: null,
      occupancyTarget: OCCUPANCY_TARGET,
      ivrContainment: null,
      ivrTarget: IVR_TARGET,
      forecastActualRatio: null,
      scheduled: null,
      loggedIn: null,
      shrinkage: null,
      previous: { ...WORKFORCE_PREVIOUS },
    };
  }

  const scheduled = rows.reduce((sum, row) => sum + row.scheduled, 0);
  const loggedIn = rows.reduce((sum, row) => sum + row.loggedIn, 0);

  const adherence = weighted(rows.map((row) => [row.adherence, row.scheduled] as [number, number]));
  const ahtSeconds = weighted(rows.map((row) => [row.ahtSeconds, row.loggedIn] as [number, number]));
  const ahtTargetSeconds = weighted(rows.map((row) => [row.ahtTargetSeconds, row.loggedIn] as [number, number]));
  const occupancy = weighted(rows.map((row) => [row.occupancy, row.loggedIn] as [number, number]));
  const ivrContainment = weighted(rows.map((row) => [row.ivrContainment, row.loggedIn] as [number, number]));
  const forecastActualRatio = weighted(rows.map((row) => [row.forecastActualRatio, row.scheduled] as [number, number]));

  return {
    adherence: Number(adherence.toFixed(1)),
    adherenceTarget: ADHERENCE_TARGET,
    ahtSeconds: Math.round(ahtSeconds),
    ahtTargetSeconds: Math.round(ahtTargetSeconds),
    occupancy: Number(occupancy.toFixed(1)),
    occupancyTarget: OCCUPANCY_TARGET,
    ivrContainment: Number(ivrContainment.toFixed(1)),
    ivrTarget: IVR_TARGET,
    forecastActualRatio: Number(forecastActualRatio.toFixed(3)),
    scheduled,
    loggedIn,
    shrinkage: scheduled > 0 ? Number((((scheduled - loggedIn) / scheduled) * 100).toFixed(1)) : null,
    previous: { ...WORKFORCE_PREVIOUS },
  };
}
