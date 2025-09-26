'use client';

import { useParams } from 'next/navigation';

import Card from '@mui/material/Card';
import Typography from '@mui/material/Typography';

import { paths } from 'src/routes/paths';

import { DashboardContent } from 'src/layouts/dashboard';

import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

// ----------------------------------------------------------------------

export default function BookingPage() {
  const params = useParams();
  const { slug } = params;

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading="Booking.com"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Teams', href: paths.dashboard.teams.root },
          { name: slug, href: paths.dashboard.teams.bySlug(slug) },
          { name: 'Booking.com' },
        ]}
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <Card sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          Booking.com
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Booking.com property management for team: <strong>{slug}</strong>
        </Typography>
        <Typography variant="body2" sx={{ mt: 2 }}>
          This page is team-scoped and accessible at: <code>/dashboard/teams/{slug}/booking</code>
        </Typography>
      </Card>
    </DashboardContent>
  );
}
