import Box from '@mui/material/Box';
import type { ReactNode } from 'react';
import type { WorkforceRow, WorkforceSummary } from '../../types/dashboard';
import { STATUS_META, worstStatus } from '../../lib/status';
import { formatInteger, formatPercent } from '../../lib/format';
import { tokens } from '../../theme/tokens';
import { MicroLabel, NoData } from '../common/atoms';
import { MeterBar } from '../common/MeterBar';
import { StatusPill } from '../common/StatusPill';
import { EmptyState } from '../feedback/StateSurfaces';

export interface WorkforceRosterPanelProps {
  summary: WorkforceSummary;
  rows: WorkforceRow[];
}

/**
 * Right-hand workforce summary.
 *
 * Complements the KPI row (which covers adherence/AHT/occupancy/forecast/IVR) by
 * showing the roster itself: how many agents are scheduled vs actually on the
 * floor, shrinkage, and a severity-ordered list of teams to review.
 */
export function WorkforceRosterPanel({ summary, rows }: WorkforceRosterPanelProps): ReactNode {
  if (rows.length === 0) {
    return <EmptyState title="No workforce telemetry" message="No Verint WFO roster data was returned for this window." />;
  }

  const flagged = [...rows]
    .filter((row) => row.attention.includes('workforce'))
    .sort((a, b) => STATUS_META[b.status].weight - STATUS_META[a.status].weight);
  const severity = flagged.length === 0 ? 'nominal' : worstStatus(flagged.map((row) => row.status));

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
        <Box sx={{ border: `1px solid ${tokens.ink.line}`, borderRadius: tokens.radius.sm, padding: '10px 12px', backgroundColor: tokens.ink.sunken }}>
          <MicroLabel sx={{ color: tokens.text.faint }}>Scheduled</MicroLabel>
          <Box className="mono" sx={{ fontSize: '1.375rem', color: tokens.text.hi, lineHeight: 1.1, mt: 0.25 }}>
            {summary.scheduled === null ? <NoData /> : formatInteger(summary.scheduled)}
          </Box>
        </Box>
        <Box sx={{ border: `1px solid ${tokens.ink.line}`, borderRadius: tokens.radius.sm, padding: '10px 12px', backgroundColor: tokens.ink.sunken }}>
          <MicroLabel sx={{ color: tokens.text.faint }}>Logged in</MicroLabel>
          <Box className="mono" sx={{ fontSize: '1.375rem', color: tokens.text.hi, lineHeight: 1.1, mt: 0.25 }}>
            {summary.loggedIn === null ? <NoData /> : formatInteger(summary.loggedIn)}
          </Box>
        </Box>
      </Box>

      <Box sx={{ border: `1px solid ${tokens.ink.line}`, borderRadius: tokens.radius.sm, padding: '10px 12px' }}>
        <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 1 }}>
          <MicroLabel sx={{ color: tokens.text.low }}>Shrinkage</MicroLabel>
          <Box className="mono" sx={{ fontSize: '0.9375rem', color: tokens.text.hi }}>
            {summary.shrinkage === null ? <NoData compact /> : formatPercent(summary.shrinkage)}
          </Box>
        </Box>
        <Box sx={{ mt: 0.75 }}>
          <MeterBar value={summary.shrinkage ?? 0} max={40} tone={summary.shrinkage !== null && summary.shrinkage > 20 ? 'warning' : 'nominal'} />
        </Box>
        <Box sx={{ fontSize: '0.6875rem', color: tokens.text.low, mt: 0.625, lineHeight: 1.5 }}>
          {summary.scheduled !== null && summary.loggedIn !== null
            ? `${formatInteger(summary.scheduled - summary.loggedIn)} of ${formatInteger(summary.scheduled)} scheduled agents are off the floor this window.`
            : 'Roster telemetry unavailable.'}
        </Box>
      </Box>

      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.75 }}>
          <MicroLabel sx={{ color: tokens.text.low }}>Teams to review</MicroLabel>
          <StatusPill status={severity} size="sm" variant="ghost" label={flagged.length === 0 ? 'Clear' : `${flagged.length}`} />
        </Box>
        {flagged.length === 0 ? (
          <Box sx={{ fontSize: '0.75rem', color: tokens.text.mid, padding: '6px 0' }}>
            Every team is within its adherence, occupancy and forecast targets.
          </Box>
        ) : (
          <Box sx={{ display: 'grid', gap: '1px', backgroundColor: tokens.ink.line, border: `1px solid ${tokens.ink.line}` }}>
            {flagged.map((row) => {
              const color = STATUS_META[row.status].color;
              const firstSignal = (row.note.split(' · ')[0] ?? row.note).replace(/\s+vs\s+.*$/, '');
              return (
                <Box key={row.id} sx={{ display: 'flex', alignItems: 'center', gap: 1, padding: '7px 10px', backgroundColor: tokens.ink.sunken, borderLeft: `3px solid ${color}` }}>
                  <Box sx={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: color, flexShrink: 0 }} />
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Box sx={{ fontSize: '0.8125rem', color: tokens.text.hi, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {row.team}
                    </Box>
                    <Box sx={{ fontSize: '0.6875rem', color: tokens.text.low, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {firstSignal}
                    </Box>
                  </Box>
                  <Box className="mono" sx={{ fontSize: '0.6875rem', color, whiteSpace: 'nowrap' }}>
                    {formatPercent(row.adherence, 0)} · {formatPercent(row.occupancy, 0)}
                  </Box>
                </Box>
              );
            })}
          </Box>
        )}
      </Box>

      <Box sx={{ fontSize: '0.6875rem', color: tokens.text.faint, lineHeight: 1.5, borderTop: `1px solid ${tokens.ink.line}`, paddingTop: 1 }}>
        Source: Verint WFO · adherence and occupancy weighted by headcount. Shrinkage is scheduled minus logged-in time.
      </Box>
    </Box>
  );
}
