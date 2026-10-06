import Box from '@mui/material/Box';
import Skeleton from '@mui/material/Skeleton';
import type { ReactNode } from 'react';
import { tokens } from '../../theme/tokens';

/** Skeleton row set sized like the real table so the layout does not jump. */
export function SkeletonRows({ rows = 6, columns = 5 }: { rows?: number; columns?: number }): ReactNode {
  return (
    <Box sx={{ display: 'grid', gap: '1px', backgroundColor: tokens.ink.line, border: `1px solid ${tokens.ink.line}` }}>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <Box
          key={rowIndex}
          sx={{
            display: 'grid',
            gridTemplateColumns: `1.6fr repeat(${columns - 1}, 1fr)`,
            gap: 1.5,
            alignItems: 'center',
            padding: '11px 14px',
            backgroundColor: tokens.ink.panel,
          }}
        >
          {Array.from({ length: columns }).map((__, columnIndex) => (
            <Skeleton
              key={columnIndex}
              variant="text"
              width={columnIndex === 0 ? '72%' : '56%'}
              height={14}
              sx={{ backgroundColor: 'rgba(140,175,210,0.10)' }}
            />
          ))}
        </Box>
      ))}
    </Box>
  );
}

export function KpiSkeletonRow({ count = 5 }: { count?: number }): ReactNode {
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: `repeat(auto-fit, minmax(196px, 1fr))`, gap: 1.5 }}>
      {Array.from({ length: count }).map((_, index) => (
        <Box
          key={index}
          className="chamfer"
          sx={{
            display: 'grid',
            gap: 1.25,
            padding: '12px 14px',
            minHeight: 118,
            backgroundColor: tokens.ink.panel,
            border: `1px solid ${tokens.ink.line}`,
          }}
        >
          <Skeleton variant="text" width="52%" height={11} />
          <Skeleton variant="text" width="38%" height={30} />
          <Skeleton variant="text" width="72%" height={12} />
          <Skeleton variant="rectangular" height={22} />
        </Box>
      ))}
    </Box>
  );
}

export function ChartSkeleton(): ReactNode {
  return (
    <Box sx={{ display: 'grid', gap: 1, alignItems: 'end', gridTemplateColumns: 'repeat(24, 1fr)', height: 236, padding: '8px 4px' }}>
      {Array.from({ length: 24 }).map((_, index) => (
        <Skeleton
          key={index}
          variant="rectangular"
          height={`${28 + Math.round(52 * Math.abs(Math.sin(index / 2.1)))}%`}
          sx={{ backgroundColor: 'rgba(140,175,210,0.08)' }}
        />
      ))}
    </Box>
  );
}
