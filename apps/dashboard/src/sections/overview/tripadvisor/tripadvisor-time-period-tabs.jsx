import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

export function TripAdvisorTimePeriodTabs({ periods, selectedPeriod, onPeriodChange }) {
  const theme = useTheme();

  const handleChange = (event, newValue) => {
    onPeriodChange(newValue);
  };

  return (
    <Card sx={{ p: 2 }}>
      <Stack spacing={2}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Iconify icon="eva:clock-fill" width={20} />
          <Typography variant="subtitle1">Time Period</Typography>
        </Stack>

        <Tabs
          value={selectedPeriod}
          onChange={handleChange}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            '& .MuiTab-root': {
              minWidth: 'auto',
              px: 2,
              py: 1,
              borderRadius: 1,
              mx: 0.5,
              '&.Mui-selected': {
                bgcolor: alpha(theme.palette.primary.main, 0.08),
                color: theme.palette.primary.main,
              },
            },
          }}
        >
          {periods.map((period) => (
            <Tab
              key={period.key}
              value={period.key}
              label={period.shortLabel}
              sx={{
                fontSize: '0.875rem',
                fontWeight: 500,
              }}
            />
          ))}
        </Tabs>
      </Stack>
    </Card>
  );
}
