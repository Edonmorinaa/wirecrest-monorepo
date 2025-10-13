/**
 * PageGate - Feature-based access control for dashboard pages
 * 
 * Checks if user's plan includes the required feature.
 * 
 * Usage:
 *   <PageGate feature={Feature.Google.Reviews} teamId={teamId}>
 *     <YourPageContent />
 *   </PageGate>
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
} from '@mui/icons-material';
import { useFeatureFlags } from '@/hooks/useFeatureFlags';
import { StripeFeatureLookupKey } from '@wirecrest/billing';

interface PageGateProps {
  feature?: StripeFeatureLookupKey;
  teamId: string;
  children: ReactNode;
}

export function PageGate({
  feature,
  teamId,
  children,
}: PageGateProps) {
  const router = useRouter();
  const { isEnabled, loading: featureLoading, error: featureError } = useFeatureFlags(teamId);

  // Loading state
  if (featureLoading) {
    return (
      <Container maxWidth="md" sx={{ mt: 8 }}>
        <Card>
          <CardContent>
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
              <Stack spacing={2} alignItems="center">
                <Typography variant="body1" color="text.secondary">
                  Checking feature access...
                </Typography>
              </Stack>
            </Box>
          </CardContent>
        </Card>
      </Container>
    );
  }

  // Feature Gate (if feature is specified)
  if (feature) {
    console.log('feature', feature);
    console.log('isEnabled', isEnabled(feature));
    const hasFeature = isEnabled(feature);

    if (!hasFeature) {
      console.log('hasFeature', hasFeature);
      return <FeatureNotAvailableGate feature={feature} teamId={teamId} />;
    }

    if (featureError) {
      console.log('featureError', featureError);
      return <FeatureErrorGate error={featureError} teamId={teamId} />;
    }
  }

  // All checks passed - render children
  return <>{children}</>;
}


/**
 * Feature Not Available Gate
 * Shown when user's plan doesn't include the required feature
 */
function FeatureNotAvailableGate({ feature, teamId }: { feature: FeatureKey; teamId: string }) {
  const router = useRouter();

  // Format feature name for display
  const featureName = feature
    .split('.')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

    console.log('featureName', featureName);

  return (
    <Container maxWidth="md" sx={{ mt: 8 }}>
      <Card elevation={3}>
        <CardContent>
          <Box textAlign="center" py={4}>
            <LockIcon sx={{ fontSize: 80, color: 'primary.main', mb: 3 }} />
            
            <Typography variant="h4" gutterBottom fontWeight="600">
              Feature Not Available
            </Typography>
            
            <Typography variant="body1" color="text.secondary" paragraph sx={{ mb: 2, maxWidth: 600, mx: 'auto' }}>
              The <strong>{featureName}</strong> feature is not included in your current plan.
            </Typography>

            <Typography variant="body2" color="text.secondary" paragraph sx={{ mb: 4, maxWidth: 600, mx: 'auto' }}>
              Upgrade to a higher plan to unlock this feature and access advanced capabilities.
            </Typography>

            <Box mb={4}>
              <Chip 
                icon={<LockIcon />}
                label={`${featureName} - Upgrade Required`}
                color="primary"
                variant="outlined"
              />
            </Box>

            <Stack direction="row" spacing={2} justifyContent="center">
              <Button
                variant="outlined"
                size="large"
                onClick={() => router.push(`/user/account/billing`)}
              >
                Continue to Billing
              </Button>
            </Stack>

            <Box mt={4}>
              <Typography variant="caption" color="text.secondary">
                Contact your administrator to enable this feature.
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Container>
  );
}

/**
 * Feature Error Gate
 * Shown when there's an error checking feature access
 */
function FeatureErrorGate({ error, teamId }: { error: string; teamId: string }) {
  const router = useRouter();

  return (
    <Container maxWidth="md" sx={{ mt: 8 }}>
      <Card elevation={3}>
        <CardContent>
          <Box textAlign="center" py={4}>
            <Alert severity="error" sx={{ mb: 3, maxWidth: 600, mx: 'auto' }}>
              <Typography variant="body1">
                Unable to verify feature access
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                {error}
              </Typography>
            </Alert>

            <Stack direction="row" spacing={2} justifyContent="center">
              <Button
                variant="contained"
                size="large"
                onClick={() => window.location.reload()}
              >
                Try Again
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

/**
 * Inline Feature Gate
 * For smaller sections within a page
 */
export function InlineFeatureGate({
  feature,
  teamId,
  children,
}: {
  feature: FeatureKey;
  teamId: string;
  children: ReactNode;
}) {
  const { isEnabled, loading } = useFeatureFlags(teamId);

  if (loading) {
    return null;
  }

  if (!isEnabled(feature)) {
    return (
      <Alert 
        severity="info" 
        icon={<LockIcon />}
        sx={{ my: 2 }}
      >
        <Typography variant="body2">
          This feature is not available. Contact your administrator to enable it.
        </Typography>
      </Alert>
    );
  }

  return <>{children}</>;
}
