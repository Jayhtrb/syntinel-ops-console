import type {
  AttentionItem,
  ClientRow,
  LoginRow,
  Notice,
  RegionSessionRow,
  ServiceRow,
  SystemStatus,
  WorkforceRow,
  WorkforceSummary,
} from '../types/dashboard';
import {
  STATUS_META,
  worstStatus,
  ERROR_WARNING,
  QUEUE_WARNING,
} from '../lib/status';
import { formatCompact, formatInteger, formatPercent, formatRatio } from '../lib/format';

/**
 * Attention and notice derivation.
 *
 * This is the "what needs a human right now" layer. It only reads derived
 * statuses, never thresholds, so tuning a threshold in `lib/status.ts`
 * immediately changes both the table flags and the banners above it.
 */

const SEVERITY_WEIGHT = { critical: 0, warning: 1, info: 2 } as const;

export function buildAttention(
  clients: ClientRow[],
  services: ServiceRow[],
  regions: RegionSessionRow[],
): AttentionItem[] {
  const items: AttentionItem[] = [];

  for (const client of clients) {
    if (client.attention.includes('sla') && client.slaToday !== null) {
      items.push({
        id: `${client.id}-sla`,
        kind: 'sla',
        severity: client.status === 'critical' ? 'critical' : 'warning',
        label: client.name,
        detail: `SLA ${formatPercent(client.slaToday)} against a ${client.slaTarget}% target`,
        short: `${formatPercent(client.slaToday)} vs ${client.slaTarget}%`,
        count: 1,
        clientId: client.id,
      });
    }
    if (client.attention.includes('queue')) {
      items.push({
        id: `${client.id}-queue`,
        kind: 'queue',
        severity: client.callsQueued >= QUEUE_WARNING ? 'warning' : 'watch',
        label: client.name,
        detail: `${client.callsQueued} waiting · ${client.callsActive} active`,
        short: `${client.callsQueued} waiting`,
        count: 1,
        clientId: client.id,
      });
    }
  }

  for (const service of services) {
    if (service.status === 'critical' || service.status === 'warning') {
      items.push({
        id: `${service.id}-service`,
        kind: 'service',
        severity: service.status,
        label: service.name,
        detail: `Error rate ${formatRatio(service.errorRate, 2)}% on ${formatCompact(service.throughput)} calls`,
        short: `${formatRatio(service.errorRate, 2)}% errors`,
        count: 1,
      });
    }
  }

  for (const region of regions) {
    if (region.status === 'critical') {
      items.push({
        id: `${region.id}-session`,
        kind: 'session',
        severity: 'critical',
        label: `${region.cloudLabel} · ${region.region}`,
        detail: 'No concurrent sessions reported',
        short: 'no sessions',
        count: 1,
      });
    } else if (region.status === 'warning') {
      items.push({
        id: `${region.id}-session`,
        kind: 'session',
        severity: 'warning',
        label: `${region.cloudLabel} · ${region.region}`,
        detail: `Drained to ${formatInteger(region.current)} against ${formatInteger(region.average)} average sessions`,
        short: `${formatInteger(region.current)} vs avg ${formatInteger(region.average)}`,
        count: 1,
      });
    }
  }

  const idleClients = clients.filter((client) => client.attention.includes('inactive'));
  if (idleClients.length >= 3) {
    items.push({
      id: 'idle-clients',
      kind: 'inactive',
      severity: 'idle',
      label: `${idleClients.length} clients idle`,
      detail: idleClients.map((client) => client.name).join(', '),
      short: 'no live traffic',
      count: idleClients.length,
    });
  }

  return items.sort((a, b) => {
    const weight = STATUS_META[b.severity].weight - STATUS_META[a.severity].weight;
    return weight !== 0 ? weight : a.label.localeCompare(b.label);
  });
}

/** Workforce signals only: one attention item per flagged team, severity first. */
export function buildWorkforceAttention(workforce: WorkforceRow[]): AttentionItem[] {
  return workforce
    .filter((row) => row.attention.includes('workforce'))
    .map((row): AttentionItem => ({
      id: `${row.id}-workforce`,
      kind: 'workforce',
      severity: row.status,
      label: row.team,
      detail: row.note,
      short: `adh ${formatPercent(row.adherence)} · occ ${formatPercent(row.occupancy)}`,
      count: 1,
    }))
    .sort((a, b) => {
      const weight = STATUS_META[b.severity].weight - STATUS_META[a.severity].weight;
      return weight !== 0 ? weight : a.label.localeCompare(b.label);
    });
}

interface NoticeInput {
  system: SystemStatus;
  clients: ClientRow[];
  services: ServiceRow[];
  logins: LoginRow[];
  workforce: WorkforceRow[];
  workforceSummary: WorkforceSummary | null;
  empty: boolean;
}

export function buildNotices(input: NoticeInput): Notice[] {
  const { system, clients, services, logins, workforce, empty } = input;

  if (empty) {
    return [
      {
        id: 'no-telemetry',
        severity: 'info',
        title: 'No telemetry in this window',
        message:
          'The collector returned an empty payload for the current filters. Widen the date range or check that the source feeds are registered.',
      },
    ];
  }

  const notices: Notice[] = [];
  const breaching = clients.filter((client) => client.status === 'critical' && client.slaToday !== null);
  const belowTarget = clients.filter((client) => client.status === 'warning' && client.slaToday !== null);
  const queuedTotal = clients.reduce((sum, client) => sum + client.callsQueued, 0);
  const deepest = clients.reduce<ClientRow | null>(
    (worst, client) => (worst === null || client.callsQueued > worst.callsQueued ? client : worst),
    null,
  );
  const worstService = services.length > 0 ? services.reduce((a, b) => (b.errorRate > a.errorRate ? b : a)) : null;
  const idleClients = clients.filter((client) => client.attention.includes('inactive'));
  const idleLogins = logins.filter((row) => row.users === 0);

  if (breaching.length > 0) {
    notices.push({
      id: 'sla-breach',
      severity: 'critical',
      title: `SLA breach on ${breaching.length} queue${breaching.length === 1 ? '' : 's'}`,
      message: `${breaching.map((client) => `${client.name} ${formatPercent(client.slaToday ?? 0)}`).join(', ')}. Overall SLA is ${formatPercent(system.slaToday)} against a ${system.slaTarget}% target.`,
    });
  }

  if (belowTarget.length > 0) {
    notices.push({
      id: 'sla-below-target',
      severity: 'warning',
      title: `${belowTarget.length} queue${belowTarget.length === 1 ? '' : 's'} below the ${system.slaTarget}% target`,
      message: `${belowTarget.map((client) => `${client.name} ${formatPercent(client.slaToday ?? 0)}`).join(', ')}. These clear the 85% breach floor but are losing service level now.`,
    });
  }

  if (deepest !== null && deepest.callsQueued >= QUEUE_WARNING) {
    notices.push({
      id: 'queue-build-up',
      severity: 'warning',
      title: 'Queue build-up detected',
      message: `${formatInteger(queuedTotal)} calls waiting across the top ten clients; deepest queue is ${deepest.name} with ${formatInteger(deepest.callsQueued)} waiting.`,
    });
  }

  if (worstService !== null && worstService.errorRate >= ERROR_WARNING) {
    notices.push({
      id: 'service-errors',
      severity: worstService.errorRate >= 2 ? 'critical' : 'warning',
      title: `Middleware error rate ${formatRatio(worstService.errorRate, 2)}%`,
      message: `${worstService.name} is the worst offender at ${formatRatio(worstService.errorCount)} reported error count across ${formatCompact(worstService.throughput)} calls.`,
    });
  }

  if (queuedTotal === 0 && breaching.length === 0 && belowTarget.length === 0 && worstService !== null && worstService.errorRate < ERROR_WARNING) {
    notices.push({
      id: 'nominal',
      severity: 'info',
      title: 'All monitored queues within target',
      message: `No queue below the ${system.slaTarget}% target and no middleware error rate above ${ERROR_WARNING}% in the current window.`,
    });
  }

  if (idleClients.length >= 3 || idleLogins.length > 0) {
    const parts: string[] = [];
    if (idleClients.length >= 3) {
      parts.push(`${idleClients.length} of ${clients.length} clients have no calls queued or active right now`);
    }
    if (idleLogins.length > 0) {
      parts.push(`${idleLogins.length} workstation application${idleLogins.length === 1 ? '' : 's'} recorded no logins (${idleLogins.map((row) => row.application).join(', ')})`);
    }
    notices.push({
      id: 'inactive-estate',
      severity: 'info',
      title: 'Inactive but monitored',
      message: `${parts.join('. ')}. Expected outside business hours - confirm if not.`,
    });
  }

  // Workforce (Verint WFO) health, folded into the same ranked feed. The row
  // note already names the specific failure, so the banner stays compact.
  if (workforce.length > 0) {
    const flagged = workforce.filter((row) => row.attention.includes('workforce'));
    if (flagged.length > 0) {
      const severity: Notice['severity'] = flagged.some((row) => row.status === 'critical') ? 'critical' : 'warning';
      const lead = flagged
        .slice(0, 2)
        .map((row) => `${row.team} (${(row.note.split(' · ')[0] ?? row.note).toLowerCase()})`)
        .join('; ');
      notices.push({
        id: 'workforce-signals',
        severity,
        title:
          severity === 'critical'
            ? `Workforce risk on ${flagged.length} team${flagged.length === 1 ? '' : 's'}`
            : 'Workforce below target',
        message: `${lead}. ${
          severity === 'critical'
            ? 'Escalate staffing before it feeds call queues.'
            : 'Watch for drift toward the breach floor.'
        }`,
      });
    }
  }

  return notices.sort((a, b) => SEVERITY_WEIGHT[a.severity] - SEVERITY_WEIGHT[b.severity]).slice(0, 3);
}

export function attentionSeverity(items: AttentionItem[]): AttentionItem['severity'] {
  return items.length === 0 ? 'nominal' : worstStatus(items.map((item) => item.severity));
}
