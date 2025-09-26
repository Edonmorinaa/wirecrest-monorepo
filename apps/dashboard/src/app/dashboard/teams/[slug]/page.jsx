'use client';

import { useParams } from 'next/navigation';

import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';

import { paths } from 'src/routes/paths';

import { DashboardContent } from 'src/layouts/dashboard';

import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

// ----------------------------------------------------------------------

export default function TeamPage() {
  const params = useParams();
  const { slug } = params;

  return (
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
        <Grid size={{ xs: 12 }}>
          <Card sx={{ p: 3 }}>
            <Typography variant="h4" gutterBottom>
              Welcome to {slug}
            </Typography>
            <Typography variant="body1" color="text.secondary">
              This is the team dashboard for {slug}. Here you can manage your team&apos;s social media platforms and business listings.
            </Typography>
          </Card>
        </Grid>

        {/* Add platform cards here */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="h6" gutterBottom>
              Social Media
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Manage Instagram and TikTok accounts
            </Typography>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="h6" gutterBottom>
              Business Platforms
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Manage Google, Facebook, TripAdvisor, and Booking.com listings
            </Typography>
          </Card>
        </Grid>
      </Grid>
    </DashboardContent>
  );
}
