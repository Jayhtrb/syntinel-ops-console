import Box from '@mui/material/Box';
import type { ReactNode } from 'react';
import type { StatusLevel } from '../../types/dashboard';
import { tokens } from '../../theme/tokens';

export interface MeterBarProps {
  /** Current value. */
  value: number;
  max: number;
  tone: StatusLevel;
  /** Optional target marker drawn as a notch on the track. */
  target?: number;
  /** Explicit fill percentage, overriding `value / max`. */
  percent?: number;
  height?: number;
}

/**
 * Thin quantitative meter: track, fill and optional target notch.
 *
 * Always redundant with an adjacent numeral, so it is hidden from assistive
 * technology - colour is never the only carrier of meaning.
 */
export function MeterBar({ value, max, tone, target, percent, height = 5 }: MeterBarProps): ReactNode {
  const ratio = percent !== undefined ? percent : max > 0 ? (value / max) * 100 : 0;
  const clamped = Math.max(0, Math.min(100, ratio));
  const targetRatio = target !== undefined && max > 0 ? Math.max(0, Math.min(100, (target / max) * 100)) : null;
  const color = tone === 'unknown' ? tokens.status.unknown : tokens.status[tone];

  return (
    <Box
      aria-hidden="true"
      sx={{
        position: 'relative',
        height,
        width: '100%',
        borderRadius: height / 2,
        backgroundColor: 'rgba(140,175,210,0.13)',
        overflow: 'hidden',
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          width: `${clamped}%`,
          borderRadius: height / 2,
          backgroundColor: color,
          transition: 'width 420ms cubic-bezier(0.22, 0.8, 0.3, 1)',
        }}
      />
      {targetRatio !== null ? (
        <Box
          sx={{
            position: 'absolute',
            top: -1,
            bottom: -1,
            left: `${targetRatio}%`,
            width: '1px',
            backgroundColor: 'rgba(233,240,248,0.55)',
          }}
        />
      ) : null}
    </Box>
  );
}
