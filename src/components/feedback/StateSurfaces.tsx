import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import { alpha } from '@mui/material/styles';
import type { ReactNode } from 'react';
import { CircleSlash, Inbox, RefreshCw, ShieldAlert, type LucideIcon } from 'lucide-react';
import { tokens } from '../../theme/tokens';

interface StateShellProps {
  icon: LucideIcon;
  tone: string;
  title: string;
  message: string;
  action?: ReactNode;
  hint?: string;
  testId?: string;
}

function StateShell({ icon: Icon, tone, title, message, action, hint, testId }: StateShellProps): ReactNode {
  return (
    <Box
      data-testid={testId}
      sx={{
        display: 'grid',
        justifyItems: 'center',
        textAlign: 'center',
        gap: 1,
        padding: '34px 20px',
        border: `1px dashed ${alpha(tone, 0.34)}`,
        backgroundColor: alpha(tone, 0.045),
      }}
    >
      <Box
        sx={{
          display: 'grid',
          placeItems: 'center',
          width: 38,
          height: 38,
          borderRadius: '50%',
          border: `1px solid ${alpha(tone, 0.4)}`,
          color: tone,
          mb: 0.5,
        }}
      >
        <Icon size={18} strokeWidth={2.2} aria-hidden={true} />
      </Box>
      <Box component="h3" sx={{ m: 0, fontSize: '0.9375rem', fontFamily: tokens.font.display, color: tokens.text.hi }}>
        {title}
      </Box>
      <Box sx={{ color: tokens.text.mid, fontSize: '0.8125rem', maxWidth: '62ch', lineHeight: 1.6 }}>{message}</Box>
      {hint ? (
        <Box className="micro" sx={{ color: tokens.text.faint, mt: 0.25 }}>
          {hint}
        </Box>
      ) : null}
      {action ? <Box sx={{ mt: 1.25 }}>{action}</Box> : null}
    </Box>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }): ReactNode {
  return (
    <StateShell
      testId="error-state"
      icon={ShieldAlert}
      tone={tokens.status.critical}
      title="Telemetry unavailable"
      message={message}
      hint="No stale figures are shown, because a frozen SLA reading is worse than none."
      action={
        <Button
          variant="outlined"
          size="small"
          onClick={onRetry}
          startIcon={<RefreshCw size={14} strokeWidth={2.4} aria-hidden={true} />}
          sx={{ color: tokens.status.critical, borderColor: alpha(tokens.status.critical, 0.5) }}
        >
          Retry telemetry load
        </Button>
      }
    />
  );
}

export function EmptyState({
  title,
  message,
  hint,
  action,
  tone = tokens.status.idle,
}: {
  title: string;
  message: string;
  hint?: string;
  action?: ReactNode;
  tone?: string;
}): ReactNode {
  return <StateShell testId="empty-state" icon={Inbox} tone={tone} title={title} message={message} hint={hint} action={action} />;
}

export function NotCollectedState({ message }: { message: string }): ReactNode {
  return (
    <StateShell
      testId="not-collected-state"
      icon={CircleSlash}
      tone={tokens.status.watch}
      title="Not collected for this scope"
      message={message}
      hint="Switch the application filter to All applications to see this panel populated."
    />
  );
}
