import Box from '@mui/material/Box';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import { alpha } from '@mui/material/styles';
import type { ReactNode } from 'react';
import type { CapabilitySummary, ServiceRow } from '../../types/dashboard';
import { STATUS_META, worstStatus } from '../../lib/status';
import { formatCompact, formatInteger, formatRatio } from '../../lib/format';
import { tokens } from '../../theme/tokens';
import { MeterBar } from '../common/MeterBar';
import { StatusPill } from '../common/StatusPill';
import { MicroLabel } from '../common/atoms';
import { EmptyState } from '../feedback/StateSurfaces';

export interface ServiceThroughputTableProps {
  rows: ServiceRow[];
  capabilities: CapabilitySummary[];
  selectedCapabilityId: string | null;
  onSelectCapability: (id: string | null) => void;
}

/**
 * Middleware service throughput.
 *
 * Preserves the source MW Services columns (error count, throughput, error rate)
 * and adds the capability tabs as filters instead of tabs, so the comparison
 * stays visible while filtering.
 */
export function ServiceThroughputTable({
  rows,
  capabilities,
  selectedCapabilityId,
  onSelectCapability,
}: ServiceThroughputTableProps): ReactNode {
  if (rows.length === 0) {
    return <EmptyState title="No service telemetry" message="No middleware service rows were returned for this window." />;
  }

  const filtered = selectedCapabilityId === null ? rows : rows.filter((row) => row.capabilityId === selectedCapabilityId);
  const maxThroughput = Math.max(...rows.map((row) => row.throughput), 1);
  const totalThroughput = filtered.reduce((sum, row) => sum + row.throughput, 0);
  const worstRate = Math.max(...filtered.map((row) => row.errorRate), 0);

  return (
    <>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap', padding: '10px 14px', borderBottom: `1px solid ${tokens.ink.line}` }}>
        <MicroLabel sx={{ color: tokens.text.faint, mr: 0.5 }}>
          Business capability
        </MicroLabel>
        <Box
          component="button"
          type="button"
          aria-pressed={selectedCapabilityId === null}
          onClick={() => onSelectCapability(null)}
          sx={{
            padding: '3px 9px',
            borderRadius: tokens.radius.sm,
            border: `1px solid ${selectedCapabilityId === null ? alpha(tokens.brand.ice, 0.5) : tokens.ink.lineStrong}`,
            backgroundColor: selectedCapabilityId === null ? alpha(tokens.brand.ice, 0.14) : 'transparent',
            color: selectedCapabilityId === null ? tokens.brand.ice : tokens.text.mid,
            cursor: 'pointer',
            font: 'inherit',
            fontSize: '0.6875rem',
          }}
        >
          All services
        </Box>
        {capabilities.map((capability) => {
          const selected = capability.id === selectedCapabilityId;
          const color = STATUS_META[capability.status].color;
          return (
            <Box
              key={capability.id}
              component="button"
              type="button"
              aria-pressed={selected}
              title={`${capability.label} · ${capability.serviceCount} services`}
              onClick={() => onSelectCapability(selected ? null : capability.id)}
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.75,
                padding: '3px 9px',
                borderRadius: tokens.radius.sm,
                border: `1px solid ${selected ? alpha(tokens.brand.ice, 0.5) : tokens.ink.lineStrong}`,
                backgroundColor: selected ? alpha(tokens.brand.ice, 0.14) : 'transparent',
                color: selected ? tokens.brand.ice : tokens.text.mid,
                cursor: 'pointer',
                font: 'inherit',
                fontSize: '0.6875rem',
                maxWidth: 320,
              }}
            >
              <Box
                component="span"
                sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
              >
                {capability.label}
              </Box>
              <Box className="mono" sx={{ color, fontSize: '0.6875rem' }}>
                {formatRatio(capability.errorRate, 2)}
              </Box>
              <Box className="mono" sx={{ color: tokens.text.faint, fontSize: '0.625rem' }}>
                {capability.serviceCount === 0 ? 'idle' : `${capability.serviceCount} svc`}
              </Box>
            </Box>
          );
        })}
      </Box>

      {filtered.length === 0 ? (
        <Box sx={{ p: 2 }}>
          <EmptyState
            tone={tokens.status.watch}
            title="This capability reported no services"
            message="The capability tab exists in the source view with a zero error rate but no service rows were captured for it."
          />
        </Box>
      ) : (
        <TableContainer sx={{ backgroundColor: tokens.ink.sunken }}>
          <Table size="small" aria-label="Middleware service throughput">
            <caption className="sr-only">
              Service throughput and error rates. Error count is reported exactly as the source view presents it; error rate is the authoritative
              ratio.
            </caption>
            <TableHead>
              <TableRow>
                <TableCell scope="col">Service</TableCell>
                <TableCell scope="col">Capability</TableCell>
                <TableCell scope="col" align="right">
                  Error count
                </TableCell>
                <TableCell scope="col" align="left">
                  Throughput
                </TableCell>
                <TableCell scope="col" align="right">
                  Error rate
                </TableCell>
                <TableCell scope="col" align="left">
                  Signal
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.map((row) => {
                const meta = STATUS_META[row.status];
                return (
                  <TableRow key={row.id} hover sx={{ '& td:first-of-type': { borderLeft: `3px solid ${meta.color}` } }}>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                        <Box className="mono" sx={{ color: tokens.text.hi, fontSize: '0.8125rem' }}>
                          {row.name}
                        </Box>
                        {row.instance ? (
                          <Box
                            className="mono"
                            sx={{
                              fontSize: '0.625rem',
                              color: tokens.text.low,
                              border: `1px solid ${tokens.ink.line}`,
                              borderRadius: 2,
                              padding: '0 3px',
                            }}
                          >
                            {row.instance}
                          </Box>
                        ) : null}
                      </Box>
                      <Box sx={{ fontSize: '0.6875rem', color: tokens.text.low, mt: 0.125 }}>{row.note}</Box>
                    </TableCell>
                    <TableCell sx={{ maxWidth: 220 }}>
                      <Box sx={{ fontSize: '0.75rem', color: tokens.text.mid, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {row.capabilityLabel}
                      </Box>
                    </TableCell>
                    <TableCell align="right">
                      <Box className="mono" sx={{ color: row.errorCount > 1 ? tokens.status.warning : tokens.text.mid }}>
                        {formatRatio(row.errorCount)}
                      </Box>
                    </TableCell>
                    <TableCell sx={{ minWidth: 190 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box className="mono" sx={{ width: 68, color: tokens.text.hi, fontSize: '0.8125rem', textAlign: 'right' }}>
                          {formatInteger(row.throughput)}
                        </Box>
                        <Box sx={{ flex: 1, minWidth: 70 }}>
                          <MeterBar value={row.throughput} max={maxThroughput} tone="nominal" />
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell align="right">
                      <Box className="mono" sx={{ color: meta.color }}>
                        {formatRatio(row.errorRate)}%
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
              <MicroLabel sx={{ color: tokens.text.low }}>Visible services</MicroLabel>
              <Box className="mono" sx={{ fontSize: '0.75rem', color: tokens.text.hi }}>
                {filtered.length} of {rows.length}
              </Box>
              <Box className="mono" sx={{ fontSize: '0.75rem', color: tokens.text.mid }}>
                {formatCompact(totalThroughput)} calls
              </Box>
              <Box className="mono" sx={{ fontSize: '0.75rem', color: worstRate >= 0.5 ? tokens.status.warning : tokens.text.mid }}>
                worst rate {formatRatio(worstRate)}%
              </Box>
            </Box>
            <MicroLabel sx={{ color: STATUS_META[worstStatus(rows.map((row) => row.status))].color }}>
              Worst {STATUS_META[worstStatus(rows.map((row) => row.status))].label}
            </MicroLabel>
          </Box>
        </TableContainer>
      )}
    </>
  );
}
