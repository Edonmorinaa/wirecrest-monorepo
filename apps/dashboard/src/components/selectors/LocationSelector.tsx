'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Button from '@mui/material/Button';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import { MapPin, Check, ChevronDown } from 'lucide-react';
import { useLocations } from 'src/hooks/useLocations';
import { paths } from 'src/routes/paths';

/**
 * Location Selector Component
 * Allows users to switch between different business locations within a team
 */
export function LocationSelector() {
  const params = useParams();
  const router = useRouter();
  const teamSlug = params?.slug as string;
  const locationSlug = params?.locationSlug as string;

  const { locations, isLoading } = useLocations(teamSlug);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleSelectLocation = (newLocationSlug: string) => {
    handleClose();
    // Navigate to the same platform page but with the new location
    const currentPath = window.location.pathname;
    
    // If we're on a platform page, maintain the platform context
    if (currentPath.includes('/google/')) {
      const isOverview = currentPath.includes('/overview');
      router.push(isOverview 
        ? paths.dashboard.google.overview(newLocationSlug)
        : paths.dashboard.google.reviews(newLocationSlug)
      );
    } else if (currentPath.includes('/facebook/')) {
      const isOverview = currentPath.includes('/overview');
      router.push(isOverview 
        ? paths.dashboard.facebook.overview(newLocationSlug)
        : paths.dashboard.facebook.reviews(newLocationSlug)
      );
    } else if (currentPath.includes('/tripadvisor/')) {
      const isOverview = currentPath.includes('/overview');
      router.push(isOverview 
        ? paths.dashboard.tripadvisor.overview(newLocationSlug)
        : paths.dashboard.tripadvisor.reviews(newLocationSlug)
      );
    } else if (currentPath.includes('/booking/')) {
      const isOverview = currentPath.includes('/overview');
      router.push(isOverview 
        ? paths.dashboard.booking.overview(newLocationSlug)
        : paths.dashboard.booking.reviews(newLocationSlug)
      );
    } else {
      // Default to Google overview for the new location
      router.push(paths.dashboard.google.overview(newLocationSlug));
    }
  };

  const handleManageLocations = () => {
    handleClose();
    router.push('/locations');
  };

  // Find current location
  const currentLocation = locations?.find(
    (loc) => (loc.slug || loc.id) === locationSlug
  );

  // Don't show selector if not on a team page
  if (!teamSlug) {
    return null;
  }

  // Don't show if no locations yet
  if (!isLoading && (!locations || locations.length === 0)) {
    return null;
  }

  return (
    <>
      <Button
        onClick={handleClick}
        variant="outlined"
        fullWidth
        disabled={isLoading}
        sx={{
          justifyContent: 'space-between',
          textTransform: 'none',
          borderColor: 'divider',
          '&:hover': {
            borderColor: 'primary.main',
            backgroundColor: 'action.hover',
          },
        }}
        startIcon={<MapPin size={16} />}
        endIcon={<ChevronDown size={16} />}
      >
        {isLoading ? (
          'Loading...'
        ) : currentLocation ? (
          currentLocation.name
        ) : (
          'Select Location'
        )}
      </Button>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        PaperProps={{
          sx: {
            minWidth: 240,
            maxHeight: 400,
          },
        }}
      >
        {locations?.map((location) => {
          const locSlug = location.slug || location.id;
          const isSelected = locSlug === locationSlug;

          return (
            <MenuItem
              key={location.id}
              onClick={() => handleSelectLocation(locSlug)}
              selected={isSelected}
            >
              <ListItemIcon>
                {isSelected ? <Check size={20} /> : <MapPin size={20} />}
              </ListItemIcon>
              <ListItemText
                primary={location.name}
                secondary={location.city || location.address}
                secondaryTypographyProps={{
                  noWrap: true,
                  fontSize: 12,
                }}
              />
            </MenuItem>
          );
        })}
        <MenuItem onClick={handleManageLocations} sx={{ borderTop: 1, borderColor: 'divider', mt: 1 }}>
          <ListItemText primary="Manage Locations" />
        </MenuItem>
      </Menu>
    </>
  );
}

