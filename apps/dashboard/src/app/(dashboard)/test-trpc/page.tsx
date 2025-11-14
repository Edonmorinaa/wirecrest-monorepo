'use client';

import { useState } from 'react';
import {
  Box,
  Card,
  Grid,
  Button,
  Container,
  Typography,
  CardContent,
  Alert,
  CircularProgress,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Stack,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import InfoIcon from '@mui/icons-material/Info';

import { trpc } from 'src/lib/trpc/client';
import { useSession } from 'next-auth/react';

/**
 * tRPC Testing Dashboard
 * 
 * This page provides a visual interface to test all tRPC routers and procedures.
 * Use this in development to verify that your tRPC implementation is working correctly.
 */
export default function TestTRPCPage() {
  const { data: session, status } = useSession();
  const [testResults, setTestResults] = useState<Record<string, any>>({});
  const [isTestingAll, setIsTestingAll] = useState(false);

  const updateTestResult = (key: string, result: any) => {
    setTestResults((prev) => ({ ...prev, [key]: result }));
  };

  // Health Check Tests
  const testHealthCheck = async () => {
    const key = 'health.check';
    try {
      updateTestResult(key, { status: 'loading' });
      const result = await trpc.health.check.query();
      updateTestResult(key, { 
        status: 'success', 
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      updateTestResult(key, { 
        status: 'error', 
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  };

  // Teams Tests
  const testTeamsList = async () => {
    const key = 'teams.list';
    try {
      updateTestResult(key, { status: 'loading' });
      const result = await trpc.teams.list.query();
      updateTestResult(key, { 
        status: 'success', 
        data: result,
        count: result.length,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      updateTestResult(key, { 
        status: 'error', 
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  };

  const testGetTeam = async (slug: string = 'demo-team') => {
    const key = 'teams.get';
    try {
      updateTestResult(key, { status: 'loading' });
      const result = await trpc.teams.get.query({ slug });
      updateTestResult(key, { 
        status: 'success', 
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      updateTestResult(key, { 
        status: 'error', 
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  };

  // Reviews Tests
  const testGetGoogleReviews = async (slug: string = 'demo-team') => {
    const key = 'reviews.getGoogleReviews';
    try {
      updateTestResult(key, { status: 'loading' });
      const result = await trpc.reviews.getGoogleReviews.query({
        slug,
        filters: { page: 1, limit: 10 }
      });
      updateTestResult(key, { 
        status: 'success', 
        data: result,
        count: result.reviews.length,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      updateTestResult(key, { 
        status: 'error', 
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  };

  // Platforms Tests
  const testGetGoogleProfile = async (slug: string = 'demo-team') => {
    const key = 'platforms.googleProfile';
    try {
      updateTestResult(key, { status: 'loading' });
      const result = await trpc.platforms.googleProfile.query({ slug });
      updateTestResult(key, { 
        status: 'success', 
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      updateTestResult(key, { 
        status: 'error', 
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  };

  const testGetFacebookProfile = async (slug: string = 'demo-team') => {
    const key = 'platforms.facebookProfile';
    try {
      updateTestResult(key, { status: 'loading' });
      const result = await trpc.platforms.facebookProfile.query({ slug });
      updateTestResult(key, { 
        status: 'success', 
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      updateTestResult(key, { 
        status: 'error', 
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  };

  const testGetInstagramProfile = async (slug: string = 'demo-team') => {
    const key = 'platforms.instagramProfile';
    try {
      updateTestResult(key, { status: 'loading' });
      const result = await trpc.platforms.instagramProfile.query({ slug });
      updateTestResult(key, { 
        status: 'success', 
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      updateTestResult(key, { 
        status: 'error', 
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  };

  // Billing Tests
  const testGetSubscriptionInfo = async (slug: string = 'demo-team') => {
    const key = 'billing.getSubscriptionInfo';
    try {
      updateTestResult(key, { status: 'loading' });
      const result = await trpc.billing.getSubscriptionInfo.query({ slug });
      updateTestResult(key, { 
        status: 'success', 
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      updateTestResult(key, { 
        status: 'error', 
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  };

  // Run all tests
  const runAllTests = async () => {
    setIsTestingAll(true);
    setTestResults({});

    // Get first team slug from session or use demo
    const teamSlug = 'demo-team'; // You can update this based on actual data

    await testHealthCheck();
    await testTeamsList();
    await testGetTeam(teamSlug);
    await testGetGoogleReviews(teamSlug);
    await testGetGoogleProfile(teamSlug);
    await testGetFacebookProfile(teamSlug);
    await testGetInstagramProfile(teamSlug);
    await testGetSubscriptionInfo(teamSlug);

    setIsTestingAll(false);
  };

  const getStatusChip = (status?: string) => {
    if (!status) return null;
    
    switch (status) {
      case 'loading':
        return <Chip label="Testing..." color="info" size="small" icon={<CircularProgress size={14} />} />;
      case 'success':
        return <Chip label="Passed" color="success" size="small" icon={<CheckCircleIcon />} />;
      case 'error':
        return <Chip label="Failed" color="error" size="small" icon={<ErrorIcon />} />;
      default:
        return <Chip label="Not tested" size="small" />;
    }
  };

  const renderTestResult = (key: string, result: any) => {
    if (!result) return null;

    return (
      <Box sx={{ mt: 1, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
        <Stack spacing={1}>
          <Typography variant="caption" color="text.secondary">
            {result.timestamp}
          </Typography>
          
          {result.status === 'success' && (
            <Alert severity="success">
              <Typography variant="body2" component="pre" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                {JSON.stringify(result.data, null, 2)}
              </Typography>
            </Alert>
          )}
          
          {result.status === 'error' && (
            <Alert severity="error">
              <Typography variant="body2">{result.error}</Typography>
            </Alert>
          )}

          {result.count !== undefined && (
            <Typography variant="caption">
              Count: {result.count} items
            </Typography>
          )}
        </Stack>
      </Box>
    );
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h3" gutterBottom>
          tRPC Testing Dashboard
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          Test your tRPC implementation to ensure all routers and procedures work correctly.
        </Typography>

        {status === 'loading' && (
          <Alert severity="info" icon={<CircularProgress size={20} />}>
            Loading session...
          </Alert>
        )}

        {status === 'unauthenticated' && (
          <Alert severity="warning">
            You are not authenticated. Some tests may fail. Please sign in to test protected procedures.
          </Alert>
        )}

        {status === 'authenticated' && (
          <Alert severity="success">
            Authenticated as: {session?.user?.email}
            <br />
            Role: {session?.user?.superRole || 'USER'}
          </Alert>
        )}
      </Box>

      <Box sx={{ mb: 3 }}>
        <Button
          variant="contained"
          size="large"
          onClick={runAllTests}
          disabled={isTestingAll}
          startIcon={isTestingAll ? <CircularProgress size={20} /> : undefined}
        >
          {isTestingAll ? 'Running All Tests...' : 'Run All Tests'}
        </Button>
      </Box>

      <Grid container spacing={3}>
        {/* Health Router Tests */}
        <Grid item xs={12}>
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                <Typography variant="h6">Health Router</Typography>
                {getStatusChip(testResults['health.check']?.status)}
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Stack spacing={2}>
                <Button variant="outlined" onClick={testHealthCheck}>
                  Test health.check
                </Button>
                {renderTestResult('health.check', testResults['health.check'])}
              </Stack>
            </AccordionDetails>
          </Accordion>
        </Grid>

        {/* Teams Router Tests */}
        <Grid item xs={12}>
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                <Typography variant="h6">Teams Router</Typography>
                {getStatusChip(testResults['teams.list']?.status)}
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Stack spacing={2}>
                <Button variant="outlined" onClick={testTeamsList}>
                  Test teams.list
                </Button>
                {renderTestResult('teams.list', testResults['teams.list'])}

                <Button variant="outlined" onClick={() => testGetTeam('demo-team')}>
                  Test teams.get (slug: demo-team)
                </Button>
                {renderTestResult('teams.get', testResults['teams.get'])}
              </Stack>
            </AccordionDetails>
          </Accordion>
        </Grid>

        {/* Reviews Router Tests */}
        <Grid item xs={12}>
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                <Typography variant="h6">Reviews Router</Typography>
                {getStatusChip(testResults['reviews.getGoogleReviews']?.status)}
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Stack spacing={2}>
                <Button variant="outlined" onClick={() => testGetGoogleReviews('demo-team')}>
                  Test reviews.getGoogleReviews
                </Button>
                {renderTestResult('reviews.getGoogleReviews', testResults['reviews.getGoogleReviews'])}
              </Stack>
            </AccordionDetails>
          </Accordion>
        </Grid>

        {/* Platforms Router Tests */}
        <Grid item xs={12}>
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                <Typography variant="h6">Platforms Router</Typography>
                {getStatusChip(testResults['platforms.googleProfile']?.status)}
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Stack spacing={2}>
                <Button variant="outlined" onClick={() => testGetGoogleProfile('demo-team')}>
                  Test platforms.googleProfile
                </Button>
                {renderTestResult('platforms.googleProfile', testResults['platforms.googleProfile'])}

                <Button variant="outlined" onClick={() => testGetFacebookProfile('demo-team')}>
                  Test platforms.facebookProfile
                </Button>
                {renderTestResult('platforms.facebookProfile', testResults['platforms.facebookProfile'])}

                <Button variant="outlined" onClick={() => testGetInstagramProfile('demo-team')}>
                  Test platforms.instagramProfile
                </Button>
                {renderTestResult('platforms.instagramProfile', testResults['platforms.instagramProfile'])}
              </Stack>
            </AccordionDetails>
          </Accordion>
        </Grid>

        {/* Billing Router Tests */}
        <Grid item xs={12}>
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                <Typography variant="h6">Billing Router</Typography>
                {getStatusChip(testResults['billing.getSubscriptionInfo']?.status)}
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Stack spacing={2}>
                <Button variant="outlined" onClick={() => testGetSubscriptionInfo('demo-team')}>
                  Test billing.getSubscriptionInfo
                </Button>
                {renderTestResult('billing.getSubscriptionInfo', testResults['billing.getSubscriptionInfo'])}
              </Stack>
            </AccordionDetails>
          </Accordion>
        </Grid>
      </Grid>

      <Box sx={{ mt: 4 }}>
        <Alert severity="info" icon={<InfoIcon />}>
          <Typography variant="body2" fontWeight="bold" gutterBottom>
            Testing Tips:
          </Typography>
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            <li>Update team slugs in test functions to match your actual data</li>
            <li>Check browser console for detailed error messages</li>
            <li>Use React Query DevTools to inspect cache state</li>
            <li>Test with different user roles (admin, member, etc.)</li>
            <li>Verify protected procedures fail when not authenticated</li>
          </ul>
        </Alert>
      </Box>
    </Container>
  );
}

