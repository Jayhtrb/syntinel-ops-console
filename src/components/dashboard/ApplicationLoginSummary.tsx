import Box from '@mui/material/Box';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import { alpha } from '@mui/material/styles';
import { useState, type ReactNode } from 'react';
import type { LoginRow } from '../../types/dashboard';
import { formatInteger, formatPercent } from '../../lib/format';
import { tokens } from '../../theme/tokens';
import { MeterBar } from '../common/MeterBar';
import { DeltaChip } from '../common/DeltaChip';
import { MicroLabel } from '../common/atoms';
import { EmptyState } from '../feedback/StateSurfaces';

/** Conservative 7-day extrapolation factor for the prototype's login totals. */
const WEEK_FACTOR = 6.4;

export interface ApplicationLoginSummaryProps {
  rows: LoginRow[];
}

/**
 * Application login summary, preserving the source "Workstation User Login"
 * table and its "Show Last 7 Days Count" control.
 *
 * Login totals are the clearest signal of an application that is deployed but
 * not being reached, so idle applications are stated explicitly rather than
 * shown as a bare zero.
 */
export function ApplicationLoginSummary({ rows }: ApplicationLoginSummaryProps): ReactNode {
  const [showWeek, setShowWeek] = useState(false);

  if (rows.length === 0) {
    return <EmptyState title="No login telemetry" message="No application login totals were returned for this window." />;
  }

  const factor = showWeek ? WEEK_FACTOR : 1;
  const total = rows.reduce((sum, row) => sum + row.users * factor, 0);
  const active = rows.filter((row) => row.users > 0);
  const idle = rows.filter((row) => row.users === 0);
  const top = active.length > 0 ? active.reduce((a, b) => (b.users > a.users ? b : a)) : null;
  const topShare = top && total > 0 ? ((top.users * factor) / total) * 100 : null;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      <Box sx={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 1.5, flexWrap: 'wrap' }}>
        <Box>
          <MicroLabel sx={{ color: tokens.text.faint }}>{showWeek ? '7-day logins' : 'Logins today'}</MicroLabel>
          <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
            <Box className="mono" sx={{ fontSize: '1.5rem', color: tokens.text.hi, lineHeight: 1.1 }}>
              {formatInteger(total)}
            </Box>
            <Box sx={{ fontSize: '0.6875rem', color: tokens.text.low }}>
              {active.length} of {rows.length} applications active
            </Box>
          </Box>
        </Box>
        <ToggleButtonGroup
          exclusive
          size="small"
          value={showWeek ? 'week' : 'day'}
          onChange={(_event, next: string | null) => next && setShowWeek(next === 'week')}
          aria-label="Login total window"
        >
          <ToggleButton value="day">Today</ToggleButton>
          <ToggleButton value="week">Last 7 days</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      <Box sx={{ display: 'grid', gap: '1px', backgroundColor: tokens.ink.line, border: `1px solid ${tokens.ink.line}` }}>
        {rows.map((row) => {
          const value = row.users * factor;
          const isIdle = row.users === 0;
          const share = total > 0 ? (value / total) * 100 : 0;
          return (
            <Box
              key={row.id}
              sx={{
                display: 'grid',
                gridTemplateColumns: '1fr auto',
                gap: 0.75,
                padding: '9px 12px',
                backgroundColor: isIdle ? alpha(tokens.ink.sunken, 0.85) : tokens.ink.panel,
                borderLeft: `3px solid ${isIdle ? tokens.status.idle : tokens.status.nominal}`,
              }}
            >
              <Box sx={{ minWidth: 0 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                  <Box sx={{ fontSize: '0.8125rem', color: isIdle ? tokens.text.mid : tokens.text.hi, fontWeight: 500 }}>
                    {row.application}
                  </Box>
                  {isIdle ? (
                    <MicroLabel sx={{ color: tokens.status.idle }}>idle</MicroLabel>
                  ) : (
                    <MicroLabel sx={{ color: tokens.text.faint }}>{formatPercent(share, 0)} share</MicroLabel>
                  )}
                </Box>
                <Box sx={{ mt: 0.5, maxWidth: 220 }}>
                  <MeterBar
                    value={isIdle ? 0 : value}
                    max={row.peak > 0 ? row.peak * factor : Math.max(value, 1)}
                    tone={isIdle ? 'idle' : row.status}
                    percent={isIdle ? 0 : undefined}
                  />
                </Box>
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 0.25 }}>
                <Box className="mono" sx={{ fontSize: '0.9375rem', color: isIdle ? tokens.text.faint : tokens.text.hi }}>
                  {formatInteger(value)}
                </Box>
                {isIdle ? (
                  <MicroLabel sx={{ color: tokens.text.faint }}>no logins</MicroLabel>
                ) : (
                  <DeltaChip
                    delta={{
                      value: row.changeVsPriorDay,
                      unit: '%',
                      direction: row.changeVsPriorDay > 0 ? 'up' : row.changeVsPriorDay < 0 ? 'down' : 'flat',
                      good: row.changeVsPriorDay >= 0,
                      caption: `${row.changeVsPriorDay >= 0 ? 'Up' : 'Down'} ${Math.abs(row.changeVsPriorDay).toFixed(1)}% vs prior day`,
                    }}
                  />
                )}
              </Box>
            </Box>
          );
        })}
      </Box>

      <Box
        sx={{
          padding: '9px 12px',
          border: `1px solid ${tokens.ink.line}`,
          backgroundColor: alpha(tokens.brand.ice, 0.045),
          fontSize: '0.6875rem',
          color: tokens.text.low,
          lineHeight: 1.55,
        }}
      >
        {idle.length > 0
          ? `${idle.length} application${idle.length === 1 ? '' : 's'} recorded no logins: ${idle.map((row) => row.application).join(', ')}. Confirm this is expected for the window.`
          : 'Every workstation application served at least one login in this window.'}
        {top && topShare !== null ? ` ${top.application} carries ${formatPercent(topShare, 0)} of logins.` : ''}
        {showWeek ? ' Seven-day totals are extrapolated from today in this prototype.' : ''}
      </Box>
    </Box>
  );
}
