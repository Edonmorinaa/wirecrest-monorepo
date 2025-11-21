import { redirect } from 'next/navigation';

// ----------------------------------------------------------------------

// Locations are now shown at the root team page
// Redirect to /teams/[slug] instead

export default async function LocationsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  redirect(`/dashboard/teams/${slug}`);
}

