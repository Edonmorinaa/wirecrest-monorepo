/**
 * Page Error Component
 * 
 * Handles different error states:
 * - Network errors
 * - Permission errors
 * - Not found errors
 * - Feature access errors
 */

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';
import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';

import { Iconify } from 'src/components/iconify';

interface PageErrorProps {
  title: string;
  message: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  type?: 'error' | 'warning' | 'info';
}

export function PageError({ title, message, action, type = 'error' }: PageErrorProps) {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
        p: 3,
      }}
    >
      <Card sx={{ maxWidth: 600, width: '100%' }}>
        <CardContent>
          <Alert severity={type}>
            <AlertTitle>{title}</AlertTitle>
            {message}
          </Alert>
          
          {action && (
            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>
              <Button
                variant="contained"
                startIcon={<Iconify icon="eva:refresh-fill" />}
                onClick={action.onClick}
              >
                {action.label}
              </Button>
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}

// Specialized error components for common scenarios
export function FeatureAccessError({ feature, teamId }: { feature: string; teamId: string }) {
  return (
    <PageError
      title="Feature Not Available"
      message={`This feature (${feature}) is not included in your current plan. Upgrade your subscription to access it.`}
      type="warning"
      action={{
        label: 'View Plans',
        onClick: () => window.location.href = `/dashboard/teams/${teamId}/billing`,
      }}
    />
  );
}

export function NotFoundError({ resource }: { resource: string }) {
  return (
    <PageError
      title={`${resource} Not Found`}
      message={`The ${resource.toLowerCase()} you're looking for doesn't exist or you don't have access to it.`}
      type="info"
      action={{
        label: 'Go Back',
        onClick: () => window.history.back(),
      }}
    />
  );
}

export function NetworkError({ onRetry }: { onRetry: () => void }) {
  return (
    <PageError
      title="Network Error"
      message="Failed to load data. Please check your connection and try again."
      type="error"
      action={{
        label: 'Retry',
        onClick: onRetry,
      }}
    />
  );
}

