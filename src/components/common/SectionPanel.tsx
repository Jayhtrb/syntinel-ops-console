import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import type { ReactNode } from 'react';
import { tokens } from '../../theme/tokens';

export interface SectionPanelProps {
  /** Uppercase mono kicker above the title. */
  kicker?: string;
  title: string;
  /** Right side of the header - filters, tabs, actions. */
  actions?: ReactNode;
  /** Small descriptive line under the title. */
  subtitle?: ReactNode;
  /** Footer content, e.g. totals or provenance notes. */
  footer?: ReactNode;
  children: ReactNode;
  /** Removes the body padding for edge-to-edge tables. */
  flush?: boolean;
  /** Adds a top scan line while a refresh is in flight. */
  busy?: boolean;
  /** Delay for the staggered entry animation, in ms. */
  enterDelayMs?: number;
}

/**
 * The one panel primitive.
 *
 * Chamfered top-right corner, hairline border and a top highlight replace the
 * rounded-card default so panels read as instruments rather than containers.
 */
export function SectionPanel({
  kicker,
  title,
  actions,
  subtitle,
  footer,
  children,
  flush = false,
  busy = false,
  enterDelayMs = 0,
}: SectionPanelProps): ReactNode {
  return (
    <Box
      component="section"
      className="rise-in chamfer"
      style={{ animationDelay: `${enterDelayMs}ms` }}
      sx={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        minWidth: 0,
        backgroundColor: tokens.ink.panel,
        border: `1px solid ${tokens.ink.line}`,
        backgroundImage: `linear-gradient(180deg, rgba(233,240,248,0.022), transparent 42%)`,
        boxShadow: '0 1px 0 rgba(233,240,248,0.03) inset, 0 14px 34px -22px rgba(0,0,0,0.9)',
      }}
    >
      {busy ? (
        <Box
          className="sweep-line"
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '2px',
            overflow: 'hidden',
            backgroundColor: alpha(tokens.brand.ice, 0.16),
          }}
        />
      ) : null}

      <Box
        sx={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 2,
          flexWrap: 'wrap',
          padding: '12px 16px 10px',
          borderBottom: `1px solid ${tokens.ink.line}`,
        }}
      >
        <Box sx={{ minWidth: 0 }}>
          {kicker ? (
            <Typography component="p" className="micro" sx={{ mb: 0.25 }}>
              {kicker}
            </Typography>
          ) : null}
          <Typography variant="h3" component="h2" sx={{ color: tokens.text.hi, lineHeight: 1.25 }}>
            {title}
          </Typography>
          {subtitle ? (
            <Box sx={{ mt: 0.5, color: tokens.text.low, fontSize: '0.75rem', maxWidth: '72ch' }}>{subtitle}</Box>
          ) : null}
        </Box>
        {actions ? <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>{actions}</Box> : null}
      </Box>

      <Box sx={{ flex: 1, minWidth: 0, padding: flush ? 0 : '12px 16px 16px' }}>{children}</Box>

      {footer ? (
        <Box
          sx={{
            padding: '10px 16px',
            borderTop: `1px solid ${tokens.ink.line}`,
            backgroundColor: 'rgba(8,11,17,0.5)',
            color: tokens.text.low,
            fontSize: '0.75rem',
          }}
        >
          {footer}
        </Box>
      ) : null}
    </Box>
  );
}
