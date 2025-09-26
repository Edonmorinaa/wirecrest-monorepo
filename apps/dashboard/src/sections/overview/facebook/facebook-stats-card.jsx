import PropTypes from 'prop-types';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

export function FacebookStatsCard({ title, value, icon, subtitle, color = 'primary', ...other }) {
  const theme = useTheme();

  return (
    <Card 
      sx={{ 
        p: 3, 
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 4,
          background: `linear-gradient(90deg, ${theme.palette[color].main}, ${theme.palette[color].light})`,
        }
      }}
      {...other}
    >
      <Stack spacing={2}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: alpha(theme.palette[color].main, 0.1),
              color: `${color}.main`,
            }}
          >
            <Iconify icon={icon} width={24} />
          </Box>
        </Box>

        <Box>
          <Typography variant="h4" sx={{ mb: 0.5 }}>
            {typeof value === 'number' ? value.toLocaleString() : value}
          </Typography>
          <Typography variant="subtitle2" sx={{ color: 'text.secondary', mb: 0.5 }}>
            {title}
          </Typography>
          {subtitle && (
            <Typography variant="caption" sx={{ color: 'text.disabled' }}>
              {subtitle}
            </Typography>
          )}
        </Box>
      </Stack>
    </Card>
  );
}

FacebookStatsCard.propTypes = {
  title: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  icon: PropTypes.string.isRequired,
  subtitle: PropTypes.string,
  color: PropTypes.oneOf(['primary', 'secondary', 'success', 'warning', 'error', 'info']),
};
