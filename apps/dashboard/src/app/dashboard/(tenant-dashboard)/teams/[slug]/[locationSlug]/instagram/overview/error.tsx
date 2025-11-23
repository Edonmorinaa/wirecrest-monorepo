'use client';

import { ErrorView } from 'src/sections/error';

// ----------------------------------------------------------------------

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return <ErrorView error={error} reset={reset} />;
}

