import { Suspense } from 'react';

import { InstagramOverviewView } from 'src/sections/team/instagram/view/instagram-overview-view';
import { PageLoading } from 'src/components/loading/page-loading';

// ----------------------------------------------------------------------

export default function Page() {
  return (
    <Suspense fallback={<PageLoading message="Loading Instagram overview..." />}>
      <InstagramOverviewView />
    </Suspense>
  );
}

