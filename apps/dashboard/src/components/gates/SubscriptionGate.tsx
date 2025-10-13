/**
 * SubscriptionGate - Subscription-based access control
 * 
 * Checks if user has active subscription (not demo).
 * Use this separately from PageGate if you need subscription checks.
 * 
 * Usage:
 *   <SubscriptionGate teamId={teamId}>
 *     <YourPageContent />
 *   </SubscriptionGate>
 */

'use client';

import React, { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Container,
  Stack,
  Alert,
  Chip,
} from '@mui/material';
import {
  Lock as LockIcon,
  Upgrade as UpgradeIcon,
  CreditCard as CreditCardIcon,
} from '@mui/icons-material';
import { useSubscriptionStatus } from '@/hooks/useSubscriptionStatus';

interface SubscriptionGateProps {
  teamId: string;
  children: ReactNode;
  allowDemo?: boolean; // Default: false
}

export function SubscriptionGate({
  teamId,
  children,
  allowDemo = false,
}: SubscriptionGateProps) {
  const router = useRouter();
  const { subscription, loading, isDemo } = useSubscriptionStatus(teamId);

  // Loading state
  if (loading) {
    return (
      <Container maxWidth="md" sx={{ mt: 8 }}>
        <Card>
          <CardContent>
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
              <Stack spacing={2} alignItems="center">
                <Typography variant="body1" color="text.secondary">
                  Checking subscription...
                </Typography>
              </Stack>
            </Box>
          </CardContent>
        </Card>
      </Container>
    );
  }

  // Check if user has no subscription at all
  if (!subscription) {
    return <NoSubscriptionGate teamId={teamId} />;
  }

  // Check if user is in demo mode (and demo not allowed)
  if (!allowDemo && isDemo) {
    return <DemoModeGate teamId={teamId} />;
  }

  // Check if subscription is not active
  if (subscription.status !== 'ACTIVE' && subscription.status !== 'TRIALING') {
    return <InactiveSubscriptionGate teamId={teamId} status={subscription.status} />;
  }

  // All checks passed - render children
  return <>{children}</>;
}

/**
 * No Subscription Gate
 */
function NoSubscriptionGate({ teamId }: { teamId: string }) {
  const router = useRouter();

  return (
    <Container maxWidth="md" sx={{ mt: 8 }}>
      <Card elevation={3}>
        <CardContent>
          <Box textAlign="center" py={4}>
            <CreditCardIcon sx={{ fontSize: 80, color: 'primary.main', mb: 3 }} />
            
            <Typography variant="h4" gutterBottom fontWeight="600">
              Subscription Required
            </Typography>
            
            <Typography variant="body1" color="text.secondary" paragraph sx={{ mb: 4, maxWidth: 600, mx: 'auto' }}>
              To access this feature, you need an active subscription. Choose a plan that fits your needs and start managing your online reputation today.
            </Typography>

            <Stack direction="row" spacing={2} justifyContent="center">
              <Button
                variant="contained"
                size="large"
                startIcon={<UpgradeIcon />}
                onClick={() => router.push(`/dashboard/teams/${teamId}/billing`)}
              >
                View Plans
              </Button>
              <Button
                variant="outlined"
                size="large"
                onClick={() => router.push(`/dashboard/teams/${teamId}`)}
              >
                Go to Dashboard
              </Button>
            </Stack>

            <Box mt={4}>
              <Typography variant="caption" color="text.secondary">
                Need help choosing a plan? Contact our sales team.
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Container>
  );
}

/**
 * Demo Mode Gate
 */
function DemoModeGate({ teamId }: { teamId: string }) {
  const router = useRouter();

  return (
    <Container maxWidth="md" sx={{ mt: 8 }}>
      <Card elevation={3}>
        <CardContent>
          <Box textAlign="center" py={4}>
            <Box position="relative" display="inline-block" mb={3}>
              <LockIcon sx={{ fontSize: 80, color: 'warning.main' }} />
              <Chip 
                label="DEMO" 
                color="warning" 
                size="small" 
                sx={{ position: 'absolute', top: -10, right: -10 }}
              />
            </Box>
            
            <Typography variant="h4" gutterBottom fontWeight="600">
              Upgrade to Full Access
            </Typography>
            
            <Typography variant="body1" color="text.secondary" paragraph sx={{ mb: 3, maxWidth: 600, mx: 'auto' }}>
              You're currently in demo mode with limited access. Upgrade to a paid plan to unlock this feature and all premium capabilities.
            </Typography>

            <Alert severity="info" sx={{ mb: 4, maxWidth: 600, mx: 'auto' }}>
              <Typography variant="body2">
                <strong>Demo accounts include:</strong> Limited access to basic features for testing purposes
              </Typography>
            </Alert>

            <Stack direction="row" spacing={2} justifyContent="center">
              <Button
                variant="contained"
                size="large"
                color="warning"
                startIcon={<UpgradeIcon />}
                onClick={() => router.push(`/dashboard/teams/${teamId}/billing`)}
              >
                Upgrade Now
              </Button>
              <Button
                variant="outlined"
                size="large"
                onClick={() => router.push(`/dashboard/teams/${teamId}`)}
              >
                Back to Dashboard
              </Button>
            </Stack>
          </Box>
        </CardContent>
      </Card>
    </Container>
  );
}

/**
 * Inactive Subscription Gate
 */
function InactiveSubscriptionGate({ teamId, status }: { teamId: string; status: string }) {
  const router = useRouter();

  const statusMessages: Record<string, { title: string; message: string; severity: 'error' | 'warning' }> = {
    CANCELLED: {
      title: 'Subscription Cancelled',
      message: 'Your subscription has been cancelled. Reactivate to continue using this feature.',
      severity: 'error',
    },
    PAST_DUE: {
      title: 'Payment Required',
      message: 'Your payment is past due. Please update your payment method to restore access.',
      severity: 'error',
    },
    PAUSED: {
      title: 'Subscription Paused',
      message: 'Your subscription is paused. Resume your subscription to access this feature.',
      severity: 'warning',
    },
    INCOMPLETE: {
      title: 'Setup Incomplete',
      message: 'Your subscription setup is incomplete. Complete the setup to access this feature.',
      severity: 'warning',
    },
  };

  const statusInfo = statusMessages[status] || {
    title: 'Subscription Inactive',
    message: 'Your subscription is not active. Please contact support.',
    severity: 'error' as const,
  };

  return (
    <Container maxWidth="md" sx={{ mt: 8 }}>
      <Card elevation={3}>
        <CardContent>
          <Box textAlign="center" py={4}>
            <CreditCardIcon sx={{ fontSize: 80, color: `${statusInfo.severity}.main`, mb: 3 }} />
            
            <Typography variant="h4" gutterBottom fontWeight="600">
              {statusInfo.title}
            </Typography>
            
            <Typography variant="body1" color="text.secondary" paragraph sx={{ mb: 3, maxWidth: 600, mx: 'auto' }}>
              {statusInfo.message}
            </Typography>

            <Alert severity={statusInfo.severity} sx={{ mb: 4, maxWidth: 600, mx: 'auto' }}>
              <Typography variant="body2">
                <strong>Status:</strong> {status}
              </Typography>
            </Alert>

            <Stack direction="row" spacing={2} justifyContent="center">
              <Button
                variant="contained"
                size="large"
                color={statusInfo.severity}
                startIcon={<CreditCardIcon />}
                onClick={() => router.push(`/dashboard/teams/${teamId}/billing`)}
              >
                Manage Billing
              </Button>
              <Button
                variant="outlined"
                size="large"
                onClick={() => router.push(`/dashboard/teams/${teamId}`)}
              >
                Go to Dashboard
              </Button>
            </Stack>
          </Box>
        </CardContent>
      </Card>
    </Container>
  );
}
