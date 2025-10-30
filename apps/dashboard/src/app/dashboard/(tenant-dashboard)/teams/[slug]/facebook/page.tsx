import { PageGate } from '@/components/gates/PageGate';
import { getTenantBySlug } from '@/actions/tenants';
import { notFound } from 'next/navigation';

import Card from '@mui/material/Card';
import Typography from '@mui/material/Typography';

import { paths } from 'src/routes/paths';

import { DashboardContent } from 'src/layouts/dashboard';

import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

// ----------------------------------------------------------------------

export default async function FacebookBusinessPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  
  // Fetch tenant by slug
  const tenant = await getTenantBySlug(slug);
  
  // Handle case where tenant is not found
  if (!tenant) {
    notFound();
  }

  return (
    <PageGate teamId={tenant.id}>
      <DashboardContent>
      <CustomBreadcrumbs
        heading="Facebook Business"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Teams', href: paths.dashboard.teams.root },
          { name: slug, href: paths.dashboard.teams.bySlug(slug) },
          { name: 'Facebook Business' },
        ]}
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <Card sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          Facebook Business
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Facebook Business management for team: <strong>{slug}</strong>
        </Typography>
        <Typography variant="body2" sx={{ mt: 2 }}>
          This page is team-scoped and accessible at: <code>/dashboard/teams/{slug}/facebook</code>
        </Typography>
      </Card>
      </DashboardContent>
    </PageGate>
  );
}
