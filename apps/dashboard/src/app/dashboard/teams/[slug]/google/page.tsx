import { StripeFeatureLookupKeys } from '@wirecrest/billing';
import { PageGate } from '@/components/gates/PageGate';
import { getTenantBySlug } from '@/actions/tenants';
import { notFound } from 'next/navigation';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';

import { paths } from 'src/routes/paths';

import { DashboardContent } from 'src/layouts/dashboard';

import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

// ----------------------------------------------------------------------

export default async function GoogleBusinessPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  
  // Fetch tenant by slug
  const tenant = await getTenantBySlug(slug);
  
  // Handle case where tenant is not found
  if (!tenant) {
    notFound();
  }

  const tenantId = tenant.id;

  return (
    <PageGate teamId={tenantId}>
      <DashboardContent>
      <CustomBreadcrumbs
        heading="Google Business"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Teams', href: paths.dashboard.teams.root },
          { name: slug, href: paths.dashboard.teams.bySlug(slug) },
          { name: 'Google Business' },
        ]}
        sx={{ mb: { xs: 3, md: 5 } }}
      />

        <Grid container spacing={3}>
          {/* Google Business Overview */}
          <Grid size={{ xs: 12 }}>
            <Card sx={{ p: 3 }}>
              <Typography variant="h4" gutterBottom>
                Google My Business
              </Typography>
              <Typography variant="body1" color="text.secondary" paragraph>
                Manage your Google My Business listings and reviews for team: <strong>{slug}</strong>
              </Typography>
            </Card>
          </Grid>

          {/* Google Reviews */}
          <Grid size={{ xs: 12, md: 6 }}>
              <Card sx={{ p: 3, height: '100%' }}>
                <Typography variant="h6" gutterBottom>
                  Google Reviews
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  Monitor and respond to Google reviews
                </Typography>
                <Button variant="contained" fullWidth>
                  View Reviews
                </Button>
              </Card>
          </Grid>

          {/* Google Analytics */}
          <Grid size={{ xs: 12, md: 6 }}>
              <Card sx={{ p: 3, height: '100%' }}>
                <Typography variant="h6" gutterBottom>
                  Google Analytics
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  Track performance and insights
                </Typography>
                <Button variant="contained" fullWidth>
                  View Analytics
                </Button>
              </Card>
          </Grid>

          {/* Google Overview */}
          <Grid size={{ xs: 12, md: 6 }}>
              <Card sx={{ p: 3, height: '100%' }}>
                <Typography variant="h6" gutterBottom>
                  Business Overview
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  View business profile and basic metrics
                </Typography>
                <Button variant="outlined" fullWidth>
                  View Overview
                </Button>
              </Card>
          </Grid>

          {/* Competitor Analysis */}
          <Grid size={{ xs: 12, md: 6 }}>
              <Card sx={{ p: 3, height: '100%' }}>
                <Typography variant="h6" gutterBottom>
                  Competitor Analysis
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  Compare with competitors
                </Typography>
                <Button variant="outlined" fullWidth>
                  Analyze Competitors
                </Button>
              </Card>
          </Grid>

          {/* Quick Actions */}
          <Grid size={{ xs: 12 }}>
            <Card sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Quick Actions
              </Typography>
              <Box display="flex" gap={2} flexWrap="wrap">
                  <Button variant="outlined">
                    Sync Reviews
                  </Button>
                
                  <Button variant="outlined">
                    Update Analytics
                  </Button>
                
                  <Button variant="outlined">
                    Refresh Profile
                  </Button>
              </Box>
            </Card>
          </Grid>
        </Grid>
      </DashboardContent>
    </PageGate>
  );
}
