import Box from '@mui/material/Box';
import InputAdornment from '@mui/material/InputAdornment';
import TextField from '@mui/material/TextField';
import { alpha } from '@mui/material/styles';
import { useMemo, useState, type ReactNode } from 'react';
import { Search } from 'lucide-react';
import type { HealthStatus, PortfolioHealth, ServiceHealth } from '../../types/portfolio';
import { tokens } from '../../theme/tokens';
import { HEALTH_META } from './healthMeta';

export interface ServiceDrilldownProps {
  portfolio: PortfolioHealth;
  services: ServiceHealth[];
  selectedServiceId: string | null;
  onSelectService: (id: string) => void;
}

interface Group {
  capability: string;
  status: HealthStatus;
  services: ServiceHealth[];
}

/**
 * Level 2 of the hierarchy: the impacted services for a chosen portfolio,
 * grouped by capability, with each service's health and a brief impact line.
 */
export function ServiceDrilldown({ portfolio, services, selectedServiceId, onSelectService }: ServiceDrilldownProps): ReactNode {
  const [query, setQuery] = useState('');

  const groups = useMemo<Group[]>(() => {
    const owned = services.filter((service) => service.portfolioId === portfolio.id);
    const q = query.trim().toLowerCase();
    const filtered = q.length === 0 ? owned : owned.filter((s) => `${s.name} ${s.capability} ${s.description}`.toLowerCase().includes(q));

    const byCapability = new Map<string, ServiceHealth[]>();
    for (const service of filtered) {
      const key = service.capability || 'Uncategorised';
      const list = byCapability.get(key) ?? [];
      list.push(service);
      byCapability.set(key, list);
    }

    return [...byCapability.entries()]
      .map(([capability, list]) => {
        const status: HealthStatus = list.some((s) => s.status === 'red') ? 'red' : list.some((s) => s.status === 'amber') ? 'amber' : 'green';
        return {
          capability,
          status,
          services: list.sort((a, b) => HEALTH_META[b.status].rank - HEALTH_META[a.status].rank || a.name.localeCompare(b.name)),
        };
      })
      .sort((a, b) => HEALTH_META[b.status].rank - HEALTH_META[a.status].rank || a.capability.localeCompare(b.capability));
  }, [portfolio.id, services, query]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      <TextField
        size="small"
        fullWidth
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={`Filter ${portfolio.serviceCount} services…`}
        slotProps={{
          htmlInput: { 'aria-label': 'Filter services' },
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <Search size={14} strokeWidth={2.4} aria-hidden={true} />
              </InputAdornment>
            ),
          },
        }}
      />

      {groups.length === 0 ? (
        <Box sx={{ padding: 3, textAlign: 'center', color: tokens.text.low, fontSize: '0.8125rem' }}>
          No services match “{query}”.
        </Box>
      ) : (
        <Box sx={{ display: 'grid', gap: 1.5 }}>
          {groups.map((group) => (
            <Box key={group.capability} sx={{ border: `1px solid ${tokens.ink.line}`, borderRadius: tokens.radius.sm, overflow: 'hidden' }}>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.75,
                  padding: '7px 12px',
                  borderBottom: `1px solid ${tokens.ink.line}`,
                  backgroundColor: alpha(HEALTH_META[group.status].color, 0.08),
                }}
              >
                <Box sx={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: HEALTH_META[group.status].color }} />
                <Box sx={{ fontSize: '0.75rem', fontWeight: 600, color: tokens.text.hi }}>{group.capability}</Box>
                <Box className="mono" sx={{ fontSize: '0.625rem', color: tokens.text.low }}>
                  {group.services.length}
                </Box>
              </Box>

              <Box sx={{ display: 'grid', gap: '1px', backgroundColor: tokens.ink.line }}>
                {group.services.map((service) => {
                  const meta = HEALTH_META[service.status];
                  const Icon = meta.icon;
                  const selected = service.id === selectedServiceId;
                  return (
                    <Box
                      component="button"
                      type="button"
                      key={service.id}
                      aria-pressed={selected}
                      onClick={() => onSelectService(service.id)}
                      sx={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 1,
                        textAlign: 'left',
                        padding: '8px 12px',
                        border: 'none',
                        borderLeft: `3px solid ${selected ? meta.color : 'transparent'}`,
                        backgroundColor: selected ? alpha(meta.color, 0.09) : tokens.ink.sunken,
                        color: 'inherit',
                        cursor: 'pointer',
                        font: 'inherit',
                        '&:hover': { backgroundColor: alpha(meta.color, 0.06) },
                      }}
                    >
                      <Box sx={{ display: 'inline-flex', color: meta.color, mt: '2px', flexShrink: 0 }}>
                        <Icon size={14} strokeWidth={2.4} aria-hidden={true} />
                      </Box>
                      <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, flexWrap: 'wrap' }}>
                          <Box className="mono" sx={{ fontSize: '0.8125rem', color: tokens.text.hi }}>
                            {service.name}
                          </Box>
                          {service.openIncidents > 0 ? (
                            <Box className="mono" sx={{ fontSize: '0.625rem', color: meta.color }}>
                              {service.openIncidents} open
                            </Box>
                          ) : null}
                        </Box>
                        <Box sx={{ fontSize: '0.6875rem', color: service.status === 'green' ? tokens.text.faint : tokens.text.low, lineHeight: 1.45, mt: 0.125 }}>
                          {service.status === 'green' ? service.description : service.impactDescription}
                        </Box>
                      </Box>
                      {service.latencyMs !== null ? (
                        <Box className="mono" sx={{ fontSize: '0.625rem', color: tokens.text.low, whiteSpace: 'nowrap', mt: '2px' }}>
                          {service.latencyMs}ms
                        </Box>
                      ) : null}
                    </Box>
                  );
                })}
              </Box>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
}
