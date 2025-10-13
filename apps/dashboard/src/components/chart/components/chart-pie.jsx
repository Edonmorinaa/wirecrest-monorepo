'use client';

import PropTypes from 'prop-types';

import { Chart } from '../chart';
import { useChart } from '../use-chart';

// ----------------------------------------------------------------------

export function ChartPie({ series, labels, colors, sx, ...other }) {
  const chartOptions = useChart({
    colors,
    labels,
    stroke: {
      show: false,
    },
    legend: {
      horizontalAlign: 'center',
    },
    plotOptions: {
      pie: {
        donut: {
          size: '70%',
        },
      },
    },
    dataLabels: {
      enabled: true,
      formatter: (val) => `${val}%`,
    },
  });

  return (
    <Chart
      type="pie"
      series={series}
      options={chartOptions}
      sx={sx}
      {...other}
    />
  );
}

ChartPie.propTypes = {
  series: PropTypes.array,
  labels: PropTypes.array,
  colors: PropTypes.array,
  sx: PropTypes.object,
};
