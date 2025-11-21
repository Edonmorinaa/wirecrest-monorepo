import { Suspense } from 'react';

import { GoogleOverviewView } from 'src/sections/overview/google/view';
import { PageLoading } from 'src/components/loading/page-loading';

// ----------------------------------------------------------------------

export default function Page() {
  return (
    <Suspense fallback={<PageLoading message="Loading Google overview..." />}>
      <GoogleOverviewView />
    </Suspense>
  );
}
