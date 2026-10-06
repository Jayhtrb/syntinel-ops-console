import Box from '@mui/material/Box';
import { alpha } from '@mui/material/styles';
import type { ReactNode } from 'react';
import type { StatusLevel, SystemStatus } from '../../types/dashboard';
import { queueStatus, slaStatus } from '../../lib/status';
import { formatInteger, formatPercent, formatRatio, formatSignedInteger } from '../../lib/format';
import { tokens } from '../../theme/tokens';
import { MicroLabel, NoData } from '../common/atoms';
import { MeterBar } from '../common/MeterBar';
import { StatusPill } from '../common/StatusPill';

interface CellProps {
  label: string;
  value: ReactNode;
  caption?: ReactNode;
  tone?: StatusLevel;
}

function Cell({ label, value, caption, tone = 'nominal' }: CellProps): ReactNode {
  return (
    <Box
      sx={{
        minWidth: 118,
        flex: '1 1 118px',
        paddingInline: 1.75,
        paddingBlock: 0.5,
        borderLeft: `1px solid ${tokens.ink.line}`,
        '&:first-of-type': { borderLeft: 'none' },
      }}
    >
      <MicroLabel sx={{ color: tokens.text.faint }}>{label}</MicroLabel>
      <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.75, mt: 0.25 }}>
        <Box className="mono" sx={{ fontSize: '1rem', fontWeight: 500, color: tokens.text.hi, lineHeight: 1.2 }}>
          {value}
        </Box>
      </Box>
      {caption ? (
        <Box sx={{ fontSize: '0.6875rem', color: tone === 'nominal' ? tokens.text.low : undefined, mt: 0.25 }}>
          {tone === 'nominal' ? (
            caption
          ) : (
            <Box component="span" sx={{ color: tokens.status[tone === 'unknown' ? 'idle' : tone] }}>
              {caption}
            </Box>
          )}
        </Box>
      ) : null}
    </Box>
  );
}

export interface SystemStatusStripProps {
  system: SystemStatus;
  deepestQueue: { name: string; queued: number } | null;
}

/**
 * The one-line system verdict.
 *
 * Mirrors the source console's "Overall System Call Status" row, promoted to a
 * fixed position above the fold because it answers "is anything wrong?" before
 * any table is read.
 */
export function SystemStatusStrip({ system, deepestQueue }: SystemStatusStripProps): ReactNode {
  const slaTone = slaStatus(system.slaToday, system.slaTarget);
  const queueTone = queueStatus(system.callsQueued);
  const slaDeltaPp = system.slaToday !== null && system.previous.slaToday !== null ? system.slaToday - system.previous.slaToday : null;
  const previousQueued = system.previous.callsQueued;

  return (
    <Box
      component="section"
      aria-label="Overall system call status"
      className="chamfer rise-in"
      sx={{
        display: 'flex',
        alignItems: 'stretch',
        flexWrap: 'wrap',
        gap: '8px 0',
        padding: '10px 4px',
        border: `1px solid ${tokens.ink.line}`,
        backgroundColor: alpha(tokens.ink.panel, 0.9),
        backgroundImage: 'linear-gradient(180deg, rgba(233,240,248,0.02), transparent 55%)',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, minWidth: 268, flex: '1.4 1 268px', paddingInline: 1.75 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, minWidth: 0, flex: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, justifyContent: 'space-between' }}>
            <MicroLabel sx={{ color: tokens.text.faint }}>Queue SLA · overall</MicroLabel>
            <StatusPill status={slaTone} size="sm" variant="ghost" />
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
            <Box className="mono" sx={{ fontSize: '1.375rem', fontWeight: 500, color: tokens.text.hi, lineHeight: 1 }}>
              {formatPercent(system.slaToday)}
            </Box>
            <Box className="micro" sx={{ color: tokens.text.low }}>
              target {system.slaTarget}%
            </Box>
            {slaDeltaPp !== null ? (
              <Box className="mono" sx={{ fontSize: '0.6875rem', color: slaDeltaPp < 0 ? tokens.status.critical : tokens.status.nominal }}>
                {`${slaDeltaPp > 0 ? '+' : slaDeltaPp < 0 ? '−' : '±'}${Math.abs(slaDeltaPp).toFixed(1)}pt vs prior`}
              </Box>
            ) : null}
          </Box>
          <MeterBar value={system.slaToday ?? 0} max={100} tone={slaTone} target={system.slaTarget} height={5} />
        </Box>
      </Box>

      <Cell
        label="Calls queued"
        value={system.callsQueued === null ? <NoData compact /> : formatInteger(system.callsQueued)}
        caption={
          system.callsQueued === null
            ? 'No queue telemetry'
            : deepestQueue && deepestQueue.queued > 0
              ? `Deepest: ${deepestQueue.name} (${deepestQueue.queued})`
              : `Unchanged vs prior (${formatInteger(previousQueued)})`
        }
        tone={system.callsQueued === null ? 'unknown' : queueTone}
      />
      <Cell
        label="Calls active"
        value={system.callsActive === null ? <NoData compact /> : formatInteger(system.callsActive)}
        caption={
          system.callsActive === null
            ? 'No call telemetry'
            : `${formatSignedInteger(system.callsActive - (system.previous.callsActive ?? system.callsActive))} vs prior window`
        }
      />
      <Cell
        label="Services"
        value={system.servicesMonitored === 0 ? <NoData compact /> : formatInteger(system.servicesMonitored)}
        caption={`${formatInteger(system.capabilities)} business capabilities`}
        tone={system.servicesMonitored === 0 ? 'unknown' : 'nominal'}
      />
      <Cell
        label="Error rate"
        value={system.errorRate === null ? <NoData compact /> : `${formatRatio(system.errorRate, 2)}%`}
        caption={system.throughput === null ? 'No throughput data' : `${formatInteger(system.throughput)} calls served`}
        tone={system.errorRate === null ? 'unknown' : system.errorRate >= 0.5 ? 'warning' : 'nominal'}
      />
      <Cell
        label="Active users"
        value={system.activeUsers === null ? <NoData compact /> : formatInteger(system.activeUsers)}
        caption={
          system.activeUsers === null
            ? 'No workstation data'
            : `${formatSignedInteger(system.activeUsers - (system.previous.activeUsers ?? system.activeUsers))} vs prior day`
        }
      />
    </Box>
  );
}
