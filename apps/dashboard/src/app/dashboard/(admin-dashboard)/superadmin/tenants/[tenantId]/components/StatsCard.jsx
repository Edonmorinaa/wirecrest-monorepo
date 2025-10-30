'use client';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Avatar from '@mui/material/Avatar';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';
import LinearProgress from '@mui/material/LinearProgress';
import { alpha } from '@mui/material/styles';

import { Iconify } from 'src/components/iconify';

export default function StatsCard({ title, value, subtitle, icon, color = 'primary', showProgress = false, progressValue = 0 }) {
  return (
    <Card
      elevation={2}
      sx={{
        height: '100%',
        transition: 'all 0.3s ease',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: (theme) => theme.shadows[8],
        },
      }}
    >
      <CardContent>
        <Stack spacing={2}>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 600 }}>
              {title}
            </Typography>
            <Avatar
              sx={{
                width: 48,
                height: 48,
                bgcolor: (theme) => alpha(theme.palette[color].main, 0.12),
                color: `${color}.main`,
              }}
            >
              <Iconify icon={icon} width={26} />
            </Avatar>
          </Stack>

          <Box>
            <Typography variant="h3" sx={{ mb: 0.5, fontWeight: 700 }}>
              {value}
            </Typography>
            {subtitle && (
              <Typography variant="body2" color="text.secondary">
                {subtitle}
              </Typography>
            )}
          </Box>

          {showProgress && (
            <LinearProgress
              variant="determinate"
              value={progressValue}
              sx={{
                height: 8,
                borderRadius: 1,
                bgcolor: (theme) => alpha(theme.palette[color].main, 0.12),
                '& .MuiLinearProgress-bar': {
                  borderRadius: 1,
                  bgcolor: `${color}.main`,
                },
              }}
            />
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}

