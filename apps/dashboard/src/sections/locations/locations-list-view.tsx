'use client';

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';

import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon, Visibility as ViewIcon } from '@mui/icons-material';

import { paths } from 'src/routes/paths';

import useTeam from 'src/hooks/useTeam';
import { useLocations, useDeleteLocation } from 'src/hooks/useLocations';

import { DashboardContent } from 'src/layouts/dashboard';

import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import { LocationFormDialog } from './location-form-dialog';

// ----------------------------------------------------------------------

export function LocationsListView() {
  const router = useRouter();
  const params = useParams();
  const teamSlug = params.slug as string;
  
  const { team, isLoading: teamLoading, isError: teamError } = useTeam(teamSlug);
  const { locations, isLoading, refetch } = useLocations(teamSlug);
  const { deleteLocation, isDeleting } = useDeleteLocation();

  const [formOpen, setFormOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<any>(null);

  const handleCreate = () => {
    setEditingLocation(null);
    setFormOpen(true);
  };

  const handleEdit = (location: any) => {
    setEditingLocation(location);
    setFormOpen(true);
  };

  const handleDelete = async (locationId: string) => {
    if (window.confirm('Are you sure you want to delete this location? This will remove all associated platform profiles.')) {
      await deleteLocation({ locationId });
      refetch();
    }
  };

  const handleView = (location: any) => {
    const locationSlug = location.name.toLowerCase().replace(/\s+/g, '-');
    router.push(paths.dashboard.locations.bySlug(teamSlug, locationSlug));
  };

  const handleFormClose = (success?: boolean) => {
    setFormOpen(false);
    setEditingLocation(null);
    if (success) {
      refetch();
    }
  };

  if (teamLoading || isLoading) {
    return (
      <DashboardContent>
        <Typography>Loading...</Typography>
      </DashboardContent>
    );
  }

  // Handle team not found error
  if (teamError) {
    return (
      <DashboardContent>
        <Card sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="h5" color="error" gutterBottom>
            Team Not Found
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
            The team &quot;{teamSlug}&quot; does not exist or you don&apos;t have access to it.
          </Typography>
          <Button 
            variant="contained" 
            onClick={() => router.push(paths.dashboard.teams.root)}
          >
            Back to Teams
          </Button>
        </Card>
      </DashboardContent>
    );
  }

  return (
    <DashboardContent>
        <CustomBreadcrumbs
        heading={`${team?.name || teamSlug} - Locations`}
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Teams', href: paths.dashboard.teams.root },
        ]}
        action={
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleCreate}
          >
            Add Location
          </Button>
        }
        sx={{ mb: 3 }}
      />

      <Card>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Address</TableCell>
                <TableCell>City / Country</TableCell>
                <TableCell>Platforms</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {locations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 8 }}>
                    <Typography variant="body2" color="text.secondary">
                      No locations found. Create your first location to get started.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                locations.map((location) => (
                  <TableRow key={location.id} hover>
                    <TableCell>
                      <Typography variant="subtitle2">{location.name}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {location.address || '—'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {[location.city, location.country].filter(Boolean).join(', ') || '—'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={0.5} flexWrap="wrap">
                        {location.googleBusinessProfile && (
                          <Chip label="Google" size="small" color="primary" variant="outlined" />
                        )}
                        {location.facebookBusinessProfile && (
                          <Chip label="Facebook" size="small" color="info" variant="outlined" />
                        )}
                        {location.tripAdvisorBusinessProfile && (
                          <Chip label="TripAdvisor" size="small" color="success" variant="outlined" />
                        )}
                        {location.bookingBusinessProfile && (
                          <Chip label="Booking" size="small" color="warning" variant="outlined" />
                        )}
                      </Stack>
                    </TableCell>
                    <TableCell align="right">
                      <Stack direction="row" spacing={1} justifyContent="flex-end">
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() => handleView(location)}
                        >
                          <ViewIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          color="default"
                          onClick={() => handleEdit(location)}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleDelete(location.id)}
                          disabled={isDeleting}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      <LocationFormDialog
        open={formOpen}
        location={editingLocation}
        teamSlug={teamSlug}
        onClose={handleFormClose}
      />
    </DashboardContent>
  );
}

