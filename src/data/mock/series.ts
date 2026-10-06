import type { SeriesPoint } from '../../types/dashboard';

/**
 * Deterministic time-series generation for the mock telemetry layer.
 *
 * Every series is a pure function of its bucket list and seed, so a refresh
 * produces byte-identical data for the same query. No `Math.random` anywhere -
 * that keeps charts stable across re-renders and makes snapshots testable.
 */

/** Anchored "now" for the mock dataset: the clock in the source capture. */
export const MOCK_NOW_ISO = '2026-10-05T07:17:00';
/** Charts are bucketed on the hour so axis labels stay clean. */
export const MOCK_ANCHOR_ISO = '2026-10-05T07:00:00';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export interface Bucket {
  t: string;
  label: string;
  /** Hours since local midnight, fractional. */
  hoursOfDay: number;
  /** Days since the first bucket. */
  dayIndex: number;
}

export type BucketLabelStyle = 'clock' | 'dayClock' | 'day';

/** Deterministic PRNG (mulberry32). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Builds `count` buckets ending at the anchor instant, walking backwards by
 * `stepMinutes`. The first bucket defines day 0.
 */
export function buildBuckets(count: number, stepMinutes: number, style: BucketLabelStyle): Bucket[] {
  const anchor = new Date(MOCK_ANCHOR_ISO);
  const stepMs = stepMinutes * 60_000;
  const raw: Array<{ d: Date }> = [];
  for (let i = count - 1; i >= 0; i -= 1) {
    raw.push({ d: new Date(anchor.getTime() - i * stepMs) });
  }
  const firstDay = new Date(raw[0].d.getFullYear(), raw[0].d.getMonth(), raw[0].d.getDate()).getTime();

  return raw.map(({ d }) => {
    const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const dayIndex = Math.round((dayStart - firstDay) / 86_400_000);
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    const dayLabel = `${String(d.getDate()).padStart(2, '0')} ${MONTHS[d.getMonth()]}`;
    const label = style === 'clock' ? `${hh}:${mm}` : style === 'day' ? dayLabel : `${dayLabel} ${hh}:${mm}`;
    return {
      t: d.toISOString(),
      label,
      hoursOfDay: d.getHours() + d.getMinutes() / 60,
      dayIndex,
    };
  });
}

export interface WaveOptions {
  seed: number;
  /** Mid-line of the wave. */
  base: number;
  /** Half-amplitude of the daily cycle. */
  amplitude: number;
  /** Cycle length in hours: 24 = one peak per day, 12 = two peaks per day. */
  periodHours?: number;
  /** Hour of day at which the cycle peaks. */
  peakHour?: number;
  /** Peak-to-peak random jitter. */
  noise?: number;
  floor?: number;
  ceiling?: number;
  /** Additive drift applied per bucket, from first to last. */
  drift?: number;
  /** Force the final bucket to this value. */
  pinLast?: number;
  /** How many trailing buckets ease into `pinLast`. */
  pinSpan?: number;
  decimals?: number;
  /** Variation of peak height between days (0 = identical days). */
  daySkew?: number;
}

/**
 * A daily-cycle wave with per-day peak variation, optional linear drift and an
 * optional pinned final value so the series agrees with the headline metric.
 */
export function buildWave(buckets: Bucket[], options: WaveOptions): number[] {
  const {
    seed,
    base,
    amplitude,
    periodHours = 24,
    peakHour = 12,
    noise = 0,
    floor = Number.NEGATIVE_INFINITY,
    ceiling = Number.POSITIVE_INFINITY,
    drift = 0,
    pinLast,
    pinSpan = 3,
    decimals = 0,
    daySkew = 0.28,
  } = options;

  const rand = mulberry32(seed);

  const values = buckets.map((bucket, index) => {
    const phase = ((bucket.hoursOfDay - peakHour) / periodHours) * Math.PI * 2;
    const cycle = (Math.cos(phase) + 1) / 2;
    const dayWeight = 1 - daySkew / 2 + (daySkew / 2) * (0.5 + 0.5 * Math.sin(bucket.dayIndex * 1.1 + seed * 0.01));
    const jitter = noise > 0 ? (rand() - 0.5) * noise : 0;
    const value = base + amplitude * cycle * dayWeight + jitter + drift * index;
    return Math.min(ceiling, Math.max(floor, value));
  });

  if (pinLast !== undefined && values.length > 0) {
    const span = Math.min(pinSpan, values.length);
    const startIndex = values.length - span;
    const origin = values[startIndex];
    for (let i = 0; i < span; i += 1) {
      const k = span === 1 ? 1 : i / (span - 1);
      values[startIndex + i] = origin + (pinLast - origin) * k;
    }
  }

  const factor = 10 ** decimals;
  return values.map((v) => Math.round(v * factor) / factor);
}

/** Pairs buckets with one or two metric arrays. Arrays must be the same length. */
export function zipPoints(buckets: Bucket[], value: number[], compare?: number[]): SeriesPoint[] {
  return buckets.map((bucket, index) => {
    const point: SeriesPoint = { t: bucket.t, label: bucket.label, value: value[index] ?? 0 };
    if (compare) point.compare = compare[index] ?? 0;
    return point;
  });
}

/** Smooth min/max/avg helpers used by the region table and KPI captions. */
export function summarise(values: number[]): { min: number; max: number; average: number } {
  if (values.length === 0) return { min: 0, max: 0, average: 0 };
  let min = values[0];
  let max = values[0];
  let total = 0;
  for (const v of values) {
    if (v < min) min = v;
    if (v > max) max = v;
    total += v;
  }
  return { min, max, average: total / values.length };
}
