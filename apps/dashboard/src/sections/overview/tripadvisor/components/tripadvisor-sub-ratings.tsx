import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';

import { Iconify } from 'src/components/iconify';
import { Chart, useChart } from 'src/components/chart';

// ----------------------------------------------------------------------

type TSubRating = {
  category: string;
  rating: number;
  fill: string;
};

type TProps = {
  data?: TSubRating[];
};

export function TripAdvisorSubRatings({ data }: TProps) {
  const theme = useTheme();

  const chartData = [
    {
      name: 'Rating',
      data: data?.map((item) => item.rating) || [],
    },
  ];

  const chartOptions = useChart({
    colors: [theme.palette.primary.main],
    plotOptions: {
      bar: {
        horizontal: true,
        barHeight: '60%',
        borderRadius: 2,
      },
    },
    xaxis: {
      categories: data?.map((item) => item.category) || [],
      min: 0,
      max: 5,
    },
    yaxis: {
      labels: {
        style: {
          colors: data?.map((item) => item.fill) || [],
          fontWeight: 600,
        },
      },
    },
    tooltip: {
      y: {
        formatter: (value) => `${value.toFixed(1)}/5`,
      },
    },
  });

  if (!data || data.length === 0) {
    return (
      <Card sx={{ p: 3, height: 400 }}>
        <Stack spacing={2} alignItems="center" justifyContent="center" sx={{ height: '100%' }}>
          <Iconify icon="eva:bar-chart-fill" width={48} color="text.disabled" />
          <Typography variant="body2" color="text.secondary">
            No sub-ratings data available
          </Typography>
        </Stack>
      </Card>
    );
  }

  return (
    <Card sx={{ p: 3 }}>
      <Stack spacing={3}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Iconify icon="eva:bar-chart-fill" width={24} />
          <Typography variant="h6">Sub-Ratings Breakdown</Typography>
        </Stack>

        <Box sx={{ height: 300 }}>
          <Chart
            type="bar"
            series={chartData}
            options={chartOptions}
            height={300}
          />
        </Box>
      </Stack>
    </Card>
  );
}
