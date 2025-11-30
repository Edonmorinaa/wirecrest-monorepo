'use client';

import { varAlpha } from 'minimal-shared/utils';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import { useTheme } from '@mui/material/styles';
import LinearProgress from '@mui/material/LinearProgress';

import { fNumber } from 'src/utils/format-number';

import { CONFIG } from 'src/global-config';

import { Iconify } from 'src/components/iconify';
import { SvgColor } from 'src/components/svg-color';
import { Chart, useChart } from 'src/components/chart';

import { InfoBox } from './info-box';

// ----------------------------------------------------------------------

interface TikTokMetricsWidgetProps {
  sx?: any;
  icon: React.ReactNode;
  title: string;
  total: string | number;
  subtitle?: string;
  chart?: {
    series: number[];
    categories?: string[];
    options?: any;
  };
  percent?: number;
  color?: 'primary' | 'secondary' | 'info' | 'success' | 'warning' | 'error';
  showProgress?: boolean;
  progressValue?: number;
  infoDescription?: string;
}

export function TikTokMetricsWidget({
  sx,
  icon,
  title,
  total,
  subtitle,
  chart,
  percent,
  color = 'primary',
  showProgress = false,
  progressValue = 0,
  infoDescription,
  ...other
}: TikTokMetricsWidgetProps) {
  const theme = useTheme();

  const chartColors = [theme.palette[color].dark];

  const chartOptions = useChart({
    chart: { sparkline: { enabled: true } },
    colors: chartColors,
    xaxis: { categories: chart?.categories || [] },
    grid: {
      padding: {
        top: 6,
        left: 6,
        right: 6,
        bottom: 6,
      },
    },
    tooltip: {
      y: { formatter: (value) => fNumber(value), title: { formatter: () => '' } },
    },
    markers: {
      strokeWidth: 0,
    },
    ...(chart?.options || {}),
  });

  return (
    <Card
      sx={[
        () => ({
          p: 2,
          boxShadow: 'none',
          position: 'relative',
          color: `${color}.darker`,
          backgroundColor: 'common.white',
          backgroundImage: `linear-gradient(135deg, ${varAlpha(theme.vars.palette[color].lightChannel, 0.48)}, ${varAlpha(theme.vars.palette[color].lightChannel, 0.48)})`,
        }),
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
      {...other}
    >
      <Box sx={{ width: 48, height: 48, mb: 3 }}>{icon}</Box>

      <Box
        sx={{
          top: 16,
          gap: 0.5,
          right: 16,
          display: 'flex',
          position: 'absolute',
          alignItems: 'center',
        }}
      >
        {percent !== undefined && percent !== 0 && (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
              mr: 1,
            }}
          >
            <Iconify
              width={16}
              height={16}
              className=""
              icon={percent < 0 ? 'eva:trending-down-fill' : 'eva:trending-up-fill'}
              sx={{ color: percent < 0 ? 'error.main' : 'success.main' }}
            />
            <Box
              component="span"
              sx={{
                typography: 'caption',
                color: percent < 0 ? 'error.main' : 'success.main',
                fontWeight: 600,
              }}
            >
              {percent > 0 && '+'}
              {percent}%
            </Box>
          </Box>
        )}
        <Chart
          type="line"
          series={[{ data: chart?.series || [] }]}
          options={chartOptions}
          sx={{ width: 84, height: 76 }}
          className=""
          slotProps={{}}
        />
      </Box>
      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'flex-end',
          justifyContent: 'flex-end',
        }}
      >
        <Box sx={{ flexGrow: 1, minWidth: 112 }}>
          <Box sx={{ mb: 1, typography: 'subtitle2', display: 'flex', alignItems: 'center', gap: 1 }}>
            {title}
            {infoDescription && <InfoBox description={infoDescription} />}
          </Box>

          <Box sx={{ typography: 'h4' }}>{total}</Box>

          {subtitle && (
            <Box sx={{ typography: 'caption', color: 'text.secondary', mt: 0.5 }}>{subtitle}</Box>
          )}

          {showProgress && (
            <Box sx={{ width: '100%', mt: 1 }}>
              <LinearProgress
                variant="determinate"
                value={progressValue}
                sx={{
                  height: 6,
                  borderRadius: 3,
                  bgcolor: theme.palette.grey[200],
                  '& .MuiLinearProgress-bar': {
                    bgcolor: theme.palette[color].main,
                    borderRadius: 3,
                  },
                }}
              />
            </Box>
          )}
        </Box>
      </Box>

      <SvgColor
        src={`${CONFIG.assetsDir}/assets/background/shape-square.svg`}
        className=""
        sx={{
          top: 0,
          left: -20,
          width: 240,
          zIndex: -1,
          height: 240,
          opacity: 0.24,
          position: 'absolute',
          color: `${color}.main`,
        }}
      />
    </Card>
  );
}
