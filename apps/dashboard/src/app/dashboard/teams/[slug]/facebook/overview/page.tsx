import { StripeFeatureLookupKeys } from '@wirecrest/billing';
import { PageGate } from '@/components/gates/PageGate';
import { FacebookOverviewView } from 'src/sections/overview/facebook/view';
import { getTenantBySlug } from '@/actions/tenants';
import { notFound } from 'next/navigation';

// ----------------------------------------------------------------------

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  
  // Fetch tenant by slug
  const tenant = await getTenantBySlug(slug);
  
  // Handle case where tenant is not found
  if (!tenant) {
    notFound();
  }

  return (
    <PageGate feature={StripeFeatureLookupKeys.FACEBOOK_OVERVIEW} teamId={tenant.id}>
      <FacebookOverviewView />
    </PageGate>
  );
}
