import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import { alpha } from '@mui/material/styles';
import type { ReactNode } from 'react';
import { CalendarRange, Cloud, Globe2, LayoutGrid, RotateCcw } from 'lucide-react';
import type { ApplicationId, CloudId, DateRangeId, RegionSessionRow, ScopeMeta } from '../../types/dashboard';
import { APPLICATION_OPTIONS, RANGE_OPTIONS } from '../../data/scopes';
import { tokens } from '../../theme/tokens';
import { MicroLabel } from '../common/atoms';

function FieldGroup({ label, icon, children }: { label: string; icon: ReactNode; children: ReactNode }): ReactNode {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
      <MicroLabel sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, color: tokens.text.faint }}>
        {icon}
        {label}
      </MicroLabel>
      {/* Controls never shrink: the bar wraps to a second line instead of
          clipping button labels at 1366px. */}
      <Box sx={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>{children}</Box>
    </Box>
  );
}

export interface FilterBarProps {
  application: ApplicationId;
  onApplicationChange: (id: ApplicationId) => void;
  range: DateRangeId;
  onRangeChange: (range: DateRangeId) => void;
  scope: ScopeMeta;
  cloud: CloudId;
  onCloudChange: (cloud: CloudId) => void;
  regionId: string;
  onRegionChange: (regionId: string) => void;
  regions: RegionSessionRow[];
  summary: string;
  isDefault: boolean;
  onReset: () => void;
  busy: boolean;
}

/**
 * Scope controls for the whole console.
 *
 * The application selector replaces the source console's permanent sidebar, the
 * range control replaces its per-widget date pickers, and the cloud/region
 * controls mirror the Citrix AWS and Azure tabs.
 */
export function FilterBar({
  application,
  onApplicationChange,
  range,
  onRangeChange,
  scope,
  cloud,
  onCloudChange,
  regionId,
  onRegionChange,
  regions,
  summary,
  isDefault,
  onReset,
  busy,
}: FilterBarProps): ReactNode {
  const cloudRegions = regions.filter((row) => row.cloud === cloud);

  return (
    <Box
      component="section"
      aria-label="Dashboard filters"
      sx={{
        display: 'flex',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '10px 20px',
        padding: '10px 20px',
        borderBottom: `1px solid ${tokens.ink.line}`,
        backgroundColor: alpha(tokens.ink.sunken, 0.72),
      }}
    >
      <FieldGroup label="Application" icon={<LayoutGrid size={12} strokeWidth={2.4} aria-hidden={true} />}>
        <Select
          size="small"
          value={application}
          onChange={(event) => onApplicationChange(event.target.value as ApplicationId)}
          inputProps={{ 'aria-label': 'Application scope' }}
          renderValue={(value) => APPLICATION_OPTIONS.find((option) => option.id === value)?.label ?? 'Application'}
          sx={{ minWidth: 190, '& .MuiSelect-select': { py: '5px' } }}
        >
          {APPLICATION_OPTIONS.map((option) => (
            <MenuItem key={option.id} value={option.id} sx={{ display: 'block' }}>
              <Box sx={{ fontSize: '0.8125rem', color: tokens.text.hi }}>{option.label}</Box>
              <Box sx={{ fontSize: '0.6875rem', color: tokens.text.low }}>{option.caption}</Box>
            </MenuItem>
          ))}
        </Select>
      </FieldGroup>

      <FieldGroup label="Window" icon={<CalendarRange size={12} strokeWidth={2.4} aria-hidden={true} />}>
        <ToggleButtonGroup
          exclusive
          size="small"
          value={range}
          onChange={(_event, next: DateRangeId | null) => next && onRangeChange(next)}
          aria-label="Date range"
        >
          {RANGE_OPTIONS.map((option) => (
            <ToggleButton key={option.id} value={option.id} title={option.caption}>
              {option.label}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      </FieldGroup>

      {scope.showCloudControls ? (
        <>
          <Divider orientation="vertical" flexItem sx={{ my: 0.5 }} />
          <FieldGroup label="Cloud" icon={<Cloud size={12} strokeWidth={2.4} aria-hidden={true} />}>
            <ToggleButtonGroup
              exclusive
              size="small"
              value={cloud}
              onChange={(_event, next: CloudId | null) => next && onCloudChange(next)}
              aria-label="Cloud platform"
            >
              <ToggleButton value="aws">AWS</ToggleButton>
              <ToggleButton value="azure">Azure</ToggleButton>
            </ToggleButtonGroup>
          </FieldGroup>
          <FieldGroup label="Region" icon={<Globe2 size={12} strokeWidth={2.4} aria-hidden={true} />}>
            <ToggleButtonGroup
              exclusive
              size="small"
              value={regionId}
              onChange={(_event, next: string | null) => next && onRegionChange(next)}
              aria-label="Cloud region"
            >
              {cloudRegions.map((row) => (
                <ToggleButton key={row.id} value={row.id} title={`${row.region} · ${row.current} sessions`}>
                  {row.region.replace(/^Azure /, '')}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
          </FieldGroup>
        </>
      ) : null}

      <Box sx={{ flex: 1, minWidth: 8 }} />

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <MicroLabel sx={{ color: busy ? tokens.brand.ice : tokens.text.faint }}>{busy ? 'Loading scope…' : summary}</MicroLabel>
        {isDefault ? null : (
          <Button
            size="small"
            onClick={onReset}
            startIcon={<RotateCcw size={13} strokeWidth={2.4} aria-hidden={true} />}
            sx={{ color: tokens.text.low, '&:hover': { color: tokens.text.hi } }}
          >
            Reset
          </Button>
        )}
      </Box>
    </Box>
  );
}
