/**
 * Design tokens for the SynTinel Operations Console.
 *
 * Single source of truth for colour, type and spacing. The MUI theme and the
 * injected CSS custom properties are both derived from this object, so a token
 * change propagates to MUI components, hand-written CSS and Recharts series.
 */

export const tokens = {
  ink: {
    /** Page base - deepest surface. */
    base: '#05070A',
    /** Recessed wells: table bodies, inputs. */
    sunken: '#080B11',
    /** Standard panel surface. */
    panel: '#0C1219',
    /** Raised elements inside a panel. */
    raised: '#111823',
    /** Hover / active row. */
    hover: '#161F2B',
    line: '#1B2532',
    lineStrong: '#28353F',
  },
  text: {
    hi: '#E9F0F8',
    mid: '#A6B7C9',
    low: '#8799AD',
    /** Decorative only - never used for text that carries meaning. */
    faint: '#5F7185',
  },
  brand: {
    ice: '#5AD1FF',
    iceDim: '#2E7FA6',
    teal: '#37D6A0',
    /** Synchrony brand gold — the primary executive accent. */
    gold: '#F5C518',
    goldDim: '#B28E0B',
  },
  status: {
    nominal: '#37D6A0',
    watch: '#8FB6D9',
    warning: '#F2B441',
    critical: '#FF5C6C',
    idle: '#66788C',
    unknown: '#66788C',
  },
  chart: {
    series1: '#5AD1FF',
    series2: '#37D6A0',
    series3: '#F2B441',
    series4: '#FF5C6C',
    series5: '#93A6BB',
    grid: 'rgba(140, 175, 210, 0.10)',
    axis: '#7A8DA3',
  },
  font: {
    display: "'Saira Variable', 'Saira', 'Segoe UI', sans-serif",
    body: "'IBM Plex Sans', 'Segoe UI', system-ui, sans-serif",
    mono: "'IBM Plex Mono', ui-monospace, 'SFMono-Regular', Menlo, monospace",
  },
  radius: {
    sm: 3,
    md: 5,
    lg: 8,
  },
  /** Chamfer applied to the top-right corner of every panel. */
  chamfer: '10px',
} as const;

export type Tokens = typeof tokens;
