import Tab from '@mui/material/Tab';
import Card from '@mui/material/Card';
import Tabs from '@mui/material/Tabs';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

type TPeriod = {
  key: string;
  label: string;
  shortLabel: string;
};

type TProps = {
  periods: TPeriod[];
  selectedPeriod: string;
  onPeriodChange: (period: string) => void;
};

export function TripAdvisorTimePeriodTabs({ periods, selectedPeriod, onPeriodChange }: TProps) {
  const theme = useTheme();

  const handleChange = (event: React.SyntheticEvent, newValue: string) => {
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
