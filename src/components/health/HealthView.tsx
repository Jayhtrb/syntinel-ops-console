import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Skeleton from '@mui/material/Skeleton';
import { alpha } from '@mui/material/styles';
import { useEffect, useState, type ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';
import type { IncidentTrend, PortfolioHealth, ServiceHealth } from '../../types/portfolio';
import { fetchIncidentTrend, fetchPortfolioSnapshot, type PortfolioSnapshot } from '../../data/portfolio/repository';
import { tokens } from '../../theme/tokens';
import { SectionPanel } from '../common/SectionPanel';
import { MicroLabel } from '../common/atoms';
import { PortfolioMap } from './PortfolioMap';
import { ServiceDrilldown } from './ServiceDrilldown';
import { IncidentTrendPanel } from './IncidentTrendPanel';
import { HEALTH_META } from './healthMeta';

function MapSkeleton(): ReactNode {
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)', xl: 'repeat(5, 1fr)' }, gap: 1.5 }}>
      {Array.from({ length: 5 }).map((_, index) => (
        <Box key={index} className="chamfer" sx={{ padding: '14px 16px', minHeight: 158, border: `1px solid ${tokens.ink.line}`, backgroundColor: tokens.ink.panel }}>
          <Skeleton variant="text" width="62%" height={18} />
          <Skeleton variant="text" width="88%" height={12} sx={{ mt: 1.5 }} />
          <Skeleton variant="text" width="88%" height={12} />
          <Skeleton variant="text" width="40%" height={12} sx={{ mt: 'auto' }} />
        </Box>
      ))}
    </Box>
  );
}

/**
 * The portfolio health hierarchy: RAG portfolio map → service drill-down →
 * incident trend. A single scroll column, with the drill-down revealed in place
 * beneath the map rather than routed to a new page.
 */
export function HealthView(): ReactNode {
  const [snapshot, setSnapshot] = useState<PortfolioSnapshot | null>(null);
  const [phase, setPhase] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [portfolioId, setPortfolioId] = useState<string | null>(null);
  const [serviceId, setServiceId] = useState<string | null>(null);
  const [trend, setTrend] = useState<IncidentTrend | null>(null);
  const [trendLoading, setTrendLoading] = useState(false);
  const [trendError, setTrendError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setPhase('loading');
    fetchPortfolioSnapshot()
      .then((next) => {
        if (!active) return;
        setSnapshot(next);
        setPhase('ready');
      })
      .catch((cause: unknown) => {
        if (!active) return;
        setError(cause instanceof Error ? cause.message : 'Failed to load portfolio health');
        setPhase('error');
      });
    return () => {
      active = false;
    };
  }, []);

  const portfolios = snapshot?.portfolios ?? [];
  const services = snapshot?.services ?? [];

  const selectedPortfolio: PortfolioHealth | null = portfolios.find((p) => p.id === portfolioId) ?? null;
  const selectedService: ServiceHealth | null = services.find((s) => s.id === serviceId) ?? null;

  useEffect(() => {
    if (!snapshot) return;
    if (!selectedPortfolio) {
      setTrend(null);
      setTrendError(null);
      return;
    }
    let active = true;
    setTrendLoading(true);
    setTrendError(null);
    const scope = selectedService
      ? { id: selectedService.id, label: selectedService.name, kind: 'service' as const, status: selectedService.status }
      : { id: selectedPortfolio.id, label: selectedPortfolio.name, kind: 'portfolio' as const, status: selectedPortfolio.status };
    fetchIncidentTrend(scope)
      .then((next) => {
        if (active) setTrend(next);
      })
      .catch((cause: unknown) => {
        if (active) setTrendError(cause instanceof Error ? cause.message : 'Failed to load incident trend');
      })
      .finally(() => {
        if (active) setTrendLoading(false);
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [portfolioId, serviceId, snapshot]);

  if (phase === 'loading') {
    return (
      <Box sx={{ display: 'grid', gap: 2 }}>
        <Skeleton variant="text" width="40%" height={24} />
        <MapSkeleton />
      </Box>
    );
  }

  if (phase === 'error' || !snapshot) {
    return (
      <Box
        sx={{
          padding: '34px 20px',
          textAlign: 'center',
          border: `1px dashed ${alpha(tokens.status.critical, 0.34)}`,
          backgroundColor: alpha(tokens.status.critical, 0.05),
        }}
      >
        <Box sx={{ fontSize: '0.9375rem', fontFamily: tokens.font.display, color: tokens.text.hi }}>Health data unavailable</Box>
        <Box sx={{ color: tokens.text.mid, fontSize: '0.8125rem', mt: 1, lineHeight: 1.6 }}>{error}</Box>
      </Box>
    );
  }

  const trendStatus = selectedService ? selectedService.status : selectedPortfolio ? selectedPortfolio.status : 'green';
  const trendAccent = HEALTH_META[trendStatus].color;

  const selectPortfolio = (id: string) => {
    setPortfolioId(id);
    setServiceId(null);
  };

  const clearDrilldown = () => {
    setPortfolioId(null);
    setServiceId(null);
  };

  return (
    <Box sx={{ display: 'grid', gap: 2, alignItems: 'start' }}>
      <Box sx={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
        <Box>
          <MicroLabel sx={{ color: tokens.text.low }}>Executive overview</MicroLabel>
          <Box component="h2" sx={{ m: 0, fontFamily: tokens.font.display, fontSize: '1.25rem', fontWeight: 600, color: tokens.text.hi }}>
            Portfolio health
          </Box>
        </Box>
        <MicroLabel sx={{ color: tokens.text.faint }}>
          Health · {snapshot.sourceLabels.health} · Incidents · {snapshot.sourceLabels.incidents}
        </MicroLabel>
      </Box>

      <PortfolioMap portfolios={portfolios} selectedId={portfolioId} onSelect={selectPortfolio} />

      {selectedPortfolio ? (
        <Box sx={{ display: 'grid', gap: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            <Button
              size="small"
              onClick={clearDrilldown}
              startIcon={<ArrowLeft size={14} strokeWidth={2.4} aria-hidden={true} />}
              sx={{ color: tokens.text.low, '&:hover': { color: tokens.text.hi } }}
            >
              All portfolios
            </Button>
            <MicroLabel sx={{ color: tokens.text.faint }}>Portfolios</MicroLabel>
            <Box component="span" className="mono" sx={{ color: tokens.text.hi, fontSize: '0.75rem' }}>
              / {selectedPortfolio.name}
            </Box>
            {selectedService ? (
              <>
                <Box component="span" className="mono" sx={{ color: tokens.text.faint, fontSize: '0.75rem' }}>
                  / {selectedService.name}
                </Box>
              </>
            ) : null}
          </Box>

          <Box sx={{ display: 'grid', gap: { xs: 1.5, md: 2 }, gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 1.45fr) minmax(0, 1fr)' }, alignItems: 'start' }}>
            <SectionPanel
              kicker={selectedPortfolio.status === 'green' ? 'Portfolio' : 'Impacted services'}
              title={selectedPortfolio.name}
              subtitle={selectedPortfolio.impactSummary}
              flush
              enterDelayMs={0}
            >
              <Box sx={{ maxHeight: 560, overflowY: 'auto', padding: '12px 14px' }}>
                <ServiceDrilldown
                  portfolio={selectedPortfolio}
                  services={services}
                  selectedServiceId={serviceId}
                  onSelectService={setServiceId}
                />
              </Box>
            </SectionPanel>

            <SectionPanel
              kicker="Incident trend"
              title={selectedService ? selectedService.name : `${selectedPortfolio.name} · incidents`}
              subtitle={
                selectedService
                  ? selectedService.impactDescription
                  : 'Incident volume across all services in this portfolio over the last 14 days.'
              }
              enterDelayMs={40}
            >
              <IncidentTrendPanel trend={trend} loading={trendLoading} error={trendError} accent={trendAccent} />
            </SectionPanel>
          </Box>
        </Box>
      ) : (
        <MicroLabel sx={{ color: tokens.text.faint }}>
          Select a red or amber portfolio to drill into the impacted services and their incident trend.
        </MicroLabel>
      )}
    </Box>
  );
}
