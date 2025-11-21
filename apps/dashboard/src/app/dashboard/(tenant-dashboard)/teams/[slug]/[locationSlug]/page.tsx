import { Suspense } from 'react';

import { PageLoading } from 'src/components/loading/page-loading';

import { LocationOverviewView } from 'src/sections/overview/location';

/**
 * Location Overview Page
 * 
 * This page serves as the landing page for a location.
 * Shows unified statistics and quick access to all connected platforms.
 * URL: /dashboard/teams/{teamSlug}/{locationSlug}
 */
export default function LocationDefaultPage() {
  return (
    <Suspense fallback={<PageLoading message="Loading overview..." />}>
      <LocationOverviewView />
    </Suspense>
  );
}

