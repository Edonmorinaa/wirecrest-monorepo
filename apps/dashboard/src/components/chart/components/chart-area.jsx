'use client';

import PropTypes from 'prop-types';
import { useChart } from '../use-chart';
import { Chart } from '../chart';

// ----------------------------------------------------------------------

export function ChartArea({ series, categories, colors, sx, ...other }) {
  const chartOptions = useChart({
    colors,
    xaxis: {
      categories,
    },
    stroke: {
      curve: 'smooth',
      width: 3,
    },
    fill: {
      type: 'gradient',
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.7,
        opacityTo: 0.3,
        stops: [0, 90, 100],
      },
    },
    dataLabels: {
      enabled: false,
    },
    tooltip: {
      x: {
        format: 'dd/MM/yy',
      },
    },
    grid: {
      borderColor: '#f1f1f1',
    },
    legend: {
      position: 'top',
      horizontalAlign: 'right',
    },
  });

  return (
    <Chart
      type="area"
      series={series}
      options={chartOptions}
      sx={sx}
      {...other}
    />
  );
}

ChartArea.propTypes = {
  series: PropTypes.array,
  categories: PropTypes.array,
  colors: PropTypes.array,
  sx: PropTypes.object,
};
