import { Suspense } from 'react';

import { PageLoading } from 'src/components/loading/page-loading';
import { FacebookOverviewView } from 'src/sections/overview/facebook/view';

// ----------------------------------------------------------------------

export default function Page() {
  return (
    <Suspense fallback={<PageLoading message="Loading Facebook overview..." />}>
      <FacebookOverviewView />
    </Suspense>
  );
}
