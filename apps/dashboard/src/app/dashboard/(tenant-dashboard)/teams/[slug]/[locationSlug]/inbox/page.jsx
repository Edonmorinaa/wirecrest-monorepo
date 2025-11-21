import { Suspense } from 'react';
import Box from '@mui/material/Box';
import LinearProgress from '@mui/material/LinearProgress';
import { CONFIG } from 'src/global-config';

import { InboxView } from 'src/sections/overview/inbox/view';

// ----------------------------------------------------------------------

export const metadata = { title: `Inbox | Dashboard - ${CONFIG.appName}` };

export default function Page() {
  return <Suspense fallback={
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '80vh',
        width: '100%',
      }}
    >
      <Box sx={{ width: '300px' }}>
        <LinearProgress />
      </Box>
    </Box>
  }>
    <InboxView />
  </Suspense> 
}
