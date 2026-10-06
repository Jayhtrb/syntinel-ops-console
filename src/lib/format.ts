/** Numeric / temporal formatting helpers. Pure functions, no React. */

const integerFormatter = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });

export function formatInteger(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  return integerFormatter.format(Math.round(value));
}

/** Throughput values are frequently in the hundreds of thousands. */
export function formatCompact(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
  if (Math.abs(value) >= 10_000) return `${(value / 1_000).toFixed(1)}k`;
  return integerFormatter.format(Math.round(value));
}

/** `0.000` style precision, as used by the source MW Services view. */
export function formatRatio(value: number | null | undefined, digits = 3): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  return value.toFixed(digits);
}

export function formatPercent(value: number | null | undefined, digits = 1): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  return `${value.toFixed(digits)}%`;
}

export function formatSignedPercent(value: number, digits = 1): string {
  const sign = value > 0 ? '+' : value < 0 ? '−' : '±';
  return `${sign}${Math.abs(value).toFixed(digits)}%`;
}

/** `6:52` - average handle time, seconds to minutes:seconds. */
export function formatAht(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined || Number.isNaN(seconds)) return '—';
  const total = Math.round(seconds);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/** Signed percent deviation of an actual/forecast ratio, e.g. `+12.4%`. */
export function formatForecastDeviation(ratio: number | null | undefined, digits = 1): string {
  if (ratio === null || ratio === undefined || Number.isNaN(ratio)) return '—';
  return formatSignedPercent((ratio - 1) * 100, digits);
}

export function formatSignedInteger(value: number): string {
  const sign = value > 0 ? '+' : value < 0 ? '−' : '±';
  return `${sign}${formatInteger(Math.abs(value))}`;
}

/** `13:05` - used inside axis ticks and tooltip headers. */
export function formatClock(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** `05 Oct 13:05` - used for "last updated" captions. */
export function formatStamp(iso: string): string {
  const d = new Date(iso);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${String(d.getDate()).padStart(2, '0')} ${months[d.getMonth()]} ${formatClock(iso)}`;
}

export function formatDurationSince(fromIso: string, toIso: string): string {
  const ms = Math.max(0, new Date(toIso).getTime() - new Date(fromIso).getTime());
  const minutes = Math.floor(ms / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ${minutes % 60}m ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

/** Clamps a value into a percentage suitable for a meter bar width. */
export function toMeterPercent(value: number | null, max: number): number {
  if (value === null || max <= 0) return 0;
  return Math.min(100, Math.max(0, (value / max) * 100));
}
