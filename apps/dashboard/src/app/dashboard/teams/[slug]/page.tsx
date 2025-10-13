import { PageGate } from '@/components/gates/PageGate';
import { getTenantBySlug } from '@/actions/tenants';
import { notFound } from 'next/navigation';
import { FeatureUsageCard } from '@/components/FeatureUsageCard';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';

import { paths } from 'src/routes/paths';

import { DashboardContent } from 'src/layouts/dashboard';

import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

// ----------------------------------------------------------------------

export default async function TeamPage({ params }: { params: Promise<{ slug: string }> }) {
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
        heading={`Team: ${slug}`}
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Teams', href: '/dashboard/teams' },
          { name: slug },
        ]}
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <Grid container spacing={3}>
        {/* Team Overview */}
        <Grid size={{ xs: 12 }}>
          <Card sx={{ p: 3 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h4" gutterBottom>
                Welcome to {slug}
              </Typography>
              <Button 
                variant="outlined" 
                href={`/dashboard/teams/${slug}/features`}
                size="small"
              >
                Manage Features
              </Button>
            </Box>
            <Typography variant="body1" color="text.secondary" paragraph>
              This is the team dashboard for {slug}. Here you can manage your team&apos;s social media platforms and business listings.
            </Typography>
            
            {/* Feature Status - Will be handled by PageGate */}
          </Card>
        </Grid>

        {/* Feature Usage Analytics */}
        <Grid size={{ xs: 12, md: 6 }}>
          <FeatureUsageCard tenantId={tenantId} />
        </Grid>

        {/* Quota Display - Removed: Tenants should not see quota management UI */}
        {/* Only superadmin can view/manage quotas via /dashboard/superadmin */}

        {/* Demo Configuration - Removed: Tenants should not configure quotas */}
        {/* Only superadmin can configure quotas via /dashboard/superadmin */}

        {/* Quick Actions */}
        
      </Grid>
      </DashboardContent>
    </PageGate>
  );
}
