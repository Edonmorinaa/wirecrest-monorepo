'use client';

import PropTypes from 'prop-types';

import { Chart } from '../chart';
import { useChart } from '../use-chart';

// ----------------------------------------------------------------------

export function ChartLine({ series, categories, colors, sx, ...other }) {
  const chartOptions = useChart({
    colors,
    xaxis: {
      categories,
    },
    stroke: {
      curve: 'smooth',
      width: 3,
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
      type="line"
      series={series}
      options={chartOptions}
      sx={sx}
      {...other}
    />
  );
}

ChartLine.propTypes = {
  series: PropTypes.array,
  categories: PropTypes.array,
  colors: PropTypes.array,
  sx: PropTypes.object,
};
