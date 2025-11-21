'use client';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';
import { alpha, useTheme } from '@mui/material/styles';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

interface PlatformCardProps {
  platform: string;
  icon: string;
  title: string;
  stats: Record<string, number>;
  connected: boolean;
  isLoading?: boolean;
  onNavigate: () => void;
}

export function PlatformCard({
  platform,
  icon,
  title,
  stats,
  connected,
  isLoading,
  onNavigate,
}: PlatformCardProps) {
  const theme = useTheme();

  if (isLoading) {
    return (
      <Card>
        <CardContent>
          <Stack spacing={2}>
            <Skeleton variant="circular" width={48} height={48} />
            <Skeleton variant="text" width="70%" />
            <Skeleton variant="rectangular" height={60} />
            <Skeleton variant="rectangular" height={36} />
          </Stack>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      sx={{
        height: '100%',
        transition: 'all 0.3s',
        '&:hover': {
          boxShadow: theme.shadows[8],
          transform: 'translateY(-4px)',
        },
        cursor: connected ? 'pointer' : 'default',
        opacity: connected ? 1 : 0.7,
      }}
      onClick={connected ? onNavigate : undefined}
    >
      <CardContent>
        <Stack spacing={2.5}>
          {/* Header with icon and status */}
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Box
              sx={{
                width: 48,
                height: 48,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 1.5,
                bgcolor: alpha(theme.palette.grey[500], 0.08),
              }}
            >
              <Iconify icon={icon} width={32} />
            </Box>
            <Chip
              label={connected ? 'Connected' : 'Not Connected'}
              color={connected ? 'success' : 'default'}
              size="small"
            />
          </Stack>

          {/* Platform name */}
          <Typography variant="h6" noWrap>
            {title}
          </Typography>

          {/* Stats */}
          {connected ? (
            <Stack spacing={1}>
              {Object.entries(stats).map(([key, value]) => (
                <Stack key={key} direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="body2" color="text.secondary" sx={{ textTransform: 'capitalize' }}>
                    {key.replace(/([A-Z])/g, ' $1').trim()}
                  </Typography>
                  <Typography variant="subtitle2">
                    {typeof value === 'number' && value >= 0
                      ? key.toLowerCase().includes('rate') || key.toLowerCase().includes('engagement')
                        ? `${value.toFixed(1)}%`
                        : value.toLocaleString()
                      : '-'}
                  </Typography>
                </Stack>
              ))}
            </Stack>
          ) : (
            <Box
              sx={{
                height: 80,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: alpha(theme.palette.grey[500], 0.04),
                borderRadius: 1,
              }}
            >
              <Typography variant="body2" color="text.secondary">
                No data available
              </Typography>
            </Box>
          )}

          {/* Action Button */}
          <Button
            variant={connected ? 'outlined' : 'contained'}
            size="small"
            fullWidth
            onClick={(e) => {
              e.stopPropagation();
              onNavigate();
            }}
            startIcon={
              <Iconify icon={connected ? 'solar:eye-bold' : 'solar:link-bold'} />
            }
          >
            {connected ? 'View Details' : 'Connect'}
          </Button>
        </Stack>
      </CardContent>
    </Card>
  );
}

