'use client';

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';

import { useLocations } from 'src/hooks/useLocations';

/**
 * Location Default Page
 * 
 * This page handles the default view when navigating to a location.
 * URL: /dashboard/teams/{teamSlug}/{locationSlug}
 * 
 * Logic:
 * 1. If location exists and has Google Business connected, redirect to google/overview
 * 2. Otherwise, show a location dashboard/overview (to be implemented)
 * 3. For now, we'll redirect to google/overview as the default platform
 */
export default function LocationDefaultPage() {
  
  // Show loading state while redirecting
  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <h1 className="text-2xl font-bold">Overview page - to be implemented</h1>
    </div>
  );
}

