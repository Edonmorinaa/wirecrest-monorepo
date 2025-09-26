import PropTypes from 'prop-types';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';

// ----------------------------------------------------------------------

export function FacebookTimePeriodSelector({ periods, selectedPeriod, onPeriodChange, sx, ...other }) {
  return (
    <Card sx={{ p: 2, ...sx }} {...other}>
      <Stack spacing={2}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
          Time Period
        </Typography>
        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
          {periods.map((period) => (
            <Button
              key={period.key}
              variant={selectedPeriod === period.key ? 'contained' : 'outlined'}
              size="small"
              onClick={() => onPeriodChange(period.key)}
              sx={{
                minWidth: 'auto',
                px: 2,
                py: 1,
                borderRadius: 2,
                fontSize: '0.875rem',
                fontWeight: selectedPeriod === period.key ? 600 : 400,
              }}
            >
              {period.shortLabel}
            </Button>
          ))}
        </Stack>
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          Showing metrics for: <strong>{periods.find(p => p.key === selectedPeriod)?.label || 'All Time'}</strong>
        </Typography>
      </Stack>
    </Card>
  );
}

FacebookTimePeriodSelector.propTypes = {
  periods: PropTypes.arrayOf(
    PropTypes.shape({
      key: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
      shortLabel: PropTypes.string.isRequired,
    })
  ).isRequired,
  selectedPeriod: PropTypes.string.isRequired,
  onPeriodChange: PropTypes.func.isRequired,
  sx: PropTypes.object,
};
