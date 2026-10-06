import Box from '@mui/material/Box';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import { alpha } from '@mui/material/styles';
import type { ReactNode } from 'react';
import type { CloudId, RegionSessionRow } from '../../types/dashboard';
import { STATUS_META } from '../../lib/status';
import { formatInteger, formatSignedPercent } from '../../lib/format';
import { tokens } from '../../theme/tokens';
import { MeterBar } from '../common/MeterBar';
import { StatusPill } from '../common/StatusPill';
import { MicroLabel } from '../common/atoms';
import { EmptyState } from '../feedback/StateSurfaces';

export interface RegionSessionTableProps {
  rows: RegionSessionRow[];
  cloud: CloudId;
  regionId: string;
  onSelectRegion: (regionId: string) => void;
}

/**
 * Citrix regional session table.
 *
 * Region tabs in the source console were a view switch; here the selected region
 * is highlighted inside a table so the whole cloud footprint stays comparable -
 * regional imbalance is a real incident precursor.
 */
export function RegionSessionTable({ rows, cloud, regionId, onSelectRegion }: RegionSessionTableProps): ReactNode {
  if (rows.length === 0) {
    return <EmptyState title="No session telemetry" message="No Citrix regions reported concurrent sessions in this window." />;
  }

  const sorted = [...rows].sort((a, b) => {
    if (a.cloud !== b.cloud) return a.cloud === cloud ? -1 : 1;
    return b.current - a.current || a.region.localeCompare(b.region);
  });

  const cloudTotals = rows.reduce(
    (acc, row) => {
      acc[row.cloud] = (acc[row.cloud] ?? 0) + row.current;
      return acc;
    },
    {} as Record<CloudId, number>,
  );

  const maxPeak = Math.max(...rows.map((row) => row.peak), 1);
  const totalSessions = rows.reduce((sum, row) => sum + row.current, 0);

  return (
    <TableContainer sx={{ backgroundColor: tokens.ink.sunken }}>
      <Table size="small" aria-label="Cloud region sessions">
        <caption className="sr-only">
          Concurrent Citrix sessions per cloud region, with peak and average for the selected window. The selected region row is marked.
        </caption>
        <TableHead>
          <TableRow>
            <TableCell scope="col">Region</TableCell>
            <TableCell scope="col" align="right">
              Current
            </TableCell>
            <TableCell scope="col" align="left">
              Peak / average
            </TableCell>
            <TableCell scope="col" align="right">
              Δ vs prior
            </TableCell>
            <TableCell scope="col" align="left">
              Signal
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {sorted.map((row) => {
            const meta = STATUS_META[row.status];
            const isSelected = row.id === regionId;
            return (
              <TableRow
                key={row.id}
                hover
                selected={isSelected}
                aria-current={isSelected ? 'true' : undefined}
                onClick={() => onSelectRegion(row.id)}
                sx={{
                  cursor: 'pointer',
                  '& td:first-of-type': { borderLeft: `3px solid ${isSelected ? meta.color : 'transparent'}` },
                  opacity: row.cloud === cloud ? 1 : 0.78,
                }}
              >
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                    <Box className="mono" sx={{ color: tokens.text.hi, fontSize: '0.8125rem' }}>
                      {row.region}
                    </Box>
                    <MicroLabel
                      sx={{
                        color: row.cloud === 'aws' ? tokens.chart.series1 : tokens.chart.series2,
                        border: `1px solid ${row.cloud === 'aws' ? alpha(tokens.chart.series1, 0.4) : alpha(tokens.chart.series2, 0.4)}`,
                        borderRadius: 2,
                        px: 0.5,
                      }}
                    >
                      {row.cloud}
                    </MicroLabel>
                    {isSelected ? (
                      <MicroLabel sx={{ color: tokens.brand.ice }}>charted</MicroLabel>
                    ) : null}
                  </Box>
                </TableCell>
                <TableCell align="right">
                  <Box className="mono" sx={{ color: meta.color, fontSize: '0.8125rem' }}>
                    {formatInteger(row.current)}
                  </Box>
                </TableCell>
                <TableCell sx={{ minWidth: 190 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ flex: 1, minWidth: 70 }}>
                      <MeterBar value={row.peak} max={maxPeak} tone={row.status === 'idle' ? 'idle' : 'watch'} />
                    </Box>
                    <Box className="mono" sx={{ fontSize: '0.6875rem', color: tokens.text.low, whiteSpace: 'nowrap' }}>
                      {formatInteger(row.peak)} / {formatInteger(row.average)}
                    </Box>
                  </Box>
                </TableCell>
                <TableCell align="right">
                  <Box
                    className="mono"
                    sx={{ fontSize: '0.75rem', color: row.deltaPercent >= 0 ? tokens.status.nominal : tokens.status.warning }}
                  >
                    {formatSignedPercent(row.deltaPercent)}
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
          gap: 2,
          flexWrap: 'wrap',
          padding: '9px 14px',
          borderTop: `1px solid ${tokens.ink.lineStrong}`,
          backgroundColor: alpha(tokens.brand.ice, 0.045),
        }}
      >
        <MicroLabel sx={{ color: tokens.text.low }}>Fleet</MicroLabel>
        <Box className="mono" sx={{ fontSize: '0.75rem', color: tokens.text.hi }}>
          {formatInteger(totalSessions)} sessions across {rows.length} regions
        </Box>
        <Box className="mono" sx={{ fontSize: '0.75rem', color: tokens.chart.series1 }}>
          AWS {formatInteger(cloudTotals.aws ?? 0)}
        </Box>
        <Box className="mono" sx={{ fontSize: '0.75rem', color: tokens.chart.series2 }}>
          Azure {formatInteger(cloudTotals.azure ?? 0)}
        </Box>
      </Box>
    </TableContainer>
  );
}
