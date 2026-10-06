import Box from '@mui/material/Box';
import { alpha } from '@mui/material/styles';
import type { ReactNode } from 'react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { IncidentTrend } from '../../types/portfolio';
import { formatInteger } from '../../lib/format';
import { tokens } from '../../theme/tokens';
import { MicroLabel } from '../common/atoms';

interface TooltipProps {
  active?: boolean;
  label?: string | number;
  payload?: Array<{ value?: number | string }>;
}

function ChartTooltip({ active, label, payload }: TooltipProps): ReactNode {
  if (!active || !payload || payload.length === 0) return null;
  const value = typeof payload[0].value === 'number' ? payload[0].value : 0;
  return (
    <Box
      sx={{
        padding: '8px 11px',
        border: `1px solid ${tokens.ink.lineStrong}`,
        borderRadius: tokens.radius.sm,
        backgroundColor: alpha(tokens.ink.raised, 0.97),
        boxShadow: '0 14px 34px rgba(0,0,0,0.6)',
      }}
    >
      <MicroLabel sx={{ color: tokens.text.low }}>{String(label)}</MicroLabel>
      <Box className="mono" sx={{ fontSize: '0.8125rem', color: tokens.text.hi, mt: 0.25 }}>
        {formatInteger(value)} incident{value === 1 ? '' : 's'}
      </Box>
    </Box>
  );
}

export interface IncidentTrendPanelProps {
  trend: IncidentTrend | null;
  loading: boolean;
  error: string | null;
  accent: string;
}

/**
 * Level 3 of the hierarchy: incident volume over the last 14 days for the
 * selected portfolio or service, so an affected scope can be read as a trend
 * rather than a single count.
 */
export function IncidentTrendPanel({ trend, loading, error, accent }: IncidentTrendPanelProps): ReactNode {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
      {error ? (
        <Box sx={{ padding: 3, textAlign: 'center', color: tokens.status.critical, fontSize: '0.8125rem' }}>{error}</Box>
      ) : !trend ? (
        <Box sx={{ padding: 3, textAlign: 'center', color: tokens.text.low, fontSize: '0.8125rem' }}>
          {loading ? 'Loading incident trend…' : 'Select a portfolio or service to view its incident trend.'}
        </Box>
      ) : (
        <>
          <Box
            role="img"
            aria-label={`Incident trend for ${trend.scopeLabel}: ${trend.total} incidents over the window, peaking at ${trend.peak}.`}
            sx={{ width: '100%', height: 240 }}
          >
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trend.points} margin={{ top: 6, right: 12, bottom: 4, left: 0 }}>
                <defs>
                  <linearGradient id={`incident-grad-${trend.scopeId}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={accent} stopOpacity={0.4} />
                    <stop offset="100%" stopColor={accent} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={tokens.chart.grid} vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fill: tokens.chart.axis, fontSize: 10.5, fontFamily: tokens.font.mono }}
                  tickLine={false}
                  axisLine={{ stroke: tokens.ink.line }}
                  minTickGap={64}
                  tickMargin={8}
                  interval="preserveStartEnd"
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fill: tokens.chart.axis, fontSize: 10.5, fontFamily: tokens.font.mono }}
                  tickLine={false}
                  axisLine={false}
                  width={34}
                />
                <Tooltip content={<ChartTooltip />} cursor={{ stroke: alpha(accent, 0.35), strokeDasharray: '3 3' }} />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke={accent}
                  strokeWidth={2}
                  fill={`url(#incident-grad-${trend.scopeId})`}
                  dot={false}
                  activeDot={{ r: 3, strokeWidth: 0 }}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, flexWrap: 'wrap', paddingTop: 1, borderTop: `1px solid ${tokens.ink.line}` }}>
            <Box>
              <Box className="mono" sx={{ fontSize: '1rem', color: tokens.text.hi }}>{formatInteger(trend.total)}</Box>
              <MicroLabel sx={{ color: tokens.text.faint }}>Incidents · 14d</MicroLabel>
            </Box>
            <Box>
              <Box className="mono" sx={{ fontSize: '1rem', color: tokens.text.hi }}>{formatInteger(trend.peak)}</Box>
              <MicroLabel sx={{ color: tokens.text.faint }}>Peak in window</MicroLabel>
            </Box>
            <Box>
              <Box className="mono" sx={{ fontSize: '1rem', color: accent }}>{formatInteger(trend.current)}</Box>
              <MicroLabel sx={{ color: tokens.text.faint }}>Now</MicroLabel>
            </Box>
            <Box sx={{ flex: 1, minWidth: 120 }}>
              <MicroLabel sx={{ color: tokens.text.faint }}>Source</MicroLabel>
              <Box sx={{ fontSize: '0.6875rem', color: tokens.text.low }}>{trend.source}</Box>
            </Box>
          </Box>
        </>
      )}
    </Box>
  );
}
