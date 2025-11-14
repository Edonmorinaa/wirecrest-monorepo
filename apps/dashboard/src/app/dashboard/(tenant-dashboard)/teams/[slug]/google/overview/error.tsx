'use client';

import { useEffect } from 'react';

import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import RefreshIcon from '@mui/icons-material/Refresh';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Google Overview Error:', error);
  }, [error]);

  // Parse tRPC errors
  const getErrorMessage = () => {
    if (error.message.includes('UNAUTHORIZED')) {
      return 'You need to be logged in to access this page.';
    }
    if (error.message.includes('FORBIDDEN')) {
      return 'You do not have permission to access this team.';
    }
    if (error.message.includes('PAYMENT_REQUIRED')) {
      return 'An active subscription is required to access Google Overview.';
    }
    if (error.message.includes('PRECONDITION_FAILED')) {
      return 'Your subscription plan does not include Google Overview. Please upgrade.';
    }
    if (error.message.includes('NOT_FOUND')) {
      return 'Google Business Profile not found. Please connect your Google account.';
    }
    return error.message || 'Failed to load Google Overview';
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
        width: '100%',
        p: 3,
      }}
    >
      <Alert
        severity="error"
        sx={{
          maxWidth: '500px',
          width: '100%',
          mb: 3,
        }}
      >
        <Typography variant="h6" gutterBottom>
          Something went wrong
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {getErrorMessage()}
        </Typography>
      </Alert>
      <Button
        variant="contained"
        startIcon={<RefreshIcon />}
        onClick={reset}
      >
        Try again
      </Button>
    </Box>
  );
}

