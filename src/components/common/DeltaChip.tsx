import Box from '@mui/material/Box';
import type { ReactNode } from 'react';
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import type { DeltaInfo } from '../../types/dashboard';
import { tokens } from '../../theme/tokens';

export interface DeltaChipProps {
  delta?: DeltaInfo;
  /** Hides the explanatory caption, keeping only the movement. */
  compact?: boolean;
}

/**
 * Movement against the previous comparable window.
 *
 * "Good" is metric-dependent (queue depth falling is good, calls active rising
 * is good), so the verdict comes from the data layer rather than the sign.
 */
export function DeltaChip({ delta, compact = true }: DeltaChipProps): ReactNode {
  if (!delta) return null;

  const Icon = delta.direction === 'up' ? ArrowUpRight : delta.direction === 'down' ? ArrowDownRight : Minus;
  const color =
    delta.neutral || delta.direction === 'flat'
      ? tokens.text.low
      : delta.good
        ? tokens.status.nominal
        : tokens.status.warning;
  const magnitude =
    delta.unit === 'count'
      ? `${delta.value > 0 ? '+' : delta.value < 0 ? '−' : '±'}${Math.abs(delta.value).toLocaleString('en-US', { maximumFractionDigits: 0 })}`
      : delta.unit === 'pp'
        ? `${delta.value > 0 ? '+' : delta.value < 0 ? '−' : '±'}${Math.abs(delta.value).toFixed(1)}pt`
        : `${delta.value > 0 ? '+' : delta.value < 0 ? '−' : '±'}${Math.abs(delta.value).toFixed(1)}%`;

  return (
    <Box
      component="span"
      sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.375, color, fontSize: '0.6875rem', whiteSpace: 'nowrap' }}
    >
      <Icon size={12} strokeWidth={2.4} aria-hidden={true} />
      <Box component="span" className="mono">
        {magnitude}
      </Box>
      {compact ? null : (
        <Box component="span" sx={{ color: tokens.text.low }}>
          {delta.caption}
        </Box>
      )}
      <Box component="span" className="sr-only">
        {delta.caption}
      </Box>
    </Box>
  );
}
