'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

import { useLocations } from 'src/hooks/useLocations';

import { LocationsListView } from 'src/sections/locations';

// ----------------------------------------------------------------------

export default function TeamPage() {
  const params = useParams();
  const router = useRouter();
  const teamSlug = params.slug as string;
  
  const { locations, isLoading } = useLocations(teamSlug);

  // Redirect to first location if locations exist
  useEffect(() => {
    if (!isLoading && locations && locations.length > 0) {
      const firstLocation = locations[0];
      // Redirect to the first location's overview page
      // Use slug if available, otherwise fall back to id
      const locationSlug = firstLocation.slug || firstLocation.id;
      // Navigate to location's default page using relative path
      // When on test5.wirecrest.local/, redirect to /location-slug
      router.replace(`/${locationSlug}`);
    }
  }, [isLoading, locations, router, teamSlug]);

  // Show locations list (user can select a location or create one)
  // If no locations exist, this view will show an empty state with "Create Location" button
  return <LocationsListView />;
}
