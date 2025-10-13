'use client';

import { format } from 'date-fns';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Avatar from '@mui/material/Avatar';
import Timeline from '@mui/lab/Timeline';
import TimelineDot from '@mui/lab/TimelineDot';
import AlertTitle from '@mui/material/AlertTitle';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';
import TimelineItem from '@mui/lab/TimelineItem';
import TimelineContent from '@mui/lab/TimelineContent';
import TimelineSeparator from '@mui/lab/TimelineSeparator';
import TimelineConnector from '@mui/lab/TimelineConnector';
import { alpha } from '@mui/material/styles';

import { Iconify } from 'src/components/iconify';

const activityConfig = {
  task_created: {
    color: 'info',
    icon: 'solar:add-circle-bold',
    label: 'Task Created',
  },
  task_completed: {
    color: 'success',
    icon: 'solar:check-circle-bold',
    label: 'Completed',
  },
  task_failed: {
    color: 'error',
    icon: 'solar:danger-circle-bold',
    label: 'Failed',
  },
  status_message: {
    color: 'primary',
    icon: 'solar:info-circle-bold',
    label: 'Status Update',
  },
};

export default function ActivityTab({ recentActivity }) {
  if (!recentActivity || recentActivity.length === 0) {
    return (
      <Box sx={{ py: 3 }}>
        <Alert
          severity="info"
          icon={<Iconify icon="solar:history-bold" width={24} />}
        >
          <AlertTitle>No Recent Activity</AlertTitle>
          No recent activity has been recorded for this tenant.
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ py: 3 }}>
      <Stack spacing={2} sx={{ mb: 3 }}>
        <Typography variant="h6">
          Recent Activity
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Latest platform integration activities and status updates
        </Typography>
      </Stack>

      <Timeline position="right">
        {recentActivity.map((activity, index) => {
          const config = activityConfig[activity.type] || activityConfig.status_message;

          return (
            <TimelineItem key={activity.id || index}>
              <TimelineSeparator>
                <TimelineDot color={config.color}>
                  <Iconify icon={config.icon} width={20} />
                </TimelineDot>
                {index < recentActivity.length - 1 && <TimelineConnector />}
              </TimelineSeparator>
              <TimelineContent>
                <Card
                  variant="outlined"
                  sx={{
                    mb: 2,
                    transition: 'all 0.2s',
                    '&:hover': {
                      boxShadow: (theme) => theme.shadows[4],
                      transform: 'translateX(4px)',
                    },
                  }}
                >
                  <CardContent>
                    <Stack direction="row" alignItems="flex-start" spacing={2}>
                      <Avatar
                        sx={{
                          bgcolor: (theme) => alpha(theme.palette[config.color].main, 0.12),
                          color: `${config.color}.main`,
                          width: 40,
                          height: 40,
                        }}
                      >
                        <Iconify icon={config.icon} width={22} />
                      </Avatar>
                      <Box sx={{ flex: 1 }}>
                        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
                          <Typography variant="subtitle2" fontWeight={600}>
                            {config.label}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            • {activity.platform}
                          </Typography>
                        </Stack>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                          {activity.message}
                        </Typography>
                        <Stack direction="row" alignItems="center" spacing={0.5}>
                          <Iconify icon="solar:clock-circle-bold" width={14} sx={{ color: 'text.disabled' }} />
                          <Typography variant="caption" color="text.disabled">
                            {format(new Date(activity.timestamp), 'MMM d, yyyy • HH:mm')}
                          </Typography>
                        </Stack>
                      </Box>
                    </Stack>
                  </CardContent>
                </Card>
              </TimelineContent>
            </TimelineItem>
          );
        })}
      </Timeline>
    </Box>
  );
}

