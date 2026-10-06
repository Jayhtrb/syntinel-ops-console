import Box from '@mui/material/Box';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import { alpha } from '@mui/material/styles';
import { useState, type ReactNode } from 'react';
import { ArrowDown, ArrowUp } from 'lucide-react';
import type { AttentionKind, WorkforceRow } from '../../types/dashboard';
import { STATUS_META, worstStatus, forecastStatus } from '../../lib/status';
import { formatAht, formatForecastDeviation, formatInteger, formatPercent } from '../../lib/format';
import { tokens } from '../../theme/tokens';
import { MeterBar } from '../common/MeterBar';
import { StatusPill } from '../common/StatusPill';
import { MicroLabel } from '../common/atoms';
import { EmptyState } from '../feedback/StateSurfaces';

type SortKey = 'team' | 'adherence' | 'aht' | 'occupancy' | 'forecast' | 'ivr' | 'status';

function SortHeader({
  label,
  sortKey,
  activeKey,
  direction,
  onSort,
  align = 'right',
  hint,
}: {
  label: string;
  sortKey: SortKey;
  activeKey: SortKey;
  direction: 'asc' | 'desc';
  onSort: (key: SortKey) => void;
  align?: 'left' | 'right';
  hint?: string;
}): ReactNode {
  const isActive = activeKey === sortKey;
  return (
    <TableCell align={align} scope="col" aria-sort={isActive ? (direction === 'asc' ? 'ascending' : 'descending') : 'none'} sx={{ py: 0.75 }}>
      <Box
        component="button"
        type="button"
        onClick={() => onSort(sortKey)}
        title={hint}
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 0.5,
          justifyContent: align === 'right' ? 'flex-end' : 'flex-start',
          width: '100%',
          border: 'none',
          background: 'none',
          padding: 0,
          cursor: 'pointer',
          color: isActive ? tokens.text.hi : 'inherit',
          font: 'inherit',
          letterSpacing: 'inherit',
          textTransform: 'inherit',
          whiteSpace: 'nowrap',
          '&:hover': { color: tokens.text.hi },
        }}
      >
        {label}
        {isActive ? (direction === 'asc' ? <ArrowUp size={11} strokeWidth={2.6} aria-hidden={true} /> : <ArrowDown size={11} strokeWidth={2.6} aria-hidden={true} />) : null}
      </Box>
    </TableCell>
  );
}

export interface WorkforceTableProps {
  rows: WorkforceRow[];
  selectedKinds: AttentionKind[];
  onClearKinds: () => void;
}

/**
 * Verint WFO team table.
 *
 * One row per team with adherence, AHT, occupancy, forecast deviation and IVR
 * containment. Sorts worst-adherence first because that is the fastest answer to
 * "which team needs a person right now".
 */
export function WorkforceTable({ rows, selectedKinds, onClearKinds }: WorkforceTableProps): ReactNode {
  const [sortKey, setSortKey] = useState<SortKey>('adherence');
  const [direction, setDirection] = useState<'asc' | 'desc'>('asc');

  if (rows.length === 0) {
    return <EmptyState title="No workforce telemetry" message="No Verint WFO team rows were returned for this window." />;
  }

  const filtered = selectedKinds.length === 0 ? rows : rows.filter((row) => row.attention.some((kind) => selectedKinds.includes(kind)));

  const sorted = [...filtered].sort((a, b) => {
    const factor = direction === 'asc' ? 1 : -1;
    switch (sortKey) {
      case 'team':
        return a.team.localeCompare(b.team) * factor;
      case 'aht':
        return (a.ahtSeconds - b.ahtSeconds) * factor;
      case 'occupancy':
        return (a.occupancy - b.occupancy) * factor;
      case 'forecast':
        return (a.forecastActualRatio - b.forecastActualRatio) * factor;
      case 'ivr':
        return (a.ivrContainment - b.ivrContainment) * factor;
      case 'status':
        return (STATUS_META[a.status].weight - STATUS_META[b.status].weight) * factor;
      case 'adherence':
      default:
        return (a.adherence - b.adherence) * factor;
    }
  });

  const onSort = (key: SortKey) => {
    if (key === sortKey) {
      setDirection((current) => (current === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortKey(key);
    setDirection(key === 'team' ? 'asc' : key === 'adherence' ? 'asc' : 'desc');
  };

  if (sorted.length === 0) {
    return (
      <EmptyState
        tone={tokens.status.watch}
        title="No teams match the active signal filter"
        message="Every team is currently filtered out by the attention signals selected above."
        action={
          <Box
            component="button"
            type="button"
            onClick={onClearKinds}
            sx={{ border: 'none', background: 'none', color: tokens.brand.ice, cursor: 'pointer', font: 'inherit', fontSize: '0.8125rem' }}
          >
            Clear signal filter
          </Box>
        }
      />
    );
  }

  const scheduled = rows.reduce((sum, row) => sum + row.scheduled, 0);
  const loggedIn = rows.reduce((sum, row) => sum + row.loggedIn, 0);
  const worst = worstStatus(rows.map((row) => row.status));

  return (
    <TableContainer sx={{ backgroundColor: tokens.ink.sunken }}>
      <Table size="small" aria-label="Workforce team performance">
        <caption className="sr-only">
          Verint workforce teams with schedule adherence, average handle time, occupancy, forecast deviation and IVR containment.
        </caption>
        <TableHead>
          <TableRow>
            <SortHeader label="Team" sortKey="team" activeKey={sortKey} direction={direction} onSort={onSort} align="left" />
            <SortHeader label="Adherence" sortKey="adherence" activeKey={sortKey} direction={direction} onSort={onSort} hint="Scheduled time actually worked" />
            <SortHeader label="AHT" sortKey="aht" activeKey={sortKey} direction={direction} onSort={onSort} hint="Average handle time, minutes:seconds" />
            <SortHeader label="Occupancy" sortKey="occupancy" activeKey={sortKey} direction={direction} onSort={onSort} hint="Logged-in time on calls or after-call work" />
            <SortHeader label="vs forecast" sortKey="forecast" activeKey={sortKey} direction={direction} onSort={onSort} hint="Actual call volume against plan" />
            <SortHeader label="IVR" sortKey="ivr" activeKey={sortKey} direction={direction} onSort={onSort} hint="Contacts resolved without an agent" />
            <SortHeader label="Signal" sortKey="status" activeKey={sortKey} direction={direction} onSort={onSort} align="left" />
          </TableRow>
        </TableHead>
        <TableBody>
          {sorted.map((row) => {
            const meta = STATUS_META[row.status];
            const fcast = forecastStatus(row.forecastActualRatio);
            return (
              <TableRow key={row.id} hover sx={{ '& td:first-of-type': { borderLeft: `3px solid ${meta.color}` } }}>
                <TableCell>
                  <Box sx={{ color: tokens.text.hi, fontSize: '0.8125rem', fontWeight: 500 }}>{row.team}</Box>
                  <Box sx={{ fontSize: '0.6875rem', color: tokens.text.low, mt: 0.125, maxWidth: 300 }}>{row.note}</Box>
                </TableCell>
                <TableCell sx={{ minWidth: 128, pr: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box className="mono" sx={{ width: 44, color: meta.color, fontSize: '0.8125rem', textAlign: 'right' }}>
                      {formatPercent(row.adherence, 0)}
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 56 }}>
                      <MeterBar value={row.adherence} max={100} tone={row.status} target={row.adherenceTarget} />
                    </Box>
                  </Box>
                </TableCell>
                <TableCell align="right">
                  <Box className="mono" sx={{ color: tokens.text.hi, fontSize: '0.8125rem' }}>
                    {formatAht(row.ahtSeconds)}
                  </Box>
                  <Box className="mono" sx={{ color: tokens.text.faint, fontSize: '0.625rem' }}>
                    /{formatAht(row.ahtTargetSeconds)}
                  </Box>
                </TableCell>
                <TableCell sx={{ minWidth: 128, pr: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box className="mono" sx={{ width: 44, color: meta.color, fontSize: '0.8125rem', textAlign: 'right' }}>
                      {formatPercent(row.occupancy, 0)}
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 56 }}>
                      <MeterBar value={row.occupancy} max={100} tone={row.status} target={row.occupancyTarget} />
                    </Box>
                  </Box>
                </TableCell>
                <TableCell align="right">
                  <Box className="mono" sx={{ color: STATUS_META[fcast].color, fontSize: '0.8125rem' }}>
                    {formatForecastDeviation(row.forecastActualRatio)}
                  </Box>
                </TableCell>
                <TableCell sx={{ minWidth: 116, pr: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box className="mono" sx={{ width: 36, color: meta.color, fontSize: '0.8125rem', textAlign: 'right' }}>
                      {formatPercent(row.ivrContainment, 0)}
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 48 }}>
                      <MeterBar value={row.ivrContainment} max={100} tone={row.status} target={row.ivrTarget} />
                    </Box>
                  </Box>
                </TableCell>
                <TableCell>
                  <StatusPill status={row.status} size="sm" variant="ghost" />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 2,
          flexWrap: 'wrap',
          padding: '9px 14px',
          borderTop: `1px solid ${tokens.ink.lineStrong}`,
          backgroundColor: alpha(tokens.brand.ice, 0.045),
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
          <MicroLabel sx={{ color: tokens.text.low }}>Roster</MicroLabel>
          <Box className="mono" sx={{ fontSize: '0.75rem', color: tokens.text.hi }}>
            {formatInteger(scheduled)} scheduled
          </Box>
          <Box className="mono" sx={{ fontSize: '0.75rem', color: tokens.text.mid }}>
            {formatInteger(loggedIn)} logged in
          </Box>
          <Box className="mono" sx={{ fontSize: '0.75rem', color: tokens.text.low }}>
            {scheduled > 0 ? formatPercent(((scheduled - loggedIn) / scheduled) * 100, 0) : '—'} shrinkage
          </Box>
        </Box>
        <MicroLabel sx={{ color: STATUS_META[worst].color }}>Worst {STATUS_META[worst].label}</MicroLabel>
      </Box>
    </TableContainer>
  );
}
