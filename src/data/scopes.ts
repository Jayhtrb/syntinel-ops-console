import type { ApplicationId, DateRangeId, ScopeMeta } from '../types/dashboard';

/**
 * Application scopes.
 *
 * The source console navigated between Applications / Citrix / MW Services in a
 * permanent sidebar. This redesign keeps the same scoping model but expresses it
 * as a filter over one page, so no navigation rail is needed.
 */
export const SCOPES: Record<ApplicationId, ScopeMeta> = {
  all: {
    id: 'all',
    label: 'All applications',
    description: 'Every monitored estate: call queues, middleware services, cloud sessions and workstation logins.',
    tableTabs: ['clients', 'services', 'regions'],
    defaultTableTab: 'clients',
    showLogins: true,
    showCloudControls: false,
    availableTrends: ['load', 'sla', 'sessions', 'activity'],
    defaultTrend: 'load',
  },
  'mw-services': {
    id: 'mw-services',
    label: 'MW Services',
    description: 'Middleware payment, lookup and auto-pay services with throughput and error-rate telemetry.',
    tableTabs: ['services', 'clients'],
    defaultTableTab: 'services',
    showLogins: false,
    loginEmptyReason:
      'Workstation login totals are collected per front-end application. They are not reported for the middleware estate.',
    showCloudControls: false,
    availableTrends: ['load', 'sla'],
    defaultTrend: 'load',
  },
  citrix: {
    id: 'citrix',
    label: 'Citrix',
    description: 'Concurrent virtual desktop and published-application sessions across AWS and Azure regions.',
    tableTabs: ['regions', 'clients'],
    defaultTableTab: 'regions',
    showLogins: false,
    loginEmptyReason:
      'Login totals are keyed to workstation applications rather than Citrix sessions. Select All applications to see them.',
    showCloudControls: true,
    availableTrends: ['sessions', 'load'],
    defaultTrend: 'sessions',
  },
  vista: {
    id: 'vista',
    label: 'Vista',
    description: 'Business capability activity for the Vista estate: login and payment counts against the customer base.',
    tableTabs: ['clients', 'services'],
    defaultTableTab: 'clients',
    showLogins: true,
    showCloudControls: false,
    availableTrends: ['activity', 'load', 'sla'],
    defaultTrend: 'activity',
  },
  workstation: {
    id: 'workstation',
    label: 'Workstation',
    description: 'Agent workstation estate: application login totals and the call queues those agents serve.',
    tableTabs: ['clients', 'services'],
    defaultTableTab: 'clients',
    showLogins: true,
    showCloudControls: false,
    availableTrends: ['activity', 'load'],
    defaultTrend: 'activity',
  },
  workforce: {
    id: 'workforce',
    label: 'Verint Workforce',
    description: 'Agent schedule adherence, handle time, occupancy, forecast accuracy and IVR self-service containment.',
    tableTabs: ['workforce'],
    defaultTableTab: 'workforce',
    showLogins: false,
    loginEmptyReason:
      'Workstation login totals are keyed to front-end applications. Select All applications to see them alongside workforce health.',
    showCloudControls: false,
    availableTrends: ['adherence', 'aht', 'occupancy', 'forecast', 'ivr'],
    defaultTrend: 'adherence',
    rightPanel: 'workforce',
  },
};

export const APPLICATION_OPTIONS: Array<{ id: ApplicationId; label: string; caption: string }> = [
  { id: 'all', label: 'All applications', caption: '10 clients · 10 services · 8 regions' },
  { id: 'mw-services', label: 'MW Services', caption: '10 services · 4 capabilities' },
  { id: 'citrix', label: 'Citrix', caption: '2 clouds · 8 regions' },
  { id: 'vista', label: 'Vista', caption: 'Login and payment capability activity' },
  { id: 'workstation', label: 'Workstation', caption: '5 applications · 3 concurrent users' },
  { id: 'workforce', label: 'Verint Workforce', caption: '5 teams · adherence · AHT · occupancy · forecast · IVR' },
];

export const RANGE_OPTIONS: Array<{ id: DateRangeId; label: string; caption: string; buckets: number; stepMinutes: number }> = [
  { id: '24h', label: 'Last 24h', caption: 'Hourly buckets', buckets: 24, stepMinutes: 60 },
  { id: '7d', label: 'Last 7 days', caption: 'Six-hour buckets', buckets: 28, stepMinutes: 360 },
  { id: '14d', label: 'Last 14 days', caption: 'Six-hour buckets', buckets: 56, stepMinutes: 360 },
];

export function rangeConfig(range: DateRangeId) {
  return RANGE_OPTIONS.find((option) => option.id === range) ?? RANGE_OPTIONS[0];
}

export function scopeFor(application: ApplicationId): ScopeMeta {
  return SCOPES[application] ?? SCOPES.all;
}
