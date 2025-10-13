import { CONFIG } from 'src/global-config';
import { StripeFeatureLookupKeys } from '@wirecrest/billing';
import { PageGate } from '@/components/gates/PageGate';
import { getTenantBySlug } from '@/actions/tenants';
import { notFound } from 'next/navigation';
import { GoogleReviewsView } from 'src/sections/overview/google-reviews/view';

// ----------------------------------------------------------------------

export const metadata = { title: `Google Reviews | Dashboard - ${CONFIG.appName}` };

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  
  // Fetch tenant by slug
  const tenant = await getTenantBySlug(slug);
  
  // Handle case where tenant is not found
  if (!tenant) {
    notFound();
  }

  return (
    <PageGate feature={StripeFeatureLookupKeys.GOOGLE_REVIEWS} teamId={tenant.id}>
      <GoogleReviewsView />
    </PageGate>
  );
}
