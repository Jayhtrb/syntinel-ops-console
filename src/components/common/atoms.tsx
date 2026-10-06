import Box from '@mui/material/Box';
import type { ReactNode } from 'react';
import { tokens } from '../../theme/tokens';

/** Uppercase mono caption used for column and field labels. */
export function MicroLabel({ children, sx }: { children: ReactNode; sx?: object }): ReactNode {
  return (
    <Box component="span" className="micro" sx={sx}>
      {children}
    </Box>
  );
}

/** Tabular numeral with an optional unit suffix. */
export function MetricValue({
  value,
  unit,
  size = 'md',
  tone = 'default',
}: {
  value: string;
  unit?: string;
  size?: 'sm' | 'md' | 'lg';
  tone?: 'default' | 'nominal' | 'warning' | 'critical' | 'idle';
}): ReactNode {
  const fontSize = size === 'lg' ? '1.5rem' : size === 'sm' ? '0.875rem' : '1.125rem';
  const color =
    tone === 'default'
      ? tokens.text.hi
      : tone === 'nominal'
        ? tokens.status.nominal
        : tone === 'warning'
          ? tokens.status.warning
          : tone === 'critical'
            ? tokens.status.critical
            : tokens.status.idle;

  return (
    <Box component="span" className="mono" sx={{ fontSize, fontWeight: 500, color, letterSpacing: '-0.01em', lineHeight: 1.1 }}>
      {value}
      {unit ? (
        <Box component="span" sx={{ fontSize: `calc(${fontSize} * 0.55)`, color: tokens.text.low, ml: 0.25 }}>
          {unit}
        </Box>
      ) : null}
    </Box>
  );
}

/** Empty-data placeholder that reads as deliberate rather than broken. */
export function NoData({ label = 'No data', compact = false }: { label?: string; compact?: boolean }): ReactNode {
  return (
    <Box
      component="span"
      className="mono"
      sx={{ color: tokens.text.faint, fontSize: compact ? '0.75rem' : '0.8125rem', letterSpacing: '0.04em' }}
    >
      {label}
    </Box>
  );
}
