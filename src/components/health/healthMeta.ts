import { AlertTriangle, CheckCircle2, ShieldAlert, type LucideIcon } from 'lucide-react';
import { tokens } from '../../theme/tokens';
import type { HealthStatus } from '../../types/portfolio';

export interface HealthMeta {
  label: string;
  color: string;
  icon: LucideIcon;
  rank: number;
}

/** Red / amber / green vocabulary for the portfolio health map. */
export const HEALTH_META: Record<HealthStatus, HealthMeta> = {
  green: { label: 'Healthy', color: tokens.status.nominal, icon: CheckCircle2, rank: 0 },
  amber: { label: 'Degraded', color: tokens.status.warning, icon: AlertTriangle, rank: 1 },
  red: { label: 'Critical', color: tokens.status.critical, icon: ShieldAlert, rank: 2 },
};
