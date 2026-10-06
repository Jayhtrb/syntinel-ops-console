import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import { alpha } from '@mui/material/styles';
import { useState, type ReactNode } from 'react';
import { ArrowDown, ArrowUp } from 'lucide-react';
import type { AttentionKind, ClientRow, DashboardSnapshot } from '../../types/dashboard';
import { STATUS_META, worstStatus } from '../../lib/status';
import { formatInteger, formatPercent } from '../../lib/format';
import { tokens } from '../../theme/tokens';
import { MeterBar } from '../common/MeterBar';
import { StatusPill } from '../common/StatusPill';
import { MicroLabel, NoData } from '../common/atoms';
import { EmptyState } from '../feedback/StateSurfaces';

type SortKey = 'name' | 'callsQueued' | 'callsActive' | 'slaToday' | 'status';

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
  const ariaSort = isActive ? (direction === 'asc' ? 'ascending' : 'descending') : 'none';
  return (
    <TableCell align={align} scope="col" aria-sort={ariaSort} sx={{ py: 0.75 }}>
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
          '&:hover': { color: tokens.text.hi },
        }}
      >
        {label}
        {isActive ? (
          direction === 'asc' ? (
            <ArrowUp size={11} strokeWidth={2.6} aria-hidden={true} />
          ) : (
            <ArrowDown size={11} strokeWidth={2.6} aria-hidden={true} />
          )
        ) : null}
      </Box>
    </TableCell>
  );
}

export interface OperationalTableProps {
  rows: ClientRow[];
  selectedKinds: AttentionKind[];
  onClearKinds: () => void;
  visibleTotals: DashboardSnapshot['visibleTotals'];
  systemTotals: DashboardSnapshot['clientTotals'];
  emptyReason?: string;
}

/**
 * The operational performance table: one row per client queue.
 *
 * Sorting defaults to worst SLA first, because the question this table exists to
 * answer is "which client is deteriorating?", not "which client is first
 * alphabetically".
 */
export function OperationalTable({
  rows,
  selectedKinds,
  onClearKinds,
  visibleTotals,
  systemTotals,
  emptyReason,
}: OperationalTableProps): ReactNode {
  const [sortKey, setSortKey] = useState<SortKey>('slaToday');
  const [direction, setDirection] = useState<'asc' | 'desc'>('asc');

  const filtered = selectedKinds.length === 0 ? rows : rows.filter((row) => row.attention.some((kind) => selectedKinds.includes(kind)));

  const sorted = [...filtered].sort((a, b) => {
    const factor = direction === 'asc' ? 1 : -1;
    switch (sortKey) {
      case 'name':
        return a.name.localeCompare(b.name) * factor;
      case 'callsQueued':
        return (a.callsQueued - b.callsQueued) * factor;
      case 'callsActive':
        return (a.callsActive - b.callsActive) * factor;
      case 'status':
        return (STATUS_META[a.status].weight - STATUS_META[b.status].weight) * factor;
      case 'slaToday':
      default: {
        // Rows without a score always sink to the bottom.
        if (a.slaToday === null && b.slaToday === null) return a.name.localeCompare(b.name);
        if (a.slaToday === null) return 1;
        if (b.slaToday === null) return -1;
        return (a.slaToday - b.slaToday) * factor;
      }
    }
  });

  const onSort = (key: SortKey) => {
    if (key === sortKey) {
      setDirection((current) => (current === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortKey(key);
    setDirection(key === 'name' ? 'asc' : key === 'slaToday' ? 'asc' : 'desc');
  };

  if (rows.length === 0) {
    return (
      <EmptyState
        title="No client call activity"
        message={emptyReason ?? 'The collector returned no client queue rows for this window.'}
      />
    );
  }

  if (sorted.length === 0) {
    return (
      <EmptyState
        tone={tokens.status.watch}
        title="No queues match the active signal filter"
        message="Every row is currently filtered out by the attention signals selected above."
        action={
          <Button size="small" variant="outlined" onClick={onClearKinds}>
            Clear signal filter
          </Button>
        }
      />
    );
  }

  const worst = worstStatus(rows.map((row) => row.status));

  return (
    <TableContainer sx={{ backgroundColor: tokens.ink.sunken }}>
      <Table size="small" aria-label="Client call activity">
        <caption className="sr-only">
          Top client queues with calls waiting, calls active and today's service level. Sorted by {sortKey} {direction}ending.
        </caption>
        <TableHead>
          <TableRow>
            <SortHeader label="Client" sortKey="name" activeKey={sortKey} direction={direction} onSort={onSort} align="left" />
            <SortHeader label="In queue" sortKey="callsQueued" activeKey={sortKey} direction={direction} onSort={onSort} hint="Calls waiting right now" />
            <SortHeader label="Active" sortKey="callsActive" activeKey={sortKey} direction={direction} onSort={onSort} hint="Calls connected to an agent or in IVR" />
            <SortHeader label="SLA today" sortKey="slaToday" activeKey={sortKey} direction={direction} onSort={onSort} hint="Service level achieved today against the target" align="left" />
            <SortHeader label="Signal" sortKey="status" activeKey={sortKey} direction={direction} onSort={onSort} align="left" />
          </TableRow>
        </TableHead>
        <TableBody>
          {sorted.map((row) => {
            const meta = STATUS_META[row.status];
            const flagged = row.attention.filter((kind) => kind !== 'inactive');
            return (
              <TableRow key={row.id} hover sx={{ '& td:first-of-type': { borderLeft: `3px solid ${meta.color}` } }}>
                <TableCell>
                  <Box className="mono" sx={{ color: tokens.text.hi, fontSize: '0.8125rem' }}>
                    {row.name}
                  </Box>
                  <Box sx={{ fontSize: '0.6875rem', color: tokens.text.low, mt: 0.125 }}>{row.note}</Box>
                </TableCell>
                <TableCell align="right">
                  <Box className="mono" sx={{ color: row.callsQueued > 0 ? tokens.status.warning : tokens.text.mid }}>
                    {formatInteger(row.callsQueued)}
                  </Box>
                </TableCell>
                <TableCell align="right">
                  <Box className="mono" sx={{ color: row.callsActive > 0 ? tokens.text.hi : tokens.text.faint }}>
                    {formatInteger(row.callsActive)}
                  </Box>
                </TableCell>
                <TableCell sx={{ minWidth: 196, pr: 2.5 }}>
                  {row.slaToday === null ? (
                    <NoData label="No calls" compact />
                  ) : (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                      <Box
                        className="mono"
                        sx={{ width: 56, color: meta.color, fontSize: '0.8125rem', textAlign: 'right' }}
                      >
                        {formatPercent(row.slaToday)}
                      </Box>
                      <Box sx={{ flex: 1, minWidth: 84 }}>
                        <MeterBar value={row.slaToday} max={100} tone={row.status} target={row.slaTarget} />
                      </Box>
                    </Box>
                  )}
                </TableCell>
                <TableCell sx={{ minWidth: 96 }}>
                  <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
                    <StatusPill status={row.status} size="sm" variant="ghost" />
                    {flagged.length === 0 ? null : (
                      <MicroLabel sx={{ color: tokens.text.faint }}>
                        {flagged.length} flag{flagged.length === 1 ? '' : 's'}
                      </MicroLabel>
                    )}
                  </Box>
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
          <MicroLabel sx={{ color: tokens.text.low }}>Overall system call status</MicroLabel>
          <Box className="mono" sx={{ fontSize: '0.75rem', color: tokens.text.hi }}>
            queue {systemTotals ? formatInteger(systemTotals.queued) : '—'}
          </Box>
          <Box className="mono" sx={{ fontSize: '0.75rem', color: tokens.text.hi }}>
            active {systemTotals ? formatInteger(systemTotals.active) : '—'}
          </Box>
          <Box className="mono" sx={{ fontSize: '0.75rem', color: tokens.text.hi }}>
            SLA {systemTotals ? formatPercent(systemTotals.slaToday) : '—'}
          </Box>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
          <MicroLabel sx={{ color: tokens.text.faint }}>
            Visible rows subtotal ({sorted.length} of {rows.length})
          </MicroLabel>
          <Box className="mono" sx={{ fontSize: '0.75rem', color: tokens.text.mid }}>
            queue {visibleTotals ? formatInteger(visibleTotals.queued) : '—'} · active {visibleTotals ? formatInteger(visibleTotals.active) : '—'} · SLA{' '}
            {visibleTotals ? formatPercent(visibleTotals.slaToday) : '—'}
          </Box>
          <Box
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 0.5,
              color: STATUS_META[worst].color,
            }}
          >
            <MicroLabel sx={{ color: 'inherit' }}>Worst {STATUS_META[worst].label}</MicroLabel>
          </Box>
        </Box>
      </Box>
    </TableContainer>
  );
}
