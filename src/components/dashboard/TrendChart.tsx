import Box from '@mui/material/Box';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import { alpha } from '@mui/material/styles';
import type { ReactNode } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { TrendMetricId, TrendView } from '../../types/dashboard';
import { formatAht, formatStamp } from '../../lib/format';
import { tokens } from '../../theme/tokens';
import { MicroLabel } from '../common/atoms';
import { EmptyState } from '../feedback/StateSurfaces';

interface ChartTooltipProps {
  active?: boolean;
  label?: string | number;
  payload?: Array<{ dataKey?: string | number; value?: number | string }>;
  view: TrendView;
}

function formatValue(value: number | string | undefined, unit: string): string {
  if (value === undefined || value === null) return '—';
  const numeric = typeof value === 'number' ? value : Number(value);
  if (Number.isNaN(numeric)) return String(value);
  if (unit === '%') return `${numeric.toFixed(2)}%`;
  if (unit === 's') return formatAht(numeric);
  return numeric.toLocaleString('en-US', { maximumFractionDigits: unit === 'sessions' ? 0 : 2 });
}

/** Custom tooltip: timestamp header, one row per series, delta to target. */
function ChartTooltip({ active, label, payload, view }: ChartTooltipProps): ReactNode {
  if (!active || !payload || payload.length === 0) return null;
  const point = view.points.find((candidate) => candidate.label === label);

  return (
    <Box
      sx={{
        minWidth: 196,
        padding: '9px 11px',
        border: `1px solid ${tokens.ink.lineStrong}`,
        borderRadius: tokens.radius.sm,
        backgroundColor: alpha(tokens.ink.raised, 0.97),
        boxShadow: '0 14px 34px rgba(0,0,0,0.6)',
      }}
    >
      <MicroLabel sx={{ color: tokens.text.low }}>{point ? formatStamp(point.t) : String(label)}</MicroLabel>
      <Box sx={{ display: 'grid', gap: 0.375, mt: 0.5 }}>
        {view.series.map((series) => {
          const entry = payload.find((candidate) => candidate.dataKey === series.key);
          if (!entry) return null;
          return (
            <Box key={series.key} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1.5 }}>
              <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75, color: tokens.text.mid, fontSize: '0.75rem' }}>
                <Box sx={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: series.color }} />
                {series.label}
              </Box>
              <Box className="mono" sx={{ color: tokens.text.hi, fontSize: '0.8125rem' }}>
                {formatValue(entry.value, series.unit)}
              </Box>
            </Box>
          );
        })}
      </Box>
      {view.target && typeof payload[0]?.value === 'number' ? (
        <Box
          sx={{
            mt: 0.75,
            pt: 0.5,
            borderTop: `1px solid ${tokens.ink.line}`,
            fontSize: '0.6875rem',
            color: (payload[0].value as number) >= view.target.value ? tokens.status.nominal : tokens.status.warning,
          }}
        >
          {(payload[0].value as number) >= view.target.value ? 'Above' : 'Below'} target by{' '}
          {Math.abs((payload[0].value as number) - view.target.value).toFixed(2)}pt
        </Box>
      ) : null}
    </Box>
  );
}

export interface TrendChartProps {
  views: TrendView[];
  activeId: TrendMetricId;
  onMetricChange: (id: TrendMetricId) => void;
  busy?: boolean;
}

/**
 * The single trend chart.
 *
 * One chart, four views. Metric switches are local to this panel instead of
 * spawning a grid of small multiples, which keeps the page to a single scroll
 * column and one visual focus at a time.
 */
export function TrendChart({ views, activeId, onMetricChange, busy = false }: TrendChartProps): ReactNode {
  const view = views.find((candidate) => candidate.id === activeId) ?? views[0];

  if (!view) {
    return <EmptyState title="No trend available" message="This scope exposes no time-series metrics in the selected window." />;
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1.5, flexWrap: 'wrap' }}>
        <ToggleButtonGroup
          exclusive
          size="small"
          value={view.id}
          onChange={(_event, next: TrendMetricId | null) => next && onMetricChange(next)}
          aria-label="Trend metric"
        >
          {views.map((option) => (
            <ToggleButton key={option.id} value={option.id} title={option.description}>
              {option.label}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
        <MicroLabel sx={{ color: busy ? tokens.brand.ice : tokens.text.faint, display: { xs: 'none', lg: 'block' } }}>
          {view.description}
        </MicroLabel>
      </Box>

      {view.points.length === 0 ? (
        <EmptyState title="No series in this window" message="The collector returned buckets but no values for this metric." />
      ) : (
        <>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
            {view.series.map((series) => (
              <Box key={series.key} sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75 }}>
                <Box
                  sx={{
                    width: 14,
                    height: 3,
                    borderRadius: 2,
                    backgroundColor: series.color,
                    opacity: series.kind === 'line' ? 0.9 : 1,
                  }}
                />
                <MicroLabel sx={{ color: tokens.text.low }}>{series.label}</MicroLabel>
              </Box>
            ))}
            {view.rightAxisLabel ? (
              <MicroLabel sx={{ color: tokens.text.faint }}>right axis: {view.rightAxisLabel}</MicroLabel>
            ) : null}
          </Box>

          <Box
            role="img"
            aria-label={view.ariaSummary}
            sx={{ width: '100%', height: { xs: 236, lg: 268 }, mt: 0.5 }}
          >
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={view.points} margin={{ top: 6, right: view.rightAxisLabel ? 4 : 12, bottom: 4, left: 4 }}>
                <defs>
                  {view.series.map((series) => (
                    <linearGradient key={series.key} id={`grad-${view.id}-${series.key}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={series.color} stopOpacity={0.34} />
                      <stop offset="100%" stopColor={series.color} stopOpacity={0.02} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid stroke={tokens.chart.grid} vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fill: tokens.chart.axis, fontSize: 10.5, fontFamily: tokens.font.mono }}
                  tickLine={false}
                  axisLine={{ stroke: tokens.ink.line }}
                  minTickGap={56}
                  tickMargin={8}
                  interval="preserveStartEnd"
                />
                <YAxis
                  yAxisId="left"
                  tick={{ fill: tokens.chart.axis, fontSize: 10.5, fontFamily: tokens.font.mono }}
                  tickLine={false}
                  axisLine={false}
                  width={46}
                  domain={[view.leftAxisMin ?? 'auto', view.leftAxisMax ?? 'auto']}
                  allowDecimals={false}
                />
                {view.rightAxisLabel ? (
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    tick={{ fill: tokens.chart.axis, fontSize: 10.5, fontFamily: tokens.font.mono }}
                    tickLine={false}
                    axisLine={false}
                    width={38}
                    domain={[0, view.rightAxisMax ?? 'auto']}
                    allowDecimals={false}
                  />
                ) : null}
                <Tooltip content={<ChartTooltip view={view} />} cursor={{ stroke: alpha(tokens.brand.ice, 0.35), strokeDasharray: '3 3' }} />
                {view.target ? (
                  <ReferenceLine
                    yAxisId="left"
                    y={view.target.value}
                    stroke={tokens.status.warning}
                    strokeDasharray="4 4"
                    strokeOpacity={0.8}
                    label={{
                      value: view.target.label,
                      position: 'insideTopRight',
                      fill: tokens.status.warning,
                      fontSize: 10,
                      fontFamily: tokens.font.mono,
                    }}
                  />
                ) : null}
                {view.series.map((series) =>
                  series.kind === 'area' ? (
                    <Area
                      key={series.key}
                      yAxisId={series.axis}
                      type="monotone"
                      dataKey={series.key}
                      name={series.label}
                      stroke={series.color}
                      strokeWidth={2}
                      fill={`url(#grad-${view.id}-${series.key})`}
                      dot={false}
                      activeDot={{ r: 3, strokeWidth: 0 }}
                      isAnimationActive={false}
                    />
                  ) : (
                    <Line
                      key={series.key}
                      yAxisId={series.axis}
                      type="monotone"
                      dataKey={series.key}
                      name={series.label}
                      stroke={series.color}
                      strokeWidth={1.75}
                      strokeDasharray={series.axis === 'right' ? '4 2' : undefined}
                      dot={false}
                      activeDot={{ r: 3, strokeWidth: 0 }}
                      isAnimationActive={false}
                    />
                  ),
                )}
              </AreaChart>
            </ResponsiveContainer>
          </Box>

          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 3,
              flexWrap: 'wrap',
              paddingTop: 1,
              borderTop: `1px solid ${tokens.ink.line}`,
            }}
          >
            <Box>
              <Box className="mono" sx={{ fontSize: '1rem', color: tokens.text.hi }}>
                {view.summary.primary}
              </Box>
              <MicroLabel sx={{ color: tokens.text.faint }}>{view.summary.primaryCaption}</MicroLabel>
            </Box>
            <Box>
              <Box className="mono" sx={{ fontSize: '1rem', color: tokens.text.hi }}>
                {view.summary.secondary}
              </Box>
              <MicroLabel sx={{ color: tokens.text.faint }}>{view.summary.secondaryCaption}</MicroLabel>
            </Box>
            <Box sx={{ flex: 1, minWidth: 160 }}>
              <MicroLabel sx={{ color: tokens.text.faint }}>Read aloud summary</MicroLabel>
              <Box sx={{ fontSize: '0.6875rem', color: tokens.text.low, lineHeight: 1.5 }}>{view.ariaSummary}</Box>
            </Box>
          </Box>
        </>
      )}
    </Box>
  );
}
