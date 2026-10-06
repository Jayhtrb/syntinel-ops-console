import type { SystemStatus } from '../../types/dashboard';
import { SLA_TARGET } from '../../lib/status';

/**
 * System-level KPIs before range labels are attached.
 *
 * Captured from the "Overall System Call Status" row (1 queued / 66 active /
 * 83.9% SLA) and "Active Users: 3". The `previous` block is the comparable
 * prior window, synthesised so delta indicators have something to compare to.
 */
export interface SystemSeed {
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
}

export const SYSTEM_SEED_BASE: SystemSeed = {
  activeUsers: 3,
  callsQueued: 1,
  callsActive: 66,
  slaToday: 83.9,
  slaTarget: SLA_TARGET,
  servicesMonitored: 10,
  capabilities: 4,
  errorRate: 0,
  throughput: 170_035,
  previous: {
    activeUsers: 4,
    callsQueued: 0,
    callsActive: 58,
    slaToday: 88.6,
    errorRate: 0,
  },
};

/** Empty-window seed: every scalar is unknown so the UI must show its empty state. */
export const SYSTEM_SEED_EMPTY: SystemSeed = {
  activeUsers: null,
  callsQueued: null,
  callsActive: null,
  slaToday: null,
  slaTarget: SLA_TARGET,
  servicesMonitored: 0,
  capabilities: 0,
  errorRate: null,
  throughput: null,
  previous: {
    activeUsers: null,
    callsQueued: null,
    callsActive: null,
    slaToday: null,
    errorRate: null,
  },
};

export function toSystemStatus(seed: SystemSeed, windowLabel: string, lastUpdatedLabel: string): SystemStatus {
  return {
    activeUsers: seed.activeUsers,
    callsQueued: seed.callsQueued,
    callsActive: seed.callsActive,
    slaToday: seed.slaToday,
    slaTarget: seed.slaTarget,
    servicesMonitored: seed.servicesMonitored,
    capabilities: seed.capabilities,
    errorRate: seed.errorRate,
    throughput: seed.throughput,
    previous: seed.previous,
    windowLabel,
    lastUpdatedLabel,
  };
}
