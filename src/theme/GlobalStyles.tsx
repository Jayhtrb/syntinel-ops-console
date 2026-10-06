import GlobalStyles from '@mui/material/GlobalStyles';
import { tokens } from './tokens';

const t = tokens;

/**
 * Global atmosphere + primitive utilities.
 *
 * Everything colour-related is injected from `tokens.ts`; this file owns the
 * page texture (grid + grain + twin glows), scrollbar treatment, motion
 * primitives and the small set of utility classes shared across components.
 */
export function AppGlobalStyles() {
  return (
    <GlobalStyles
      styles={{
        ':root': {
          '--ink-base': t.ink.base,
          '--ink-sunken': t.ink.sunken,
          '--ink-panel': t.ink.panel,
          '--ink-raised': t.ink.raised,
          '--ink-hover': t.ink.hover,
          '--ink-line': t.ink.line,
          '--ink-line-strong': t.ink.lineStrong,
          '--text-hi': t.text.hi,
          '--text-mid': t.text.mid,
          '--text-low': t.text.low,
          '--text-faint': t.text.faint,
          '--brand-ice': t.brand.ice,
          '--brand-gold': t.brand.gold,
          '--status-nominal': t.status.nominal,
          '--status-watch': t.status.watch,
          '--status-warning': t.status.warning,
          '--status-critical': t.status.critical,
          '--status-idle': t.status.idle,
          '--font-display': t.font.display,
          '--font-body': t.font.body,
          '--font-mono': t.font.mono,
          '--shell-max': '1720px',
          colorScheme: 'dark',
        },
        'html, body, #root': { minHeight: '100%' },
        body: {
          backgroundColor: t.ink.base,
          // Layered atmosphere: twin radial glows anchored to the shell corners.
          backgroundImage: [
            `radial-gradient(1100px 620px at 12% -8%, ${'rgba(245,197,24,0.09)'}, transparent 62%)`,
            `radial-gradient(900px 520px at 96% 4%, ${'rgba(90,209,255,0.06)'}, transparent 60%)`,
            `radial-gradient(1200px 800px at 50% 120%, ${'rgba(55,214,160,0.05)'}, transparent 65%)`,
          ].join(','),
          backgroundAttachment: 'fixed',
          backgroundRepeat: 'no-repeat',
        },
        // Instrument grid, masked so it fades out below the fold.
        'body::before': {
          content: '""',
          position: 'fixed',
          inset: 0,
          zIndex: 0,
          pointerEvents: 'none',
          backgroundImage: [
            'linear-gradient(rgba(122,162,200,0.05) 1px, transparent 1px)',
            'linear-gradient(90deg, rgba(122,162,200,0.05) 1px, transparent 1px)',
          ].join(','),
          backgroundSize: '68px 68px, 68px 68px',
          maskImage: 'radial-gradient(130% 95% at 22% 0%, #000 0%, transparent 76%)',
          WebkitMaskImage: 'radial-gradient(130% 95% at 22% 0%, #000 0%, transparent 76%)',
        },
        // Fine grain to stop large dark fields from banding on IPS panels.
        'body::after': {
          content: '""',
          position: 'fixed',
          inset: 0,
          zIndex: 0,
          pointerEvents: 'none',
          opacity: 0.035,
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='180' height='180' filter='url(%23n)'/%3E%3C/svg%3E\")",
        },
        '#root': { position: 'relative', zIndex: 1 },
        '::selection': { backgroundColor: 'rgba(90,209,255,0.28)' },
        '*::-webkit-scrollbar': { width: 10, height: 10 },
        '*::-webkit-scrollbar-track': { background: 'transparent' },
        '*::-webkit-scrollbar-thumb': {
          backgroundColor: 'rgba(140,175,210,0.18)',
          borderRadius: 8,
          border: `2px solid ${t.ink.base}`,
        },
        '*::-webkit-scrollbar-thumb:hover': { backgroundColor: 'rgba(140,175,210,0.3)' },
        'code, kbd, samp': { fontFamily: t.font.mono, fontSize: '0.75rem' },

        '.mono': { fontFamily: t.font.mono, fontVariantNumeric: 'tabular-nums' },
        '.micro': {
          fontFamily: t.font.mono,
          fontSize: '0.625rem',
          fontWeight: 500,
          letterSpacing: '0.15em',
          textTransform: 'uppercase',
          color: t.text.low,
          lineHeight: 1.6,
        },
        '.display': { fontFamily: t.font.display },
        '.sr-only': {
          position: 'absolute',
          width: 1,
          height: 1,
          padding: 0,
          margin: -1,
          overflow: 'hidden',
          clip: 'rect(0, 0, 0, 0)',
          whiteSpace: 'nowrap',
          border: 0,
        },
        '.skip-link': {
          position: 'fixed',
          top: 8,
          left: 8,
          zIndex: 1400,
          transform: 'translateY(-160%)',
          transition: 'transform 140ms ease-out',
          backgroundColor: t.brand.gold,
          color: '#1F1800',
          padding: '8px 14px',
          borderRadius: t.radius.sm,
          fontWeight: 700,
          fontSize: '0.8125rem',
          textDecoration: 'none',
        },
        '.skip-link:focus': { transform: 'translateY(0)' },

        // Motion primitives -------------------------------------------------
        '@keyframes riseIn': {
          from: { opacity: 0, transform: 'translateY(8px)' },
          to: { opacity: 1, transform: 'none' },
        },
        '@keyframes pulseDot': {
          '0%, 100%': { opacity: 1, transform: 'scale(1)' },
          '50%': { opacity: 0.45, transform: 'scale(0.82)' },
        },
        '@keyframes sweep': {
          from: { transform: 'translateX(-100%)' },
          to: { transform: 'translateX(320%)' },
        },
        '@keyframes spin': {
          from: { transform: 'rotate(0deg)' },
          to: { transform: 'rotate(360deg)' },
        },
        '.rise-in': {
          animation: 'riseIn 380ms cubic-bezier(0.22, 0.8, 0.3, 1) both',
        },
        '.live-dot': {
          animation: 'pulseDot 2.4s ease-in-out infinite',
        },
        '.sweep-line::after': {
          content: '""',
          position: 'absolute',
          inset: '0 auto 0 0',
          width: '31%',
          background: `linear-gradient(90deg, transparent, ${'rgba(90,209,255,0.55)'}, transparent)`,
          animation: 'sweep 1.6s linear infinite',
        },
        '.chamfer': {
          clipPath: `polygon(0 0, calc(100% - ${t.chamfer}) 0, 100% ${t.chamfer}, 100% 100%, 0 100%)`,
        },
        '@media (prefers-reduced-motion: reduce)': {
          '*, *::before, *::after': {
            animationDuration: '0.001ms !important',
            animationIterationCount: '1 !important',
            transitionDuration: '0.001ms !important',
            scrollBehavior: 'auto !important',
          },
        },
      }}
    />
  );
}
