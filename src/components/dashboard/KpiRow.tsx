import Box from '@mui/material/Box';
import Tooltip from '@mui/material/Tooltip';
import { alpha } from '@mui/material/styles';
import type { ReactNode } from 'react';
import type { KpiCard as KpiCardModel } from '../../types/dashboard';
import { STATUS_META } from '../../lib/status';
import { tokens } from '../../theme/tokens';
import { MicroLabel } from '../common/atoms';
import { DeltaChip } from '../common/DeltaChip';
import { Sparkline } from '../common/Sparkline';
import { STATUS_ICON } from '../common/StatusPill';

export interface KpiCardProps {
  kpi: KpiCardModel;
  enterDelayMs?: number;
}

/**
 * One KPI tile: label, verdict, headline number, movement and a sparkline.
 *
 * The verdict is stated twice - a tinted rail plus an icon and written status -
 * so the tile still communicates in greyscale or to a colour-blind reader.
 */
export function KpiCard({ kpi, enterDelayMs = 0 }: KpiCardProps): ReactNode {
  const meta = STATUS_META[kpi.status];
  const Icon = STATUS_ICON[kpi.status];
  const tone = kpi.sparkTone ?? (kpi.status === 'critical' ? 'critical' : kpi.status === 'warning' ? 'warning' : kpi.status === 'idle' || kpi.status === 'unknown' ? 'idle' : 'nominal');

  return (
    <Box
      className="chamfer rise-in"
      style={{ animationDelay: `${enterDelayMs}ms` }}
      sx={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        gap: 0.75,
        minHeight: 118,
        padding: '11px 14px 8px 16px',
        border: `1px solid ${tokens.ink.line}`,
        backgroundColor: tokens.ink.panel,
        backgroundImage: 'linear-gradient(180deg, rgba(233,240,248,0.022), transparent 46%)',
        '&::before': {
          content: '""',
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: 3,
          backgroundColor: meta.color,
          opacity: kpi.status === 'nominal' ? 0.72 : 1,
        },
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
        <MicroLabel sx={{ color: tokens.text.low }}>{kpi.label}</MicroLabel>
        <Tooltip title={`Status: ${meta.label}`}>
          <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, color: meta.color }}>
            <Icon size={13} strokeWidth={2.4} aria-hidden={true} />
            <Box className="sr-only">{meta.label}</Box>
          </Box>
        </Tooltip>
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, flexWrap: 'wrap' }}>
        <Box
          className="mono"
          sx={{ fontSize: '1.625rem', fontWeight: 500, lineHeight: 1, color: tokens.text.hi, letterSpacing: '-0.02em' }}
        >
          {kpi.display}
        </Box>
        <DeltaChip delta={kpi.delta} />
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.75, flexWrap: 'wrap' }}>
        <Box sx={{ fontSize: '0.6875rem', color: tokens.text.low, lineHeight: 1.4 }}>{kpi.caption}</Box>
        {kpi.targetCaption ? (
          <Box className="mono" sx={{ fontSize: '0.625rem', color: alpha(meta.color, 0.95) }}>
            {kpi.targetCaption}
          </Box>
        ) : null}
      </Box>

      <Box sx={{ mt: 'auto', opacity: kpi.spark && kpi.spark.length > 1 && kpi.status !== 'unknown' ? 1 : 0 }}>
        <Sparkline values={kpi.spark ?? []} tone={tone} height={24} fluid />
      </Box>
    </Box>
  );
}

export function KpiRow({ kpis }: { kpis: KpiCardModel[] }): ReactNode {
  return (
    <Box
      component="section"
      aria-label="Key performance indicators"
      sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 1.25 }}
    >
      {kpis.map((kpi, index) => (
        <KpiCard key={kpi.id} kpi={kpi} enterDelayMs={Math.min(index * 45, 220)} />
      ))}
    </Box>
  );
}
