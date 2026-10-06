import { createTheme, alpha } from '@mui/material/styles';
import { tokens } from './tokens';

const t = tokens;

/**
 * Dark-first executive operations theme.
 *
 * Typography pairing: Saira (condensed grotesque) for display and panel titles,
 * IBM Plex Sans for prose, IBM Plex Mono for every numeral so metrics stay in
 * column across rows and viewports.
 */
export const theme = createTheme({
  cssVariables: false,
  palette: {
    mode: 'dark',
    primary: { main: t.brand.gold, dark: t.brand.goldDim, contrastText: '#1F1800' },
    secondary: { main: t.brand.teal, contrastText: '#04241B' },
    success: { main: t.status.nominal },
    warning: { main: t.status.warning },
    error: { main: t.status.critical },
    info: { main: t.status.watch },
    background: { default: t.ink.base, paper: t.ink.panel },
    text: { primary: t.text.hi, secondary: t.text.mid, disabled: t.text.faint },
    divider: t.ink.line,
  },
  shape: { borderRadius: t.radius.md },
  typography: {
    fontFamily: t.font.body,
    h1: { fontFamily: t.font.display, fontSize: '1.5rem', fontWeight: 600, letterSpacing: '-0.01em' },
    h2: { fontFamily: t.font.display, fontSize: '1.125rem', fontWeight: 600, letterSpacing: '0' },
    h3: { fontFamily: t.font.display, fontSize: '0.9375rem', fontWeight: 600 },
    h4: { fontFamily: t.font.display, fontSize: '0.8125rem', fontWeight: 600 },
    body1: { fontSize: '0.875rem' },
    body2: { fontSize: '0.8125rem' },
    caption: { fontSize: '0.6875rem' },
    button: { textTransform: 'none', fontWeight: 600, letterSpacing: '0.01em' },
    overline: {
      fontFamily: t.font.mono,
      fontSize: '0.625rem',
      fontWeight: 500,
      letterSpacing: '0.16em',
      textTransform: 'uppercase',
      lineHeight: 1.6,
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: t.ink.base,
          color: t.text.hi,
          WebkitFontSmoothing: 'antialiased',
          textRendering: 'optimizeLegibility',
        },
        '*:focus-visible': {
          outline: `2px solid ${t.brand.gold}`,
          outlineOffset: '2px',
          borderRadius: '2px',
        },
      },
    },
    MuiPaper: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: t.ink.panel,
          border: `1px solid ${t.ink.line}`,
        },
      },
    },
    MuiDivider: { styleOverrides: { root: { borderColor: t.ink.line } } },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderBottom: `1px solid ${t.ink.line}`,
          padding: '9px 12px',
          fontSize: '0.8125rem',
          color: t.text.mid,
        },
        head: {
          fontFamily: t.font.mono,
          fontSize: '0.625rem',
          fontWeight: 500,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: t.text.low,
          backgroundColor: t.ink.sunken,
          borderBottom: `1px solid ${t.ink.lineStrong}`,
          whiteSpace: 'nowrap',
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          '&:hover': { backgroundColor: alpha(t.brand.ice, 0.045) },
          '&.Mui-selected': {
            backgroundColor: alpha(t.brand.ice, 0.09),
            '&:hover': { backgroundColor: alpha(t.brand.ice, 0.12) },
          },
        },
      },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: { borderRadius: t.radius.sm, paddingInline: 12, fontSize: '0.78125rem' },
        sizeSmall: { paddingInline: 10, paddingBlock: 4, fontSize: '0.75rem' },
        outlined: { borderColor: t.ink.lineStrong },
      },
    },
    MuiIconButton: {
      styleOverrides: { root: { borderRadius: t.radius.sm, color: t.text.low, '&:hover': { color: t.text.hi } } },
    },
    MuiToggleButton: {
      styleOverrides: {
        root: {
          fontFamily: t.font.mono,
          fontSize: '0.625rem',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: t.text.low,
          border: `1px solid ${t.ink.line}`,
          padding: '5px 10px',
          lineHeight: 1.6,
          whiteSpace: 'nowrap',
          backgroundColor: 'transparent',
          '&:hover': { color: t.text.hi, backgroundColor: alpha(t.brand.gold, 0.07) },
          '&.Mui-selected': {
            color: t.brand.gold,
            backgroundColor: alpha(t.brand.gold, 0.14),
            borderColor: alpha(t.brand.gold, 0.42),
            '&:hover': { backgroundColor: alpha(t.brand.gold, 0.2) },
          },
        },
      },
    },
    MuiToggleButtonGroup: { styleOverrides: { grouped: { '&:not(:first-of-type)': { marginLeft: -1 } } } },
    MuiTab: {
      styleOverrides: {
        root: {
          minHeight: 38,
          paddingInline: 14,
          textTransform: 'none',
          fontSize: '0.78125rem',
          fontWeight: 600,
          color: t.text.low,
          minWidth: 0,
          '&.Mui-selected': { color: t.text.hi },
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        root: { minHeight: 38 },
        indicator: { backgroundColor: t.brand.gold, height: 2 },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          backgroundColor: t.ink.sunken,
          fontSize: '0.8125rem',
          '& .MuiOutlinedInput-notchedOutline': { borderColor: t.ink.lineStrong },
          '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: alpha(t.brand.gold, 0.5) },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: t.brand.gold },
        },
        input: { paddingBlock: 8 },
      },
    },
    MuiMenuItem: { styleOverrides: { root: { fontSize: '0.8125rem', minHeight: 34 } } },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: t.ink.raised,
          border: `1px solid ${t.ink.lineStrong}`,
          borderRadius: t.radius.sm,
          fontFamily: t.font.body,
          fontSize: '0.75rem',
          color: t.text.hi,
          padding: '7px 10px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.55)',
        },
        arrow: { color: t.ink.lineStrong },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: { height: 4, borderRadius: 2, backgroundColor: 'rgba(140,175,210,0.12)' },
        bar: { borderRadius: 2 },
      },
    },
    MuiSkeleton: {
      styleOverrides: {
        root: { backgroundColor: 'rgba(140,175,210,0.09)', borderRadius: t.radius.sm },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { height: 22, fontSize: '0.6875rem', borderRadius: t.radius.sm },
        label: { paddingInline: 8 },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: { borderRadius: t.radius.md, fontSize: '0.8125rem', alignItems: 'center' },
        message: { padding: '6px 0' },
      },
    },
    MuiPopover: { styleOverrides: { paper: { backgroundImage: 'none' } } },
    MuiListItemText: { styleOverrides: { primary: { fontSize: '0.8125rem' }, secondary: { fontSize: '0.75rem' } } },
  },
});
