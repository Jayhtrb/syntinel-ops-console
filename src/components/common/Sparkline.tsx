import Box from '@mui/material/Box';
import type { ReactNode } from 'react';
import { tokens } from '../../theme/tokens';

export interface SparklineProps {
  values: number[];
  tone?: 'nominal' | 'watch' | 'warning' | 'critical' | 'idle';
  width?: number;
  height?: number;
  /** Stretch to the container width instead of using an intrinsic size. */
  fluid?: boolean;
}

const TONE_COLOR: Record<NonNullable<SparklineProps['tone']>, string> = {
  nominal: tokens.status.nominal,
  watch: tokens.status.watch,
  warning: tokens.status.warning,
  critical: tokens.status.critical,
  idle: tokens.status.idle,
};

/**
 * Decorative micro-chart for KPI cards.
 *
 * Rendered as a plain inline SVG rather than a chart library: it is tiny, has no
 * axes and no tooltip, and the number next to it carries the accessible meaning.
 */
export function Sparkline({ values, tone = 'nominal', width = 96, height = 26, fluid = false }: SparklineProps): ReactNode {
  if (values.length < 2) {
    return <Box sx={{ width: fluid ? '100%' : width, height }} aria-hidden="true" />;
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min === 0 ? 1 : max - min;
  const stepX = width / (values.length - 1);
  const color = TONE_COLOR[tone];
  const gradientId = `spark-${tone}-${values.length}-${Math.round(min)}-${Math.round(max)}`;

  const points = values.map((value, index) => {
    const x = index * stepX;
    const y = height - 2 - ((value - min) / span) * (height - 6);
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  });

  const line = `M ${points.join(' L ')}`;
  const area = `${line} L ${width},${height} L 0,${height} Z`;

  return (
    <Box
      component="svg"
      width={fluid ? '100%' : width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio={fluid ? 'none' : 'xMidYMid meet'}
      aria-hidden="true"
      focusable="false"
      sx={{ display: 'block' }}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.32" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gradientId})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </Box>
  );
}
