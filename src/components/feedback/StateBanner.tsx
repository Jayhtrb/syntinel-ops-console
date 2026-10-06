import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import { alpha } from '@mui/material/styles';
import type { ReactNode } from 'react';
import { AlertTriangle, Info, RefreshCw, ShieldAlert, type LucideIcon } from 'lucide-react';
import type { Notice, NoticeSeverity } from '../../types/dashboard';
import { tokens } from '../../theme/tokens';

const NOTICE_ICON: Record<NoticeSeverity, LucideIcon> = {
  critical: ShieldAlert,
  warning: AlertTriangle,
  info: Info,
};

const NOTICE_COLOR: Record<NoticeSeverity, string> = {
  critical: tokens.status.critical,
  warning: tokens.status.warning,
  info: tokens.status.watch,
};

/**
 * Operational notices derived from the data.
 *
 * Critical notices use `role="alert"` so they interrupt; warnings and info use
 * `role="status"` so they are announced without stealing focus.
 */
export function StateBanner({ notices, onReload }: { notices: Notice[]; onReload?: () => void }): ReactNode {
  if (notices.length === 0) return null;

  return (
    <Box sx={{ display: 'grid', gap: 1 }}>
      {notices.map((notice) => {
        const Icon = NOTICE_ICON[notice.severity];
        const color = NOTICE_COLOR[notice.severity];
        return (
          <Box
            key={notice.id}
            role={notice.severity === 'critical' ? 'alert' : 'status'}
            className="rise-in chamfer"
            sx={{
              position: 'relative',
              display: 'flex',
              alignItems: 'flex-start',
              gap: 1.25,
              padding: '10px 14px 10px 16px',
              border: `1px solid ${alpha(color, 0.36)}`,
              borderLeft: `3px solid ${color}`,
              backgroundColor: alpha(color, 0.07),
            }}
          >
            <Box sx={{ color, mt: '1px', flexShrink: 0 }}>
              <Icon size={16} strokeWidth={2.3} aria-hidden={true} />
            </Box>
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, flexWrap: 'wrap' }}>
                <Box component="strong" sx={{ color: tokens.text.hi, fontSize: '0.8125rem', fontWeight: 600 }}>
                  {notice.title}
                </Box>
                <Box component="span" className="micro" sx={{ color: alpha(color, 0.9) }}>
                  {notice.severity}
                </Box>
              </Box>
              <Box sx={{ color: tokens.text.mid, fontSize: '0.75rem', mt: 0.25, lineHeight: 1.5 }}>{notice.message}</Box>
            </Box>
            {onReload && notice.severity === 'critical' ? (
              <Button
                size="small"
                variant="outlined"
                startIcon={<RefreshCw size={13} strokeWidth={2.4} aria-hidden={true} />}
                onClick={onReload}
                sx={{ color, borderColor: alpha(color, 0.45), flexShrink: 0 }}
              >
                Re-check
              </Button>
            ) : null}
          </Box>
        );
      })}
    </Box>
  );
}
