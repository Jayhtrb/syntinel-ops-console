import Box from '@mui/material/Box';
import Tooltip from '@mui/material/Tooltip';
import { alpha } from '@mui/material/styles';
import type { ReactNode } from 'react';
import { CheckCircle2, CircleSlash, ShieldAlert } from 'lucide-react';
import type { AttentionItem, AttentionKind } from '../../types/dashboard';
import { ATTENTION_META, STATUS_META, worstStatus } from '../../lib/status';
import { tokens } from '../../theme/tokens';
import { MicroLabel } from '../common/atoms';

const KIND_ORDER: AttentionKind[] = ['sla', 'queue', 'service', 'session', 'workforce', 'inactive'];

export interface AttentionStripProps {
  items: AttentionItem[];
  selectedKinds: AttentionKind[];
  onToggleKind: (kind: AttentionKind) => void;
  onClear: () => void;
  /** True when the collector returned nothing, so there is nothing to evaluate. */
  isEmpty?: boolean;
}

/**
 * "What needs a person right now", as tappable filters.
 *
 * Selecting a signal kind filters the operational table below, which is the
 * fastest path from a banner to the affected rows.
 */
export function AttentionStrip({ items, selectedKinds, onToggleKind, onClear, isEmpty = false }: AttentionStripProps): ReactNode {
  const counts = KIND_ORDER.map((kind) => ({
    kind,
    count: items.filter((item) => item.kind === kind).reduce((sum, item) => sum + item.count, 0),
  })).filter((entry) => entry.count > 0);

  const severity = items.length === 0 ? 'nominal' : worstStatus(items.map((item) => item.severity));
  const color = STATUS_META[severity].color;

  if (items.length === 0) {
    const tone = isEmpty ? tokens.status.watch : tokens.status.nominal;
    const Icon = isEmpty ? CircleSlash : CheckCircle2;
    return (
      <Box
        component="section"
        aria-label="Attention signals"
        className="chamfer rise-in"
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          padding: '8px 14px',
          border: `1px solid ${alpha(tone, 0.28)}`,
          backgroundColor: alpha(tone, 0.05),
          color: tone,
        }}
      >
        <Icon size={15} strokeWidth={2.4} aria-hidden={true} />
        <Box sx={{ fontSize: '0.8125rem', color: tokens.text.mid }}>
          {isEmpty
            ? 'No signal can be evaluated: the collector returned no client, service or region rows for this window.'
            : 'No client, service or region signal is above tolerance in this window.'}
        </Box>
      </Box>
    );
  }

  return (
    <Box
      component="section"
      aria-label="Attention signals"
      className="chamfer rise-in"
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        flexWrap: 'wrap',
        padding: '8px 14px',
        border: `1px solid ${alpha(color, 0.3)}`,
        borderLeft: `3px solid ${color}`,
        backgroundColor: alpha(color, 0.055),
      }}
    >
      <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75, color }}>
        <ShieldAlert size={15} strokeWidth={2.4} aria-hidden={true} />
        <Box className="mono" sx={{ fontSize: '0.75rem', letterSpacing: '0.04em' }}>
          {items.length} signal{items.length === 1 ? '' : 's'}
        </Box>
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}>
        {counts.map(({ kind, count }) => {
          const selected = selectedKinds.includes(kind);
          const meta = ATTENTION_META[kind];
          return (
            <Tooltip key={kind} title={selected ? 'Remove this filter' : `Filter the table to ${meta.label}`}>
              <Box
                component="button"
                type="button"
                aria-pressed={selected}
                onClick={() => onToggleKind(kind)}
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 0.625,
                  padding: '3px 9px',
                  borderRadius: tokens.radius.sm,
                  border: `1px solid ${selected ? alpha(meta.color, 0.6) : tokens.ink.lineStrong}`,
                  backgroundColor: selected ? alpha(meta.color, 0.16) : 'transparent',
                  color: selected ? meta.color : tokens.text.mid,
                  cursor: 'pointer',
                  font: 'inherit',
                  '&:hover': { borderColor: alpha(meta.color, 0.6), color: meta.color },
                }}
              >
                <Box sx={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: meta.color }} />
                <MicroLabel sx={{ color: 'inherit' }}>{meta.label}</MicroLabel>
                <Box className="mono" sx={{ fontSize: '0.6875rem' }}>
                  {count}
                </Box>
              </Box>
            </Tooltip>
          );
        })}
      </Box>

      <Box sx={{ display: { xs: 'none', xl: 'flex' }, alignItems: 'center', gap: 1, minWidth: 0, flex: 1 }}>
        {items.slice(0, 3).map((item) => (
          <Tooltip key={item.id} title={item.detail}>
            <Box
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.75,
                minWidth: 0,
                maxWidth: 280,
                px: 1,
                py: 0.25,
                borderRadius: tokens.radius.sm,
                backgroundColor: 'rgba(8,11,17,0.55)',
                border: `1px solid ${tokens.ink.line}`,
              }}
            >
              <Box sx={{ width: 5, height: 5, borderRadius: '50%', backgroundColor: STATUS_META[item.severity].color, flexShrink: 0 }} />
              <Box className="mono" sx={{ fontSize: '0.6875rem', color: tokens.text.hi, whiteSpace: 'nowrap' }}>
                {item.label}
              </Box>
              <Box
                className="mono"
                sx={{ fontSize: '0.6875rem', color: tokens.text.low, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
              >
                {item.short}
              </Box>
            </Box>
          </Tooltip>
        ))}
      </Box>

      <Box sx={{ flex: 1 }} />

      {selectedKinds.length > 0 || items.length > 0 ? (
        <Box
          component="button"
          type="button"
          onClick={onClear}
          sx={{
            border: 'none',
            background: 'none',
            color: tokens.text.low,
            cursor: 'pointer',
            font: 'inherit',
            fontSize: '0.6875rem',
            textDecoration: 'underline',
            textUnderlineOffset: '3px',
            '&:hover': { color: tokens.text.hi },
          }}
        >
          Clear signal filter
        </Box>
      ) : null}
    </Box>
  );
}
