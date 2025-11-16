import type { ReactNode } from 'react';
import type { SxProps, Theme } from '@mui/material/styles';

import Grid from '@mui/material/Grid';
import { useTheme } from '@mui/material/styles';

import { GoogleMetricsWidgetSummary } from '../../google/google-metrics-overview';

// ----------------------------------------------------------------------

export interface StatCard {
  title: string;
  total: string;
  subtitle?: string;
  icon: ReactNode;
  color: 'primary' | 'secondary' | 'info' | 'success' | 'warning' | 'error';
  percent?: number;
  chart?: {
    categories: string[];
    series: Array<{ data: number[] }>;
  };
  showProgress?: boolean;
  progressValue?: number;
}

export type TProps = {
  stats: StatCard[];
  sx?: SxProps<Theme>;
};

/**
 * Dumb component for displaying TripAdvisor review statistics
 * Only receives primitive data and displays it
 */
export function TripAdvisorReviewsStats({ 
  stats,
  sx,
}: TProps): JSX.Element {
  const theme = useTheme();

  return (
    <Grid container spacing={3} sx={{ mb: 3, ...sx }}>
      {stats.map((stat) => (
        <Grid key={stat.title} size={{ xs: 12, sm: 6, md: 3 }}>
          <GoogleMetricsWidgetSummary
            title={stat.title}
            total={stat.total}
            subtitle={stat.subtitle}
            icon={stat.icon}
            color={stat.color}
            percent={stat.percent}
            chart={stat.chart}
            showProgress={stat.showProgress}
            progressValue={stat.progressValue}
            sx={{
              height: '100%',
              transition: 'all 0.3s ease-in-out',
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: theme.shadows[8],
              },
            }}
          />
        </Grid>
      ))}
    </Grid>
  );
}
