'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';

import { DashboardContent } from 'src/layouts/dashboard';

import { Iconify } from 'src/components/iconify';
import { EmptyContent } from 'src/components/empty-content';

// ----------------------------------------------------------------------

export function TeamDashboardView({ teams = [], isLoading }) {
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && teams.length > 0) {
      // Redirect to the first team if teams exist
      router.replace(`/dashboard/teams/${teams[0].slug}`);
    }
  }, [teams, isLoading, router]);

  if (isLoading) {
    return (
      <DashboardContent>
        <Box sx={{ py: 12, textAlign: 'center' }}>
          <Typography variant="h6" sx={{ mb: 1 }}>
            Loading teams...
          </Typography>
        </Box>
      </DashboardContent>
    );
  }

  if (teams.length === 0) {
    return (
      <DashboardContent>
        <EmptyContent
          filled
          title="No teams found"
          description="Create your first team to get started with managing your projects and collaborating with your team members."
          action={
            <Button
              variant="contained"
              startIcon={<Iconify icon="mingcute:add-line" />}
              onClick={() => router.push('/dashboard/teams?newTeam=true')}
            >
              Create Team
            </Button>
          }
          sx={{ py: 10 }}
        />
      </DashboardContent>
    );
  }

  return (
    <DashboardContent>
      <Box sx={{ py: 12, textAlign: 'center' }}>
        <Typography variant="h6" sx={{ mb: 1 }}>
          Redirecting to your team...
        </Typography>
      </Box>
    </DashboardContent>
  );
}
