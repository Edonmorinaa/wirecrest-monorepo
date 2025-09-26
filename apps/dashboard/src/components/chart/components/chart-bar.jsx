'use client';

import PropTypes from 'prop-types';
import { useChart } from '../use-chart';
import { Chart } from '../chart';

// ----------------------------------------------------------------------

export function ChartBar({ series, categories, colors, sx, ...other }) {
  const chartOptions = useChart({
    colors,
    xaxis: {
      categories,
    },
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: '55%',
        endingShape: 'rounded',
      },
    },
    dataLabels: {
      enabled: false,
    },
    stroke: {
      show: true,
      width: 2,
      colors: ['transparent'],
    },
    fill: {
      opacity: 1,
    },
    tooltip: {
      y: {
        formatter: (value) => `${value}`,
      },
    },
    legend: {
      position: 'top',
      horizontalAlign: 'right',
    },
  });

  return (
    <Chart
      type="bar"
      series={series}
      options={chartOptions}
      sx={sx}
      {...other}
    />
  );
}

ChartBar.propTypes = {
  series: PropTypes.array,
  categories: PropTypes.array,
  colors: PropTypes.array,
  sx: PropTypes.object,
};
