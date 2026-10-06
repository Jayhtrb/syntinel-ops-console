import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import type { AttentionKind, ApplicationId, CloudId, DataScenario, DateRangeId, TableTabId, TrendMetricId } from './types/dashboard';
import { scopeFor } from './data/scopes';
import { useDashboardSnapshot } from './hooks/useDashboardSnapshot';
import { worstStatus } from './lib/status';
import { tokens } from './theme/tokens';
import { SkipLink } from './components/layout/SkipLink';
import { TopBar, type AppView } from './components/layout/TopBar';
import { FilterBar } from './components/layout/FilterBar';
import { HealthView } from './components/health/HealthView';
import { SectionPanel } from './components/common/SectionPanel';
import { MicroLabel } from './components/common/atoms';
import { StateBanner } from './components/feedback/StateBanner';
import { ErrorState, NotCollectedState } from './components/feedback/StateSurfaces';
import { ChartSkeleton, KpiSkeletonRow, SkeletonRows } from './components/feedback/Skeletons';
import { SystemStatusStrip } from './components/dashboard/SystemStatusStrip';
import { AttentionStrip } from './components/dashboard/AttentionStrip';
import { KpiRow } from './components/dashboard/KpiRow';
import { OperationalTable } from './components/dashboard/OperationalTable';
import { ServiceThroughputTable } from './components/dashboard/ServiceThroughputTable';
import { RegionSessionTable } from './components/dashboard/RegionSessionTable';
import { WorkforceTable } from './components/dashboard/WorkforceTable';
import { WorkforceRosterPanel } from './components/dashboard/WorkforceRosterPanel';
import { TrendChart } from './components/dashboard/TrendChart';
import { ApplicationLoginSummary } from './components/dashboard/ApplicationLoginSummary';

const TABLE_TITLES: Record<TableTabId, string> = {
  clients: 'Client call queues',
  services: 'Middleware service throughput',
  regions: 'Cloud region sessions',
  workforce: 'Workforce performance',
};

const SCENARIOS: DataScenario[] = ['live', 'loading', 'empty', 'error', 'warning', 'critical'];
const APPLICATIONS: ApplicationId[] = ['all', 'mw-services', 'citrix', 'vista', 'workstation', 'workforce'];
const RANGES: DateRangeId[] = ['24h', '7d', '14d'];
const CLOUDS: CloudId[] = ['aws', 'azure'];

function readParam<T extends string>(params: URLSearchParams, key: string, allowed: readonly T[], fallback: T): T {
  const value = params.get(key);
  return value && (allowed as readonly string[]).includes(value) ? (value as T) : fallback;
}

/**
 * QA affordance: any view is addressable.
 *
 * `?state=critical`, `?app=citrix&cloud=azure&region=azure-mumbai`, `?range=14d`.
 * Non-happy-path states and per-scope layouts can therefore be shared as a link,
 * screenshotted and reviewed without driving the UI by hand.
 */
function readDeepLink() {
  if (typeof window === 'undefined') {
    return { application: 'all' as ApplicationId, range: '24h' as DateRangeId, cloud: 'aws' as CloudId, regionId: 'aws-singapore', scenario: 'live' as DataScenario };
  }
  const params = new URLSearchParams(window.location.search);
  const cloud = readParam(params, 'cloud', CLOUDS, 'aws');
  const region = params.get('region');
  return {
    application: readParam(params, 'app', APPLICATIONS, 'all'),
    range: readParam(params, 'range', RANGES, '24h'),
    cloud,
    regionId: region && region.startsWith(`${cloud}-`) ? region : `${cloud}-singapore`,
    scenario: readParam(params, 'state', SCENARIOS, 'live'),
  };
}

const INITIAL = readDeepLink();

/**
 * SynTinel Operations Console - single page, single scroll column.
 *
 * Deliberately no left navigation rail and no right intelligence panel: there is
 * exactly one page, so navigation would be decoration and a side panel would
 * steal width the operational table needs at 1366×768.
 */
export default function App(): ReactNode {
  const [application, setApplication] = useState<ApplicationId>(INITIAL.application);
  const [range, setRange] = useState<DateRangeId>(INITIAL.range);
  const [cloud, setCloud] = useState<CloudId>(INITIAL.cloud);
  const [regionId, setRegionId] = useState<string>(INITIAL.regionId);
  const [scenario, setScenario] = useState<DataScenario>(INITIAL.scenario);
  const [tableTab, setTableTab] = useState<TableTabId>('clients');
  const [trendId, setTrendId] = useState<TrendMetricId>('load');
  const [selectedKinds, setSelectedKinds] = useState<AttentionKind[]>([]);
  const [capabilityId, setCapabilityId] = useState<string | null>(null);
  const [view, setView] = useState<AppView>('health');

  const scope = useMemo(() => scopeFor(application), [application]);
  const { phase, snapshot, error, loadedAtIso, reload } = useDashboardSnapshot({ application, range, cloud, regionId, scenario });

  // Changing the application re-scopes the table and resets the chart to the
  // view that matters most for that estate (sessions for Citrix, activity for
  // Vista, call load everywhere else).
  useEffect(() => {
    setTableTab(scopeFor(application).defaultTableTab);
    setTrendId(scopeFor(application).defaultTrend);
    setCapabilityId(null);
  }, [application]);

  const effectiveTab = scope.tableTabs.includes(tableTab) ? tableTab : scope.defaultTableTab;
  const availableTrends = useMemo(
    () => (snapshot ? snapshot.trends.filter((view) => scope.availableTrends.includes(view.id)) : []),
    [snapshot, scope.availableTrends],
  );
  const effectiveTrend = scope.availableTrends.includes(trendId) ? trendId : scope.defaultTrend;

  const isDefaultFilters = application === 'all' && range === '24h' && cloud === 'aws' && regionId === 'aws-singapore';

  const isEmptyScope = Boolean(
    snapshot && snapshot.clients.length === 0 && snapshot.services.length === 0 && snapshot.system.callsQueued === null,
  );

  const overall = useMemo(() => {
    if (phase === 'error') return { severity: 'critical' as const, label: 'Telemetry lost', detail: 'No snapshot displayed' };
    if (!snapshot) return { severity: 'watch' as const, label: 'Loading', detail: 'Awaiting first snapshot' };
    if (isEmptyScope) return { severity: 'unknown' as const, label: 'No data', detail: 'Collector returned no rows' };
    const criticalNotices = snapshot.notices.filter((notice) => notice.severity === 'critical').length;
    const warningNotices = snapshot.notices.filter((notice) => notice.severity === 'warning').length;
    const severity =
      criticalNotices > 0
        ? ('critical' as const)
        : warningNotices > 0
          ? ('warning' as const)
          : snapshot.attention.length > 0
            ? worstStatus(snapshot.attention.map((item) => item.severity))
            : ('nominal' as const);
    const label = severity === 'critical' ? 'Critical' : severity === 'warning' ? 'Degraded' : severity === 'watch' ? 'Watch' : 'All nominal';
    const detail =
      snapshot.attention.length > 0
        ? `${snapshot.attention.length} signal${snapshot.attention.length === 1 ? '' : 's'} to review`
        : `${snapshot.clients.length} queues scored`;
    return { severity, label, detail };
  }, [phase, snapshot, isEmptyScope]);

  const toggleKind = (kind: AttentionKind) =>
    setSelectedKinds((current) => (current.includes(kind) ? current.filter((entry) => entry !== kind) : [...current, kind]));

  const deepestQueue = useMemo(() => {
    if (!snapshot || snapshot.clients.length === 0) return null;
    const worst = snapshot.clients.reduce((current, client) => (client.callsQueued > current.callsQueued ? client : current));
    return { name: worst.name, queued: worst.callsQueued };
  }, [snapshot]);

  const showSkeletons = phase === 'loading';
  const hasSnapshot = Boolean(snapshot);

  return (
    <>
      <SkipLink />
      <TopBar
        phase={phase}
        windowLabel={snapshot?.dataWindowLabel ?? null}
        loadedAtIso={loadedAtIso}
        scenario={scenario}
        onScenarioChange={setScenario}
        onReload={reload}
        overall={overall}
        view={view}
        onViewChange={setView}
      />
      {view === 'telemetry' ? (
        <FilterBar
          application={application}
          onApplicationChange={setApplication}
          range={range}
          onRangeChange={setRange}
          scope={scope}
          cloud={cloud}
          onCloudChange={(next) => {
            setCloud(next);
            setRegionId(`${next}-singapore`);
          }}
          regionId={regionId}
          onRegionChange={setRegionId}
          regions={snapshot?.regions ?? []}
          summary={
            snapshot
              ? `${snapshot.clients.length} clients · ${snapshot.services.length} services · ${snapshot.regions.length} regions`
              : phase === 'error'
                ? 'No scope data'
                : 'Loading scope…'
          }
          isDefault={isDefaultFilters}
          onReset={() => {
            setApplication('all');
            setRange('24h');
            setCloud('aws');
            setRegionId('aws-singapore');
            setSelectedKinds([]);
          }}
          busy={phase === 'refreshing'}
        />
      ) : null}

      <Box
        component="main"
        id="main-content"
        sx={{
          maxWidth: 'var(--shell-max)',
          marginInline: 'auto',
          paddingInline: { xs: 1.5, md: 2.5 },
          paddingBlock: { xs: 1.5, md: 2 },
          display: 'grid',
          gap: { xs: 1.5, md: 2 },
          alignItems: 'start',
        }}
      >
        {view === 'health' ? (
          <HealthView />
        ) : (
          <>
        {phase === 'error' && !hasSnapshot ? (
          <>
            <StateBanner
              notices={
                snapshot
                  ? snapshot.notices
                  : [
                      {
                        id: 'gateway',
                        severity: 'critical',
                        title: 'Snapshot unavailable',
                        message: 'The console could not reach the telemetry gateway. Filters and scope remain unchanged so a retry is cheap.',
                      },
                    ]
              }
            />
            <ErrorState message={error ?? 'Unknown telemetry failure'} onRetry={reload} />
          </>
        ) : null}

        {hasSnapshot && phase !== 'loading' ? (
          <>
            <StateBanner notices={snapshot!.notices} onReload={reload} />
            <SystemStatusStrip system={snapshot!.system} deepestQueue={deepestQueue} />
            <AttentionStrip
              items={snapshot!.attention}
              selectedKinds={selectedKinds}
              onToggleKind={toggleKind}
              onClear={() => setSelectedKinds([])}
              isEmpty={isEmptyScope}
            />
            <KpiRow kpis={snapshot!.kpis} />
          </>
        ) : null}

        {showSkeletons ? (
          <>
            <KpiSkeletonRow />
            <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 2.05fr) minmax(0, 1fr)' } }}>
              <SectionPanel kicker="Operational performance" title="Client call queues" flush busy enterDelayMs={60}>
                <SkeletonRows rows={7} columns={5} />
              </SectionPanel>
              <SectionPanel kicker="Workstation estate" title="Application logins" enterDelayMs={90}>
                <SkeletonRows rows={5} columns={2} />
              </SectionPanel>
            </Box>
            <SectionPanel kicker="Trend" title="Operational trend" enterDelayMs={120}>
              <ChartSkeleton />
            </SectionPanel>
          </>
        ) : null}

        {hasSnapshot && phase !== 'loading' ? (
          <>
            <Box
              sx={{
                display: 'grid',
                gap: { xs: 1.5, md: 2 },
                gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 2.05fr) minmax(0, 1fr)' },
              }}
            >
              <SectionPanel
                kicker="Operational performance"
                title={TABLE_TITLES[effectiveTab]}
                busy={phase === 'refreshing'}
                enterDelayMs={40}
                flush
                actions={
                  scope.tableTabs.length > 1 ? (
                    <Tabs
                      value={effectiveTab}
                      onChange={(_event, next: TableTabId) => setTableTab(next)}
                      aria-label="Operational performance view"
                    >
                      {scope.tableTabs.map((tab) => (
                        <Tab key={tab} value={tab} label={TABLE_TITLES[tab]} />
                      ))}
                    </Tabs>
                  ) : null
                }
                subtitle={
                  effectiveTab === 'clients'
                    ? 'Top client queues ordered by risk. In-queue and SLA columns carry the signal; sort any column to re-rank.'
                    : effectiveTab === 'services'
                      ? 'Middleware services with error count, throughput and error rate, as captured from the MW Services view.'
                      : effectiveTab === 'workforce'
                        ? 'Verint WFO teams ordered by risk. Adherence and occupancy carry the signal; sort any column to re-rank.'
                        : 'Concurrent Citrix sessions per cloud region. The charted region is marked in the table and stays in step with the filters.'
                }
              >
                {effectiveTab === 'clients' ? (
                  <OperationalTable
                    rows={snapshot!.clients}
                    selectedKinds={selectedKinds}
                    onClearKinds={() => setSelectedKinds([])}
                    visibleTotals={snapshot!.visibleTotals}
                    systemTotals={snapshot!.clientTotals}
                    emptyReason="No client queue rows were returned for this window. Widen the date range or check the feed registration."
                  />
                ) : null}
                {effectiveTab === 'services' ? (
                  <ServiceThroughputTable
                    rows={snapshot!.services}
                    capabilities={snapshot!.capabilities}
                    selectedCapabilityId={capabilityId}
                    onSelectCapability={setCapabilityId}
                  />
                ) : null}
                {effectiveTab === 'regions' ? (
                  <RegionSessionTable
                    rows={snapshot!.regions}
                    cloud={cloud}
                    regionId={regionId}
                    onSelectRegion={setRegionId}
                  />
                ) : null}
                {effectiveTab === 'workforce' ? (
                  <WorkforceTable
                    rows={snapshot!.workforce}
                    selectedKinds={selectedKinds}
                    onClearKinds={() => setSelectedKinds([])}
                  />
                ) : null}
              </SectionPanel>

              <SectionPanel
                kicker={scope.rightPanel === 'workforce' ? 'Verint WFO' : 'Workstation estate'}
                title={scope.rightPanel === 'workforce' ? 'Workforce roster' : 'Application logins'}
                busy={phase === 'refreshing'}
                enterDelayMs={80}
                subtitle={
                  scope.rightPanel === 'workforce'
                    ? 'Scheduled vs logged-in headcount, shrinkage, and the teams that need review.'
                    : 'Login totals per workstation application. Idle applications are called out rather than left as a bare zero.'
                }
                footer={
                  scope.rightPanel === 'workforce' ? (
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, flexWrap: 'wrap' }}>
                      <MicroLabel sx={{ color: tokens.text.faint }}>Source: Verint WFO</MicroLabel>
                      <MicroLabel sx={{ color: tokens.text.faint }}>{snapshot!.workforce.length} teams reporting</MicroLabel>
                    </Box>
                  ) : (
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, flexWrap: 'wrap' }}>
                      <MicroLabel sx={{ color: tokens.text.faint }}>Source: Workstation User Login</MicroLabel>
                      {snapshot!.system.activeUsers !== null ? (
                        <MicroLabel sx={{ color: tokens.text.faint }}>Active users {snapshot!.system.activeUsers}</MicroLabel>
                      ) : null}
                    </Box>
                  )
                }
              >
                {scope.rightPanel === 'workforce' ? (
                  <WorkforceRosterPanel summary={snapshot!.workforceSummary} rows={snapshot!.workforce} />
                ) : scope.showLogins ? (
                  <ApplicationLoginSummary rows={snapshot!.logins} />
                ) : (
                  <NotCollectedState message={scope.loginEmptyReason ?? 'This panel is not populated for the selected scope.'} />
                )}
              </SectionPanel>
            </Box>

            <SectionPanel
              kicker="Trend"
              title="Operational trend"
              busy={phase === 'refreshing'}
              enterDelayMs={120}
              subtitle={`${snapshot!.dataWindowLabel}. Bucket size follows the selected window; the target line is the agreed SLA floor.`}
              footer={
                <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1.5, flexWrap: 'wrap' }}>
                  <MicroLabel sx={{ color: tokens.text.faint }}>
                    Synthesis time {snapshot!.generatedAt.replace('T', ' ').slice(0, 16)}
                  </MicroLabel>
                  <MicroLabel sx={{ color: tokens.text.faint }}>
                    Series are deterministic mock telemetry - see README for provenance
                  </MicroLabel>
                </Box>
              }
            >
              {availableTrends.length > 0 ? (
                <TrendChart views={availableTrends} activeId={effectiveTrend} onMetricChange={setTrendId} busy={phase === 'refreshing'} />
              ) : (
                <ChartSkeleton />
              )}
            </SectionPanel>
          </>
        ) : null}
          </>
        )}

        <Box
          component="footer"
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: 1.5,
            flexWrap: 'wrap',
            paddingBlock: 1.5,
            borderTop: `1px solid ${tokens.ink.line}`,
            color: tokens.text.faint,
          }}
        >
          <MicroLabel sx={{ color: 'inherit' }}>
            SynTinel Operations Console · Synchrony · portfolio health + telemetry · mock data
          </MicroLabel>
          <MicroLabel sx={{ color: 'inherit' }}>
            Plug-and-play data sources · ServiceNow · New Relic · Splunk · PagerDuty · Avaya CMS · Verint · Tableau
          </MicroLabel>
        </Box>
      </Box>
    </>
  );
}
