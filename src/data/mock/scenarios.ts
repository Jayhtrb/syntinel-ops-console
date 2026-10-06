import type { DataScenario } from '../../types/dashboard';
import { CLIENT_SEEDS, SERVICE_SEEDS, type ClientSeed, type ServiceSeed } from './operations';
import { LOGIN_SEEDS, REGION_SEEDS, type LoginSeed, type RegionSeed } from './platforms';
import { WORKFORCE_SEEDS, type WorkforceSeed } from './workforce';
import { SYSTEM_SEED_BASE, SYSTEM_SEED_EMPTY, type SystemSeed } from './system';

/**
 * Scenario inputs.
 *
 * Non-happy-path scenarios perturb the *seeds* rather than the rendered
 * snapshot, so every status, notice and attention flag is recomputed by the same
 * derivation code the live path uses. Nothing in the UI is special-cased per
 * scenario, which is exactly what we want to prove.
 */

export interface ScenarioInputs {
  system: SystemSeed;
  clients: ClientSeed[];
  services: ServiceSeed[];
  regions: RegionSeed[];
  logins: LoginSeed[];
  workforce: WorkforceSeed[];
  empty: boolean;
}

function patchBy<T extends { id: string }>(rows: T[], overrides: Record<string, Partial<T>>): T[] {
  return rows.map((row) => (overrides[row.id] ? { ...row, ...overrides[row.id] } : row));
}

const WARNING_CLIENTS: Record<string, Partial<ClientSeed>> = {
  'paypal-all': { callsQueued: 2, callsActive: 14, slaToday: 87.3 },
  'amazon-all': { callsQueued: 5, callsActive: 22, slaToday: 91.4 },
  'belk-cmb': { callsQueued: 4, callsActive: 12, slaToday: 88.0 },
  'amer-eagle-comb': { callsQueued: 0, callsActive: 6, slaToday: 92.5 },
  'bank-deposits-all': { callsQueued: 0, callsActive: 4, slaToday: 96.1 },
};

const WARNING_SERVICES: Record<string, Partial<ServiceSeed>> = {
  'insert-payment': { errorRate: 0.71, errorCount: 118.4, throughput: 1_284 },
  'mw-lookup': { errorRate: 0.22, errorCount: 24.6, throughput: 71 },
  'acct-payment-1': { errorRate: 0.08, errorCount: 42.9, throughput: 180_422 },
};

const CRITICAL_CLIENTS: Record<string, Partial<ClientSeed>> = {
  'paypal-all': { callsQueued: 24, callsActive: 61, slaToday: 71.6 },
  'amazon-all': { callsQueued: 9, callsActive: 34, slaToday: 79.4 },
  'belk-cmb': { callsQueued: 6, callsActive: 18, slaToday: 83.1 },
  'amer-eagle-comb': { callsQueued: 0, callsActive: 9, slaToday: 86.9 },
  'bank-deposits-all': { callsQueued: 3, callsActive: 11, slaToday: 89.2 },
  'cnb-all': { callsQueued: 0, callsActive: 7, slaToday: 93.4 },
};

const CRITICAL_SERVICES: Record<string, Partial<ServiceSeed>> = {
  'insert-payment': { errorRate: 3.42, errorCount: 640.7, throughput: 1_512 },
  'mw-lookup': { errorRate: 0.86, errorCount: 96.1, throughput: 88 },
  'acct-payment-1': { errorRate: 1.12, errorCount: 512.3, throughput: 191_040 },
  'promise-to-pay': { errorRate: 0.64, errorCount: 38.2, throughput: 61 },
  'payment-info': { errorRate: 0.31, errorCount: 21.7, throughput: 74 },
};

const CRITICAL_REGIONS: Record<string, Partial<RegionSeed>> = {
  'aws-us-west': { current: 0, deltaPercent: -100 },
  'azure-us-west': { current: 2, deltaPercent: -94.1 },
  'aws-mumbai': { current: 78, deltaPercent: -49.4 },
};

const CRITICAL_LOGINS: Record<string, Partial<LoginSeed>> = {
  'customer-service': { users: 96, changeVsPriorDay: -53.4 },
  fraud: { users: 12, changeVsPriorDay: -85.7 },
  collections: { users: 0, changeVsPriorDay: -100 },
};

const WARNING_WORKFORCE: Record<string, Partial<WorkforceSeed>> = {
  'customer-service': { adherence: 85.2, occupancy: 84 },
  fraud: { occupancy: 92, ahtSeconds: 404, forecastActualRatio: 1.18 },
  collections: { adherence: 81.4, occupancy: 91, forecastActualRatio: 0.78, ivrContainment: 32 },
  'digital-support': { adherence: 82.5, ahtSeconds: 430, occupancy: 90, forecastActualRatio: 0.88, ivrContainment: 34 },
};

const CRITICAL_WORKFORCE: Record<string, Partial<WorkforceSeed>> = {
  collections: { adherence: 72.1, ahtSeconds: 492, occupancy: 95, forecastActualRatio: 0.68, ivrContainment: 24 },
  fraud: { adherence: 84.9, occupancy: 96 },
  'digital-support': { adherence: 58.4, occupancy: 97, forecastActualRatio: 0.61, ivrContainment: 19 },
};

const WARNING_SYSTEM: Partial<SystemSeed> = {
  callsQueued: 11,
  callsActive: 214,
  slaToday: 91.2,
  errorRate: 0.62,
  throughput: 183_940,
  activeUsers: 3,
};

const CRITICAL_SYSTEM: Partial<SystemSeed> = {
  callsQueued: 39,
  callsActive: 288,
  slaToday: 74.8,
  errorRate: 2.91,
  throughput: 164_210,
  activeUsers: 1,
};

function withPrevious(base: SystemSeed, patch: Partial<SystemSeed>): SystemSeed {
  return { ...base, ...patch, previous: { ...base.previous } };
}

export function scenarioInputs(scenario: DataScenario): ScenarioInputs {
  switch (scenario) {
    case 'empty':
      return {
        system: SYSTEM_SEED_EMPTY,
        clients: [],
        services: [],
        regions: [],
        logins: [],
        workforce: [],
        empty: true,
      };
    case 'warning':
      return {
        system: withPrevious(SYSTEM_SEED_BASE, WARNING_SYSTEM),
        clients: patchBy(CLIENT_SEEDS, WARNING_CLIENTS),
        services: patchBy(SERVICE_SEEDS, WARNING_SERVICES),
        regions: REGION_SEEDS,
        logins: LOGIN_SEEDS,
        workforce: patchBy(WORKFORCE_SEEDS, WARNING_WORKFORCE),
        empty: false,
      };
    case 'critical':
      return {
        system: withPrevious(SYSTEM_SEED_BASE, CRITICAL_SYSTEM),
        clients: patchBy(CLIENT_SEEDS, CRITICAL_CLIENTS),
        services: patchBy(SERVICE_SEEDS, CRITICAL_SERVICES),
        regions: patchBy(REGION_SEEDS, CRITICAL_REGIONS),
        logins: patchBy(LOGIN_SEEDS, CRITICAL_LOGINS),
        workforce: patchBy(WORKFORCE_SEEDS, CRITICAL_WORKFORCE),
        empty: false,
      };
    case 'live':
    case 'loading':
    case 'error':
    default:
      return {
        system: withPrevious(SYSTEM_SEED_BASE, {}),
        clients: CLIENT_SEEDS,
        services: SERVICE_SEEDS,
        regions: REGION_SEEDS,
        logins: LOGIN_SEEDS,
        workforce: WORKFORCE_SEEDS,
        empty: false,
      };
  }
}
