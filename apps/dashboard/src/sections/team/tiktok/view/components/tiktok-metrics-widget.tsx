'use client';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

interface TikTokMetricsWidgetProps {
  title: string;
  value: string;
  icon: string;
  color?: 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success';
  trend?: 'up' | 'down' | 'neutral';
}

export function TikTokMetricsWidget({ 
  title, 
  value, 
  icon, 
  color = 'primary',
  trend = 'neutral' 
}: TikTokMetricsWidgetProps) {
  const getTrendColor = () => {
    switch (trend) {
      case 'up':
        return 'success.main';
      case 'down':
        return 'error.main';
      default:
        return 'text.secondary';
    }
  };

  const getTrendIcon = () => {
    switch (trend) {
      case 'up':
        return 'eva:trending-up-fill';
      case 'down':
        return 'eva:trending-down-fill';
      default:
        return 'eva:minus-fill';
    }
  };

  return (
    <Card>
      <CardContent>
        <Stack direction="row" alignItems="center" spacing={2}>
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: 1.5,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: (theme) => alpha(theme.palette[color].main, 0.12),
              color: (theme) => theme.palette[color].main,
            }}
          >
            <Iconify icon={icon} width={24} height={24} className="" sx={{}} />
          </Box>

          <Stack spacing={0.5} sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="body2" color="text.secondary" noWrap>
              {title}
            </Typography>
            
            <Stack direction="row" alignItems="center" spacing={1}>
              <Typography variant="h6" noWrap>
                {value}
              </Typography>
              
              {trend !== 'neutral' && (
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    color: getTrendColor(),
                  }}
                >
                  <Iconify 
                    icon={getTrendIcon()} 
                    width={16} 
                    height={16}
                    className=""
                    sx={{}}
                  />
                </Box>
              )}
            </Stack>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}
