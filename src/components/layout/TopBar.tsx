import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Tooltip from '@mui/material/Tooltip';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import { alpha } from '@mui/material/styles';
import { useState, type ReactNode } from 'react';
import { ChevronDown, RefreshCw, SlidersHorizontal } from 'lucide-react';
import synchronyLockup from '../../assets/synchrony-lockup.png';
import type { DataScenario, SnapshotPhase, StatusLevel } from '../../types/dashboard';
import type { LucideIcon } from 'lucide-react';
import { AlertTriangle, CheckCircle2, CircleDashed, Minus, ShieldAlert } from 'lucide-react';
import { tokens } from '../../theme/tokens';
import { STATUS_META } from '../../lib/status';
import { formatDurationSince } from '../../lib/format';
import { useNow } from '../../hooks/useNow';
import { MicroLabel } from '../common/atoms';

const OVERALL_ICON: Record<StatusLevel, LucideIcon> = {
  nominal: CheckCircle2,
  watch: CircleDashed,
  warning: AlertTriangle,
  critical: ShieldAlert,
  idle: Minus,
  unknown: Minus,
};

interface ScenarioOption {
  id: DataScenario;
  label: string;
  caption: string;
  tone: StatusLevel;
}

const SCENARIO_OPTIONS: ScenarioOption[] = [
  { id: 'live', label: 'Live telemetry', caption: 'Derived from the current dataset', tone: 'nominal' },
  { id: 'loading', label: 'Loading', caption: 'Holds skeletons open indefinitely', tone: 'watch' },
  { id: 'empty', label: 'Empty window', caption: 'Collector returns no rows', tone: 'idle' },
  { id: 'error', label: 'Gateway failure', caption: 'HTTP 503 after retries', tone: 'critical' },
  { id: 'warning', label: 'Degraded', caption: 'Queues below the SLA target', tone: 'warning' },
  { id: 'critical', label: 'Critical', caption: 'SLA breach and error spike', tone: 'critical' },
];

export type AppView = 'health' | 'telemetry';

export interface TopBarProps {
  phase: SnapshotPhase;
  windowLabel: string | null;
  loadedAtIso: string | null;
  scenario: DataScenario;
  onScenarioChange: (scenario: DataScenario) => void;
  onReload: () => void;
  overall: { severity: StatusLevel; label: string; detail: string };
  view: AppView;
  onViewChange: (view: AppView) => void;
}

/**
 * Compact command header: Synchrony identity, the Health / Telemetry view
 * switcher, and — on the telemetry view only — the operational verdict, data
 * window, refresh and demo state selector.
 */
export function TopBar({
  phase,
  windowLabel,
  loadedAtIso,
  scenario,
  onScenarioChange,
  onReload,
  overall,
  view,
  onViewChange,
}: TopBarProps): ReactNode {
  const now = useNow(1000);
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const active = SCENARIO_OPTIONS.find((option) => option.id === scenario) ?? SCENARIO_OPTIONS[0];
  const OverallIcon = OVERALL_ICON[overall.severity];
  const overallColor = STATUS_META[overall.severity].color;
  const updated = loadedAtIso ? formatDurationSince(loadedAtIso, now.toISOString()) : 'never';

  return (
    <Box
      component="header"
      sx={{
        position: 'sticky',
        top: 0,
        zIndex: 1200,
        display: 'flex',
        alignItems: 'center',
        gap: { xs: 1, md: 2 },
        minHeight: 54,
        paddingInline: { xs: 1.5, md: 2.5 },
        borderBottom: `1px solid ${tokens.ink.line}`,
        backgroundColor: alpha(tokens.ink.base, 0.88),
        backdropFilter: 'blur(12px)',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            borderRadius: tokens.radius.sm,
            overflow: 'hidden',
            border: `1px solid ${alpha(tokens.brand.gold, 0.35)}`,
            backgroundColor: '#FFFFFF',
            flexShrink: 0,
          }}
        >
          <Box component="img" src={synchronyLockup} alt="Synchrony" sx={{ height: 26, width: 'auto', display: 'block' }} />
        </Box>
        <Box sx={{ width: 1, alignSelf: 'stretch', backgroundColor: tokens.ink.lineStrong, display: { xs: 'none', sm: 'block' } }} />
        <Box sx={{ minWidth: 0 }}>
          <Box
            component="h1"
            sx={{
              m: 0,
              fontFamily: tokens.font.display,
              fontSize: '1.0625rem',
              fontWeight: 700,
              letterSpacing: '0.02em',
              lineHeight: 1.1,
              color: tokens.text.hi,
            }}
          >
            SynTinel
            <Box component="span" sx={{ color: tokens.text.low, fontWeight: 500, fontSize: '0.75rem', ml: 1 }}>
              Operations Console
            </Box>
          </Box>
          <Box className="micro" sx={{ color: tokens.text.faint, display: { xs: 'none', sm: 'block' } }}>
            Technology Operations Centre
          </Box>
        </Box>
        <Box
          component="span"
          className="mono"
          sx={{
            display: { xs: 'none', lg: 'inline-block' },
            fontSize: '0.625rem',
            letterSpacing: '0.12em',
            color: tokens.text.low,
            border: `1px solid ${tokens.ink.lineStrong}`,
            borderRadius: tokens.radius.sm,
            padding: '2px 6px',
            ml: 0.5,
          }}
        >
          APP.DEV1
        </Box>
      </Box>

      <ToggleButtonGroup
        exclusive
        size="small"
        value={view}
        onChange={(_event, next: AppView | null) => next && onViewChange(next)}
        aria-label="Console view"
        sx={{ ml: { xs: 0, md: 0.5 } }}
      >
        <ToggleButton value="health">Health</ToggleButton>
        <ToggleButton value="telemetry">Telemetry</ToggleButton>
      </ToggleButtonGroup>

      <Box sx={{ flex: 1 }} />

      {view === 'telemetry' ? (
        <>
          <Box
            sx={{
              display: { xs: 'none', md: 'flex' },
              alignItems: 'center',
              gap: 1,
              paddingInline: 1.25,
              paddingBlock: 0.5,
              border: `1px solid ${alpha(overallColor, 0.34)}`,
              backgroundColor: alpha(overallColor, 0.08),
              borderRadius: tokens.radius.sm,
              minWidth: 0,
            }}
          >
            <Box sx={{ color: overallColor, display: 'flex' }} className={phase === 'refreshing' ? 'live-dot' : undefined}>
              <OverallIcon size={15} strokeWidth={2.4} aria-hidden={true} />
            </Box>
            <MicroLabel sx={{ color: overallColor }}>{overall.label}</MicroLabel>
            <Box sx={{ color: tokens.text.low, fontSize: '0.6875rem' }}>{overall.detail}</Box>
          </Box>

          <Box sx={{ display: { xs: 'none', xl: 'flex' }, flexDirection: 'column', alignItems: 'flex-end', lineHeight: 1.3 }}>
            <MicroLabel>{windowLabel ?? 'No window'}</MicroLabel>
            <Box className="mono" sx={{ fontSize: '0.6875rem', color: phase === 'error' ? tokens.status.critical : tokens.text.low }}>
              {phase === 'refreshing' ? 'Refreshing…' : `Updated ${updated}`}
            </Box>
          </Box>

          <Tooltip title="Reload telemetry">
            <span>
              <IconButton
                size="small"
                onClick={onReload}
                disabled={phase === 'loading'}
                aria-label="Reload telemetry"
                sx={{
                  border: `1px solid ${tokens.ink.line}`,
                  animation: phase === 'refreshing' ? 'spin 1.1s linear infinite' : 'none',
                }}
              >
                <RefreshCw size={15} strokeWidth={2.4} aria-hidden={true} />
              </IconButton>
            </span>
          </Tooltip>

          <Box
            component="button"
            type="button"
            onClick={(event) => setAnchor(event.currentTarget)}
            aria-haspopup="menu"
            aria-expanded={Boolean(anchor)}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.75,
              padding: '5px 9px',
              borderRadius: tokens.radius.sm,
              border: `1px solid ${tokens.ink.lineStrong}`,
              backgroundColor: 'transparent',
              color: tokens.text.mid,
              cursor: 'pointer',
              font: 'inherit',
              '&:hover': { borderColor: alpha(tokens.brand.gold, 0.5), color: tokens.text.hi },
            }}
          >
            <SlidersHorizontal size={14} strokeWidth={2.3} aria-hidden={true} />
            <MicroLabel sx={{ color: 'inherit' }}>State</MicroLabel>
            <Box
              component="span"
              sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, color: STATUS_META[active.tone].color, fontSize: '0.6875rem' }}
            >
              <Box sx={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: 'currentColor' }} />
              {active.label}
            </Box>
            <ChevronDown size={13} strokeWidth={2.4} aria-hidden={true} />
          </Box>
        </>
      ) : null}

      <Menu
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{ paper: { sx: { minWidth: 268, border: `1px solid ${tokens.ink.lineStrong}`, mt: 0.5 } } }}
      >
        <Box sx={{ px: 1.5, pt: 1, pb: 0.5 }}>
          <MicroLabel>Data state (demo + QA)</MicroLabel>
        </Box>
        {SCENARIO_OPTIONS.map((option) => (
          <MenuItem
            key={option.id}
            selected={option.id === scenario}
            onClick={() => {
              onScenarioChange(option.id);
              setAnchor(null);
            }}
            sx={{ display: 'flex', gap: 1, alignItems: 'flex-start', py: 0.75 }}
          >
            <Box sx={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: STATUS_META[option.tone].color, mt: '6px', flexShrink: 0 }} />
            <Box sx={{ minWidth: 0 }}>
              <Box sx={{ fontSize: '0.8125rem', color: tokens.text.hi }}>{option.label}</Box>
              <Box sx={{ fontSize: '0.6875rem', color: tokens.text.low }}>{option.caption}</Box>
            </Box>
          </MenuItem>
        ))}
      </Menu>
    </Box>
  );
}
