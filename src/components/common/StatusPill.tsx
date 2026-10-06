import Box from '@mui/material/Box';
import { alpha } from '@mui/material/styles';
import type { ReactNode } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  CircleDashed,
  Minus,
  Pause,
  ShieldAlert,
  type LucideIcon,
} from 'lucide-react';
import type { StatusLevel } from '../../types/dashboard';
import { STATUS_META } from '../../lib/status';
import { tokens } from '../../theme/tokens';

/** Icon per status - every indicator carries an icon, a label and a colour. */
export const STATUS_ICON: Record<StatusLevel, LucideIcon> = {
  nominal: CheckCircle2,
  watch: CircleDashed,
  warning: AlertTriangle,
  critical: ShieldAlert,
  idle: Pause,
  unknown: Minus,
};

export interface StatusPillProps {
  status: StatusLevel;
  /** Overrides the default status label. */
  label?: string;
  size?: 'sm' | 'md';
  /** `outline` for headers, `ghost` for dense table rows. */
  variant?: 'outline' | 'ghost';
  /** Hides the text, leaving only the icon (the label is still exposed). */
  iconOnly?: boolean;
}

/**
 * Status indicator: icon + text + tinted chip.
 *
 * Never colour-only, and the accessible name always contains the written
 * status, so it survives greyscale and screen readers alike.
 */
export function StatusPill({ status, label, size = 'md', variant = 'outline', iconOnly = false }: StatusPillProps): ReactNode {
  const meta = STATUS_META[status];
  const Icon = STATUS_ICON[status];
  const text = label ?? meta.label;
  const color = meta.color;

  return (
    <Box
      component="span"
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.5,
        px: size === 'sm' ? 0.75 : 1,
        py: size === 'sm' ? 0.125 : 0.25,
        borderRadius: tokens.radius.sm,
        border: `1px solid ${variant === 'outline' ? alpha(color, 0.42) : 'transparent'}`,
        backgroundColor: variant === 'outline' ? alpha(color, 0.12) : 'transparent',
        color,
        fontFamily: tokens.font.mono,
        fontSize: size === 'sm' ? '0.625rem' : '0.6875rem',
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        lineHeight: 1.7,
        whiteSpace: 'nowrap',
      }}
    >
      <Icon size={size === 'sm' ? 11 : 13} strokeWidth={2.4} aria-hidden={true} />
      {iconOnly ? null : text}
    </Box>
  );
}
