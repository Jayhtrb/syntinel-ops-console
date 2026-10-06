import { classifyClient, worstStatus, SLA_TARGET } from '../../lib/status';
import type { CapabilitySummary, ClientRow, ServiceRow } from '../../types/dashboard';
import { errorRateStatus } from '../../lib/status';

/**
 * Captured operational telemetry.
 *
 * PROVENANCE
 * - `clients` are the ten rows of the source "CALLS IN QUEUE 1 / TOP 10 RESULTS"
 *   view, with queue depth, active calls and SLA% exactly as displayed.
 * - `services` and `capabilities` are the ten rows and four capability tabs of
 *   the source "MW Services / BUSINESS CAPABILITIES" view.
 */

export interface ClientSeed {
  id: string;
  name: string;
  callsQueued: number;
  callsActive: number;
  slaToday: number | null;
}

export const CLIENT_SEEDS: ClientSeed[] = [
  { id: 'paypal-all', name: 'PAYPAL_ALL', callsQueued: 1, callsActive: 9, slaToday: 80.8 },
  { id: 'allegro-dealer', name: 'Allegro_Dealer', callsQueued: 0, callsActive: 0, slaToday: null },
  { id: 'amazon-all', name: 'Amazon_ALL', callsQueued: 0, callsActive: 8, slaToday: 97.7 },
  { id: 'amer-eagle-comb', name: 'Amer_Eagle_Comb', callsQueued: 0, callsActive: 0, slaToday: 90.0 },
  { id: 'athome-dc-pl-all', name: 'AtHome_DC_PL_All', callsQueued: 0, callsActive: 0, slaToday: 100.0 },
  { id: 'bank-deposits-all', name: 'Bank_Deposits_All', callsQueued: 0, callsActive: 0, slaToday: null },
  { id: 'belk-cmb', name: 'Belk_CMB', callsQueued: 0, callsActive: 0, slaToday: 94.4 },
  { id: 'cnb-all', name: 'CNB_ALL', callsQueued: 0, callsActive: 0, slaToday: null },
  { id: 'cathay-dc-all', name: 'Cathay_DC_All', callsQueued: 0, callsActive: 0, slaToday: null },
  { id: 'cheapo-cmb', name: 'Cheapo_CMB', callsQueued: 0, callsActive: 0, slaToday: null },
];

/** Overall queue position across every client, not just the top ten shown. */
export const SYSTEM_TOTALS_BASE = {
  queued: 1,
  active: 66,
  slaToday: 83.9,
  slaTarget: SLA_TARGET,
} as const;

export function buildClientRows(seeds: ClientSeed[] = CLIENT_SEEDS, slaTarget = SLA_TARGET): ClientRow[] {
  return seeds.map((seed) => {
    const classified = classifyClient({
      callsQueued: seed.callsQueued,
      callsActive: seed.callsActive,
      slaToday: seed.slaToday,
      slaTarget,
    });
    return {
      id: seed.id,
      name: seed.name,
      callsQueued: seed.callsQueued,
      callsActive: seed.callsActive,
      slaToday: seed.slaToday,
      slaTarget,
      status: classified.status,
      attention: classified.attention,
      note: classified.note,
    };
  });
}

/** Rolls the visible client rows up into a queue/SLA headline. */
export function summariseClients(rows: ClientRow[], slaTarget = SLA_TARGET) {
  if (rows.length === 0) return null;
  const scored = rows.filter((row) => row.slaToday !== null);
  const weighted = scored.length > 0 ? scored.reduce((sum, row) => sum + (row.slaToday ?? 0), 0) / scored.length : null;
  return {
    queued: rows.reduce((sum, row) => sum + row.callsQueued, 0),
    active: rows.reduce((sum, row) => sum + row.callsActive, 0),
    slaToday: weighted === null ? null : Number(weighted.toFixed(1)),
    slaTarget,
  };
}

export interface ServiceSeed {
  id: string;
  name: string;
  instance: string;
  capabilityId: CapabilityId;
  errorCount: number;
  throughput: number;
  errorRate: number;
}

export type CapabilityId = 'payment-related' | 'other' | 'credit-line' | 'customer-verification-otp';

export const CAPABILITY_LABELS: Record<CapabilityId, string> = {
  'payment-related': 'Payment Related Services',
  other: 'Other',
  'credit-line': 'Credit Line Services',
  'customer-verification-otp': 'Customer Verification Services Email OTP Verify',
};

export const SERVICE_SEEDS: ServiceSeed[] = [
  { id: 'insert-payment', name: 'insertPayment', instance: '', capabilityId: 'payment-related', errorCount: 2.054, throughput: 1106, errorRate: 0 },
  { id: 'mw-lookup', name: 'MWLookupService', instance: '', capabilityId: 'other', errorCount: 0.173, throughput: 59, errorRate: 0 },
  { id: 'acct-payment-1', name: 'AcctPaymentSvc', instance: 'I1', capabilityId: 'payment-related', errorCount: 0.166, throughput: 168503, errorRate: 0 },
  { id: 'get-rewards', name: 'getRewards', instance: '', capabilityId: 'other', errorCount: 0.061, throughput: 7, errorRate: 0 },
  { id: 'promise-to-pay', name: 'PromiseToPaySvc', instance: '', capabilityId: 'payment-related', errorCount: 0.004, throughput: 48, errorRate: 0 },
  { id: 'payment-info', name: 'PaymentInfoSvc', instance: '', capabilityId: 'payment-related', errorCount: 0.004, throughput: 60, errorRate: 0 },
  { id: 'purgatory-auto-pay', name: 'PurgatoryAutoPaySvc', instance: '', capabilityId: 'payment-related', errorCount: 0.003, throughput: 60, errorRate: 0 },
  { id: 'manage-auto-pay', name: 'ManageAutoPaySvc', instance: '', capabilityId: 'payment-related', errorCount: 0.001, throughput: 60, errorRate: 0 },
  { id: 'acct-payment-2', name: 'AcctPaymentSvc', instance: 'I2', capabilityId: 'payment-related', errorCount: 0.001, throughput: 72, errorRate: 0 },
  { id: 'acct-payment-3', name: 'AcctPaymentSvc', instance: 'I3', capabilityId: 'payment-related', errorCount: 0.001, throughput: 60, errorRate: 0 },
];

function serviceNote(seed: ServiceSeed): string {
  if (seed.throughput === 0) return 'No traffic in window';
  if (seed.throughput < 10) return 'Low sample - rate is not statistically significant';
  if (seed.errorCount > 1) return 'Highest reported error count on the capability';
  return 'Within tolerance';
}

export function buildServiceRows(seeds: ServiceSeed[] = SERVICE_SEEDS): ServiceRow[] {
  return seeds.map((seed) => ({
    id: seed.id,
    name: seed.name,
    instance: seed.instance,
    capabilityId: seed.capabilityId,
    capabilityLabel: CAPABILITY_LABELS[seed.capabilityId],
    errorCount: seed.errorCount,
    throughput: seed.throughput,
    errorRate: seed.errorRate,
    status: errorRateStatus(seed.errorRate),
    note: serviceNote(seed),
  }));
}

export function buildCapabilities(rows: ServiceRow[]): CapabilitySummary[] {
  const order: CapabilityId[] = ['payment-related', 'other', 'credit-line', 'customer-verification-otp'];
  return order.map((id) => {
    const owned = rows.filter((row) => row.capabilityId === id);
    const errorRate = owned.length > 0 ? Math.max(...owned.map((row) => row.errorRate)) : 0;
    return {
      id,
      label: CAPABILITY_LABELS[id],
      errorRate,
      serviceCount: owned.length,
      status: owned.length === 0 ? 'idle' : worstStatus(owned.map((row) => row.status)),
    };
  });
}

export function throughputTotal(rows: ServiceRow[]): number {
  return rows.reduce((sum, row) => sum + row.throughput, 0);
}
