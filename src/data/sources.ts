import { synthesizeIncidentTrend, synthesizePortfolios, synthesizeServices } from './portfolio/health';
import type { IncidentTrend, PortfolioHealth, ServiceHealth } from '../types/portfolio';

/**
 * Pluggable data-source layer.
 *
 * This is the single seam between the SynTinel UI and the tools in a real work
 * environment. Each domain capability (service health, incidents, call
 * telemetry, workforce, reports) is mapped to a tool kind in `sourceConfig`.
 * Swap a domain from `mock` to `servicenow` / `newrelic` / `splunk` /
 * `pagerduty` / `avaya-cms` / `verint` / `tableau`, point it at the real
 * endpoint, and the UI is unchanged.
 */

export type ToolKind =
  | 'mock'
  | 'servicenow'
  | 'newrelic'
  | 'splunk'
  | 'pagerduty'
  | 'avaya-cms'
  | 'verint'
  | 'tableau';

export type Domain = 'service-health' | 'incidents' | 'call-telemetry' | 'workforce' | 'reports';

export interface ToolConnection {
  kind: ToolKind;
  enabled: boolean;
  baseUrl?: string;
  /** How to authenticate. Point `tokenEnv` at the environment variable holding the secret. */
  auth?: { type: 'bearer' | 'apiKey' | 'basic'; tokenEnv?: string; header?: string };
  note?: string;
}

export interface SourceConfig {
  /** Which tool powers each domain. Defaults to the bundled mock adapter. */
  domain: Record<Domain, ToolKind>;
  tools: Partial<Record<ToolKind, ToolConnection>>;
}

/**
 * The one place to rewire the console for a production environment.
 *
 * Example (real wiring):
 *   domain: {
 *     'service-health': 'newrelic',
 *     incidents: 'servicenow',
 *     'call-telemetry': 'avaya-cms',
 *     workforce: 'verint',
 *     reports: 'tableau',
 *   },
 *   tools: {
 *     servicenow: { kind: 'servicenow', enabled: true, baseUrl: 'https://instance.service-now.com', auth: { type: 'bearer', tokenEnv: 'VITE_SN_TOKEN' } },
 *     ...
 *   },
 */
export const sourceConfig: SourceConfig = {
  domain: {
    'service-health': 'mock',
    incidents: 'mock',
    'call-telemetry': 'mock',
    workforce: 'mock',
    reports: 'mock',
  },
  tools: {
    mock: { kind: 'mock', enabled: true, note: 'Bundled deterministic data — no network required.' },
  },
};

export interface HealthAdapter {
  kind: ToolKind;
  label: string;
  getPortfolios(): Promise<PortfolioHealth[]>;
  getServices(): Promise<ServiceHealth[]>;
  getIncidentTrend(scope: { id: string; label: string; kind: 'portfolio' | 'service'; status: 'green' | 'amber' | 'red' }): Promise<IncidentTrend>;
}

let mockServices: ServiceHealth[] | null = null;
let mockPortfolios: PortfolioHealth[] | null = null;

const mockAdapter: HealthAdapter = {
  kind: 'mock',
  label: 'Mock data',
  async getPortfolios() {
    if (!mockPortfolios) {
      mockServices = synthesizeServices();
      mockPortfolios = synthesizePortfolios(mockServices);
    }
    return mockPortfolios;
  },
  async getServices() {
    if (!mockServices) {
      mockServices = synthesizeServices();
    }
    return mockServices;
  },
  async getIncidentTrend(scope) {
    return synthesizeIncidentTrend(scope);
  },
};

const TOOL_LABEL: Record<ToolKind, string> = {
  mock: 'Mock data',
  servicenow: 'ServiceNow',
  newrelic: 'New Relic',
  splunk: 'Splunk',
  pagerduty: 'PagerDuty',
  'avaya-cms': 'Avaya CMS',
  verint: 'Verint WFO',
  tableau: 'Tableau',
};

/** Builds a stub adapter that fails loudly until the tool is actually wired up. */
function createStub(kind: Exclude<ToolKind, 'mock'>): HealthAdapter {
  const label = TOOL_LABEL[kind];
  const failure = () =>
    Promise.reject(
      new Error(
        `${label} is not connected. Set \`sourceConfig.domain\` to '${kind}' and add its \`tools.${kind}\` connection (endpoint + auth) in src/data/sources.ts, then implement the fetch in the adapter registry.`,
      ),
    );
  return {
    kind,
    label,
    getPortfolios: failure,
    getServices: failure,
    getIncidentTrend: failure,
  };
}

const ADAPTERS: Record<ToolKind, HealthAdapter> = {
  mock: mockAdapter,
  servicenow: createStub('servicenow'),
  newrelic: createStub('newrelic'),
  splunk: createStub('splunk'),
  pagerduty: createStub('pagerduty'),
  'avaya-cms': createStub('avaya-cms'),
  verint: createStub('verint'),
  tableau: createStub('tableau'),
};

export function adapterFor(kind: ToolKind): HealthAdapter {
  return ADAPTERS[kind] ?? mockAdapter;
}

export function toolLabel(kind: ToolKind): string {
  return TOOL_LABEL[kind] ?? kind;
}

/** Resolves the adapter that currently powers a domain, per `sourceConfig`. */
export function adapterForDomain(domain: Domain): HealthAdapter {
  return adapterFor(sourceConfig.domain[domain]);
}
