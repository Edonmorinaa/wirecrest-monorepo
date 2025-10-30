import { PageGate } from '@/components/gates/PageGate';
import { StripeFeatureLookupKeys } from '@wirecrest/billing';
import { getTenantBySlug } from '@/actions/tenants';
import { notFound } from 'next/navigation';
import { CONFIG } from 'src/global-config';

import { FacebookReviewsView } from 'src/sections/overview/facebook-reviews/view';

// ----------------------------------------------------------------------

export const metadata = { title: `Facebook Reviews | Dashboard - ${CONFIG.appName}` };

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  
  // Fetch tenant by slug
  const tenant = await getTenantBySlug(slug);
  
  // Handle case where tenant is not found
  if (!tenant) {
    notFound();
  }

  return (
    <PageGate feature={StripeFeatureLookupKeys.FACEBOOK_REVIEWS} teamId={tenant.id}>
      <FacebookReviewsView />
    </PageGate>
  );
}
