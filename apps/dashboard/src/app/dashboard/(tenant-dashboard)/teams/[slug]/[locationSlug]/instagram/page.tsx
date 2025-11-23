import { redirect } from 'next/navigation';

// ----------------------------------------------------------------------

/**
 * Redirect Instagram root to overview page
 */
export default async function InstagramPage({ 
  params 
}: { 
  params: Promise<{ slug: string; locationSlug: string }> 
}) {
  const { slug, locationSlug } = await params;
  redirect(`/dashboard/teams/${slug}/${locationSlug}/instagram/overview`);
}

