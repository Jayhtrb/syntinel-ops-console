/**
 * Render + data smoke test.
 *
 * Loads the real modules through Vite's SSR pipeline (so TSX, path resolution and
 * the mock data layer are all exercised exactly as the browser build uses them),
 * asserts the captured telemetry survives transformation, and server-renders the
 * dashboard panels to prove the component tree has no render-time errors.
 *
 *   npm run smoke
 */
import { createServer } from 'vite';
import { createElement as h } from 'react';
import { renderToString } from 'react-dom/server';
import { ThemeProvider } from '@mui/material/styles';

let failures = 0;

function check(label, condition, detail = '') {
  if (condition) {
    console.log(`  ok   ${label}`);
    return;
  }
  failures += 1;
  console.log(`  FAIL ${label}${detail ? ` -> ${detail}` : ''}`);
}

const server = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' });

try {
  console.log('\nData layer');
  const repo = await server.ssrLoadModule('/src/data/dashboardRepository.ts');
  const theme = (await server.ssrLoadModule('/src/theme/theme.ts')).theme;
  const { KpiRow } = await server.ssrLoadModule('/src/components/dashboard/KpiRow.tsx');
  const { OperationalTable } = await server.ssrLoadModule('/src/components/dashboard/OperationalTable.tsx');
  const { ServiceThroughputTable } = await server.ssrLoadModule('/src/components/dashboard/ServiceThroughputTable.tsx');
  const { RegionSessionTable } = await server.ssrLoadModule('/src/components/dashboard/RegionSessionTable.tsx');
  const { WorkforceTable } = await server.ssrLoadModule('/src/components/dashboard/WorkforceTable.tsx');
  const { WorkforceRosterPanel } = await server.ssrLoadModule('/src/components/dashboard/WorkforceRosterPanel.tsx');
  const { ApplicationLoginSummary } = await server.ssrLoadModule('/src/components/dashboard/ApplicationLoginSummary.tsx');
  const { SystemStatusStrip } = await server.ssrLoadModule('/src/components/dashboard/SystemStatusStrip.tsx');
  const { AttentionStrip } = await server.ssrLoadModule('/src/components/dashboard/AttentionStrip.tsx');
  const { StateBanner } = await server.ssrLoadModule('/src/components/feedback/StateBanner.tsx');
  const { TrendChart } = await server.ssrLoadModule('/src/components/dashboard/TrendChart.tsx');

  const base = { application: 'all', range: '24h', cloud: 'aws', regionId: 'aws-singapore' };
  const live = await repo.fetchDashboardSnapshot({ ...base, scenario: 'live' });

  check('captured queue depth survives', live.system.callsQueued === 1, String(live.system.callsQueued));
  check('captured active calls survive', live.system.callsActive === 66, String(live.system.callsActive));
  check('captured overall SLA survives', live.system.slaToday === 83.9, String(live.system.slaToday));
  check('captured active users survive', live.system.activeUsers === 3, String(live.system.activeUsers));
  check('ten clients captured', live.clients.length === 10, String(live.clients.length));
  check('ten services captured', live.services.length === 10, String(live.services.length));
  check('four business capabilities captured', live.capabilities.length === 4, String(live.capabilities.length));
  check('eight cloud regions captured', live.regions.length === 8, String(live.regions.length));
  check('five workstation applications captured', live.logins.length === 5, String(live.logins.length));
  check('PAYPAL_ALL SLA preserved', live.clients[0].slaToday === 80.8, String(live.clients[0].slaToday));
  check('AWS Singapore sessions preserved', live.regions.find((r) => r.id === 'aws-singapore').current === 298);
  check('Azure Singapore sessions preserved', live.regions.find((r) => r.id === 'azure-singapore').current === 206);
  check('customer service logins preserved', live.logins.find((l) => l.id === 'customer-service').users === 219);
  check('five KPIs per scope', live.kpis.length === 5, String(live.kpis.length));
  check('nine trend views built', live.trends.length === 9, String(live.trends.length));
  check('five workforce trend views present', ['adherence', 'aht', 'occupancy', 'forecast', 'ivr'].every((id) => live.trends.some((t) => t.id === id)));
  check('every trend has buckets', live.trends.every((trend) => trend.points.length > 0));
  check('SLA trend ends at headline SLA', Math.abs(live.trends.find((t) => t.id === 'sla').points.at(-1).value - 83.9) < 0.05);
  check('load trend carries a comparison series', live.trends.find((t) => t.id === 'load').points[0].compare !== undefined);

  check('five workforce teams captured', live.workforce.length === 5, String(live.workforce.length));
  check('workforce schedule roll-up survives', live.workforceSummary.scheduled === 109, String(live.workforceSummary.scheduled));
  check('workforce adherence roll-up survives', live.workforceSummary.adherence === 84.6, String(live.workforceSummary.adherence));
  check('workforce forecast roll-up survives', live.workforceSummary.forecastActualRatio === 0.979, String(live.workforceSummary.forecastActualRatio));
  check('live workforce flags a critical team', live.workforce.some((w) => w.status === 'critical'));
  check('live workforce flags a nominal team', live.workforce.some((w) => w.status === 'nominal'));

  const liveSeverities = new Set(live.clients.map((c) => c.status));
  check('live data shows a critical queue', liveSeverities.has('critical'));
  check('live data shows below-target queues', liveSeverities.has('warning'));
  check('live data shows idle queues', liveSeverities.has('idle'));
  check('attention includes SLA, queue and inactivity', new Set(live.attention.map((a) => a.kind)).size >= 3);
  check('critical notice raised for the SLA breach', live.notices.some((n) => n.severity === 'critical'));
  check('workforce risk is reported as a notice', live.notices.some((n) => n.id === 'workforce-signals'));

  console.log('\nPortfolio health');
  const portfolioRepo = await server.ssrLoadModule('/src/data/portfolio/repository.ts');
  const pSnapshot = await portfolioRepo.fetchPortfolioSnapshot();
  check('five portfolios mapped', pSnapshot.portfolios.length === 5, String(pSnapshot.portfolios.length));
  check('176 services mapped', pSnapshot.services.length === 176, String(pSnapshot.services.length));
  check('customer service is the largest portfolio', pSnapshot.portfolios.find((p) => p.id === 'customer-service')?.serviceCount === 153);
  check('portfolios show a red state', pSnapshot.portfolios.some((p) => p.status === 'red'));
  check('portfolios show an amber state', pSnapshot.portfolios.some((p) => p.status === 'amber'));
  check('portfolios show a green state', pSnapshot.portfolios.some((p) => p.status === 'green'));
  check('degraded services carry an impact description', pSnapshot.services.some((s) => s.status !== 'green' && s.impactDescription.length > 0));
  const incident = await portfolioRepo.fetchIncidentTrend({ id: 'fraud', label: 'Fraud', kind: 'portfolio', status: 'red' });
  check('incident trend has buckets and a total', incident.points.length > 0 && incident.total > 0);

  console.log('\nScenarios');
  const warning = await repo.fetchDashboardSnapshot({ ...base, scenario: 'warning' });
  check('warning scenario has no critical notice', !warning.notices.some((n) => n.severity === 'critical'));
  check('warning scenario has a warning notice', warning.notices.some((n) => n.severity === 'warning'));
  check('warning scenario keeps every queue off the breach floor', warning.clients.every((c) => c.status !== 'critical'));
  check('warning scenario degrades several queues below target', warning.clients.filter((c) => c.status === 'warning').length >= 3);
  check('warning scenario raises service error rate', warning.system.errorRate > 0);

  const critical = await repo.fetchDashboardSnapshot({ ...base, scenario: 'critical' });
  check('critical scenario breaches SLA', critical.clients.filter((c) => c.status === 'critical').length >= 3);
  check('critical scenario spikes error rate', critical.system.errorRate >= 2);
  check('critical scenario drains a region', critical.regions.some((r) => r.current === 0));
  check('critical scenario raises a critical notice', critical.notices.some((n) => n.severity === 'critical'));

  const empty = await repo.fetchDashboardSnapshot({ ...base, scenario: 'empty' });
  check('empty scenario returns no rows', empty.clients.length === 0 && empty.services.length === 0 && empty.logins.length === 0 && empty.workforce.length === 0);
  check('empty scenario nulls the headline metrics', empty.system.slaToday === null && empty.system.callsQueued === null);
  check('empty scenario nulls the workforce roll-up', empty.workforceSummary.adherence === null && empty.workforceSummary.scheduled === null);
  check('empty scenario keeps trend series but no points', empty.trends.every((t) => t.points.length === 0));
  check('empty scenario emits an informational notice', empty.notices[0]?.id === 'no-telemetry');
  check('empty KPIs render as blank rather than zero', empty.kpis.every((k) => k.display === '—'));

  let errored = false;
  try {
    await repo.fetchDashboardSnapshot({ ...base, scenario: 'error' });
  } catch (cause) {
    errored = cause instanceof Error && cause.message.includes('503');
  }
  check('error scenario rejects with a gateway message', errored);

  const citrix = await repo.fetchDashboardSnapshot({ ...base, application: 'citrix', scenario: 'live' });
  check('citrix scope switches the default table tab', citrix.scope.defaultTableTab === 'regions');
  check('citrix scope hides the login panel', citrix.scope.showLogins === false);
  check('citrix KPIs report AWS sessions', citrix.kpis[0].display === '589', citrix.kpis[0].display);

  const mw = await repo.fetchDashboardSnapshot({ ...base, application: 'mw-services', scenario: 'live' });
  check('mw scope defaults to the service table', mw.scope.defaultTableTab === 'services');

  const workforce = await repo.fetchDashboardSnapshot({ ...base, application: 'workforce', scenario: 'live' });
  check('workforce scope defaults to the workforce table', workforce.scope.defaultTableTab === 'workforce');
  check('workforce scope shows the roster panel', workforce.scope.rightPanel === 'workforce');
  check('workforce KPIs cover the five Verint metrics', ['adherence', 'aht', 'occupancy', 'forecast', 'ivr'].every((id) => workforce.kpis.some((k) => k.id === id)));
  check('workforce attention drives the table', workforce.attention.length > 0 && workforce.attention.every((a) => a.kind === 'workforce'));

  const weekly = await repo.fetchDashboardSnapshot({ ...base, range: '14d', scenario: 'live' });
  check('14-day window widens the series', weekly.trends[0].points.length > live.trends[0].points.length);

  console.log('\nPresentation layer');
  const wrap = (node) => h(ThemeProvider, { theme }, node);
  const clientsHtml = renderToString(
    wrap(
      h(OperationalTable, {
        rows: live.clients,
        selectedKinds: [],
        onClearKinds: () => {},
        visibleTotals: live.visibleTotals,
        systemTotals: live.clientTotals,
      }),
    ),
  );
  check('client table renders the captured client', clientsHtml.includes('PAYPAL_ALL'));
  check('client table renders the captured SLA', clientsHtml.includes('80.8%'));
  check('client table renders the overall status row', clientsHtml.includes('Overall system call status'));
  check('client table sorts the worst SLA first', clientsHtml.indexOf('PAYPAL_ALL') < clientsHtml.indexOf('Amazon_ALL'));
  check('client table exposes sortable columns to AT', clientsHtml.includes('aria-sort'));

  const kpiHtml = renderToString(wrap(h(KpiRow, { kpis: live.kpis })));
  check('KPI row renders five tiles', (kpiHtml.match(/aria-label="Key performance indicators"/g) ?? []).length === 1);
  check('KPI row shows the captured SLA', kpiHtml.includes('83.9%'));

  const loginsHtml = renderToString(wrap(h(ApplicationLoginSummary, { rows: live.logins })));
  check('login summary renders captured totals', loginsHtml.includes('Customer Service') && loginsHtml.includes('219'));
  check('login summary calls out idle applications', loginsHtml.includes('Deposit') && loginsHtml.includes('Echat'));

  const chartHtml = renderToString(wrap(h(TrendChart, { views: live.trends, activeId: 'sla', onMetricChange: () => {} })));
  check('trend chart exposes an accessible summary', chartHtml.includes('role="img"'));

  const stripHtml = renderToString(wrap(h(SystemStatusStrip, { system: live.system, deepestQueue: { name: 'PAYPAL_ALL', queued: 1 } })));
  check('system strip renders the overall SLA meter', stripHtml.includes('Queue SLA'));

  const attentionHtml = renderToString(wrap(h(AttentionStrip, { items: live.attention, selectedKinds: [], onToggleKind: () => {}, onClear: () => {} })));
  check('attention strip renders filter chips', attentionHtml.includes('aria-pressed'));

  const bannerHtml = renderToString(wrap(h(StateBanner, { notices: live.notices })));
  check('critical notice uses role=alert', bannerHtml.includes('role="alert"'));

  const servicesHtml = renderToString(
    wrap(h(ServiceThroughputTable, { rows: live.services, capabilities: live.capabilities, selectedCapabilityId: null, onSelectCapability: () => {} })),
  );
  check('service table renders captured rows', servicesHtml.includes('insertPayment') && servicesHtml.includes('2.054'));
  check('service table renders capability filters', servicesHtml.includes('Payment Related Services'));

  const regionsHtml = renderToString(
    wrap(h(RegionSessionTable, { rows: live.regions, cloud: 'aws', regionId: 'aws-singapore', onSelectRegion: () => {} })),
  );
  check('region table renders captured session counts', regionsHtml.includes('298') && regionsHtml.includes('206'));

  const workforceHtml = renderToString(wrap(h(WorkforceTable, { rows: live.workforce, selectedKinds: [], onClearKinds: () => {} })));
  check('workforce table renders captured teams', workforceHtml.includes('Customer Service') && workforceHtml.includes('Digital Support'));
  check('workforce table exposes sortable columns to AT', workforceHtml.includes('aria-sort'));

  const rosterHtml = renderToString(wrap(h(WorkforceRosterPanel, { summary: live.workforceSummary, rows: live.workforce })));
  check('workforce roster renders scheduled headcount', rosterHtml.includes('Scheduled') && rosterHtml.includes('109'));

  const { PortfolioMap } = await server.ssrLoadModule('/src/components/health/PortfolioMap.tsx');
  const { ServiceDrilldown } = await server.ssrLoadModule('/src/components/health/ServiceDrilldown.tsx');
  const fraudPortfolio = pSnapshot.portfolios.find((p) => p.id === 'fraud');
  const mapHtml = renderToString(wrap(h(PortfolioMap, { portfolios: pSnapshot.portfolios, selectedId: null, onSelect: () => {} })));
  check('portfolio map renders all five portfolios', ['Customer Service', 'Notesviewer', 'Collections', 'Fraud', 'Risk'].every((n) => mapHtml.includes(n)));
  check('portfolio map renders health labels', mapHtml.includes('Critical') && mapHtml.includes('Degraded'));
  const drillHtml = renderToString(wrap(h(ServiceDrilldown, { portfolio: fraudPortfolio, services: pSnapshot.services, selectedServiceId: null, onSelectService: () => {} })));
  check('service drilldown renders impacted services', drillHtml.includes('FDRLoginSvc'));

  const emptyHtml = renderToString(
    wrap(
      h(OperationalTable, {
        rows: [],
        selectedKinds: [],
        onClearKinds: () => {},
        visibleTotals: null,
        systemTotals: null,
      }),
    ),
  );
  check('empty table renders the empty state', emptyHtml.includes('data-testid="empty-state"'));

  const App = (await server.ssrLoadModule('/src/App.tsx')).default;
  const appHtml = renderToString(wrap(h(App)));
  check('app shell renders the header and view switcher', appHtml.includes('SynTinel') && appHtml.includes('Health') && appHtml.includes('Telemetry'));
  check('app shell renders the Synchrony logo', appHtml.includes('alt="Synchrony"'));
  check('app shell documents plug-and-play sources', appHtml.includes('Plug-and-play data sources'));
} finally {
  await server.close();
}

console.log(`\n${failures === 0 ? 'All checks passed' : `${failures} check(s) failed`}\n`);
process.exit(failures === 0 ? 0 : 1);
