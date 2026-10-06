import Box from '@mui/material/Box';
import { alpha } from '@mui/material/styles';
import type { ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';
import type { PortfolioHealth } from '../../types/portfolio';
import { tokens } from '../../theme/tokens';
import { MicroLabel } from '../common/atoms';
import { HEALTH_META } from './healthMeta';

export interface PortfolioMapProps {
  portfolios: PortfolioHealth[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

/**
 * The top of the health hierarchy: one card per portfolio/department, each with
 * a red/amber/green verdict. Red and amber cards invite a click to drill down.
 */
export function PortfolioMap({ portfolios, selectedId, onSelect }: PortfolioMapProps): ReactNode {
  return (
    <Box
      component="section"
      aria-label="Portfolio health"
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)', xl: 'repeat(5, 1fr)' },
        gap: 1.5,
      }}
    >
      {portfolios.map((portfolio, index) => {
        const meta = HEALTH_META[portfolio.status];
        const Icon = meta.icon;
        const selected = portfolio.id === selectedId;
        return (
          <Box
            component="button"
            type="button"
            key={portfolio.id}
            aria-pressed={selected}
            onClick={() => onSelect(portfolio.id)}
            className="chamfer rise-in"
            style={{ animationDelay: `${Math.min(index * 45, 200)}ms` }}
            sx={{
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              gap: 0.875,
              textAlign: 'left',
              padding: '14px 16px 12px',
              minHeight: 158,
              border: `1px solid ${selected ? alpha(meta.color, 0.65) : tokens.ink.line}`,
              backgroundColor: selected ? alpha(meta.color, 0.07) : tokens.ink.panel,
              backgroundImage: 'linear-gradient(180deg, rgba(233,240,248,0.022), transparent 46%)',
              color: 'inherit',
              cursor: 'pointer',
              font: 'inherit',
              transition: 'border-color 180ms ease, background-color 180ms ease',
              '&:hover': { borderColor: alpha(meta.color, 0.55) },
              '&::before': {
                content: '""',
                position: 'absolute',
                left: 0,
                top: 0,
                bottom: 0,
                width: 3,
                backgroundColor: meta.color,
              },
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
              <Box component="span" sx={{ fontSize: '0.9375rem', fontFamily: tokens.font.display, fontWeight: 600, color: tokens.text.hi, lineHeight: 1.2 }}>
                {portfolio.name}
              </Box>
              <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, color: meta.color, flexShrink: 0 }}>
                <Icon size={15} strokeWidth={2.4} aria-hidden={true} />
                <MicroLabel sx={{ color: 'inherit' }}>{meta.label}</MicroLabel>
              </Box>
            </Box>

            <Box component="span" sx={{ fontSize: '0.75rem', color: tokens.text.low, lineHeight: 1.5 }}>
              {portfolio.description}
            </Box>

            <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mt: 'auto' }}>
              <Box component="span" className="mono" sx={{ fontSize: '0.6875rem', color: tokens.text.mid }}>
                {portfolio.serviceCount} services
              </Box>
              {portfolio.critical > 0 ? (
                <Box component="span" className="mono" sx={{ fontSize: '0.6875rem', color: HEALTH_META.red.color }}>
                  {portfolio.critical} critical
                </Box>
              ) : null}
              {portfolio.warning > 0 ? (
                <Box component="span" className="mono" sx={{ fontSize: '0.6875rem', color: HEALTH_META.amber.color }}>
                  {portfolio.warning} degraded
                </Box>
              ) : null}
            </Box>

            {portfolio.status !== 'green' ? (
              <Box
                component="span"
                sx={{
                  fontSize: '0.6875rem',
                  color: tokens.text.low,
                  lineHeight: 1.5,
                  borderTop: `1px solid ${tokens.ink.line}`,
                  paddingTop: 0.75,
                  overflow: 'hidden',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                }}
              >
                {portfolio.impactSummary}
              </Box>
            ) : null}

            <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.25, color: portfolio.status === 'green' ? tokens.text.faint : meta.color, fontSize: '0.6875rem' }}>
              {portfolio.status === 'green' ? 'View services' : 'Drill down'}
              <ChevronRight size={12} strokeWidth={2.4} aria-hidden={true} />
            </Box>
          </Box>
        );
      })}
    </Box>
  );
}
