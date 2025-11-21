'use client';

import { useMemo, useCallback } from 'react';
import { usePopover } from 'minimal-shared/hooks';
import { useRouter, useParams } from 'next/navigation';

import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import MenuList from '@mui/material/MenuList';
import MenuItem from '@mui/material/MenuItem';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';
import ButtonBase from '@mui/material/ButtonBase';
import Button, { buttonClasses } from '@mui/material/Button';

import useTeam from 'src/hooks/useTeam';
import { useLocations } from 'src/hooks/useLocations';

import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';
import { CustomPopover } from 'src/components/custom-popover';

// ----------------------------------------------------------------------

export function LocationsPopover({ sx, ...other }) {
  const mediaQuery = 'sm';
  const router = useRouter();
  const params = useParams();

  const { open, anchorEl, onClose, onOpen } = usePopover();

  // Get current team slug
  const currentTeamSlug = params?.slug;
  const { team } = useTeam(currentTeamSlug);

  // Fetch locations for the current team
  const { locations, isLoading } = useLocations(team?.slug || '');

  // Determine the active location (could be from URL params or first location)
  const activeLocation = useMemo(() => {
    const locationSlug = params?.locationSlug;
    if (locationSlug && locations) {
      return locations.find((loc) => loc.slug === locationSlug || loc.id === locationSlug);
    }
    return locations?.[0] || null;
  }, [locations, params?.locationSlug]);

  const handleChangeLocation = useCallback(
    (newLocation) => {
      // Navigate to the selected location's overview page
      // URL structure: /dashboard/teams/{teamSlug}/{locationSlug}
      if (activeLocation?.slug !== newLocation.slug) {
        router.push(`/${newLocation.slug}`);
      } 
      onClose();
    },
    [router, team?.slug, onClose, activeLocation]
  );

  const handleAddLocation = useCallback(() => {
    // Navigate to locations management page to add a new location
    router.push(`/dashboard/teams/${team?.slug}/locations`);
    onClose();
  }, [router, team?.slug, onClose]);

  const buttonBg = {
    height: 1,
    zIndex: -1,
    opacity: 0,
    content: "''",
    borderRadius: 1,
    position: 'absolute',
    visibility: 'hidden',
    bgcolor: 'action.hover',
    width: 'calc(100% + 8px)',
    transition: (theme) =>
      theme.transitions.create(['opacity', 'visibility'], {
        easing: theme.transitions.easing.sharp,
        duration: theme.transitions.duration.shorter,
      }),
    ...(open && {
      opacity: 1,
      visibility: 'visible',
    }),
  };

  const renderButton = () => {
    if (isLoading) {
      return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.5 }}>
          <Skeleton variant="circular" width={24} height={24} />
          <Skeleton 
            variant="text" 
            width={120} 
            sx={{ display: { xs: 'none', [mediaQuery]: 'block' } }} 
          />
        </Box>
      );
    }

    if (!activeLocation) {
      return (
        <ButtonBase
          disableRipple
          onClick={handleAddLocation}
          sx={[
            {
              py: 0.5,
              gap: { xs: 0.5, [mediaQuery]: 1 },
              '&::before': buttonBg,
            },
            ...(Array.isArray(sx) ? sx : [sx]),
          ]}
          {...other}
        >
          <Iconify 
            width={24} 
            icon="mingcute:add-line" 
            sx={{ color: 'text.secondary' }} 
          />
          <Box
            component="span"
            sx={{ typography: 'subtitle2', display: { xs: 'none', [mediaQuery]: 'inline-flex' } }}
          >
            Add location
          </Box>
        </ButtonBase>
      );
    }

    return (
      <ButtonBase
        disableRipple
        onClick={onOpen}
        sx={[
          {
            py: 0.5,
            gap: { xs: 0.5, [mediaQuery]: 1 },
            '&::before': buttonBg,
          },
          ...(Array.isArray(sx) ? sx : [sx]),
        ]}
        {...other}
      >
        <Iconify 
          width={24} 
          icon="mdi:map-marker" 
          sx={{ color: 'text.secondary' }} 
        />

        <Box
          component="span"
          sx={{ typography: 'subtitle2', display: { xs: 'none', [mediaQuery]: 'inline-flex' } }}
        >
          {activeLocation.name}
        </Box>

        <Iconify width={16} icon="carbon:chevron-sort" sx={{ color: 'text.disabled' }} />
      </ButtonBase>
    );
  };

  const renderMenuList = () => (
    <CustomPopover
      open={open}
      anchorEl={anchorEl}
      onClose={onClose}
      slotProps={{
        arrow: { placement: 'top-left' },
        paper: { sx: { mt: 0.5, ml: -1.55, width: 280 } },
      }}
    >
      <Scrollbar sx={{ maxHeight: 240 }}>
        <MenuList>
          {locations?.length > 0 ? (
            locations.map((option) => (
              <MenuItem
                key={option.id}
                selected={option.id === activeLocation?.id}
                onClick={() => handleChangeLocation(option)}
                sx={{ height: 48 }}
              >
                <Iconify 
                  width={24} 
                  icon="mdi:map-marker" 
                  sx={{ color: 'text.secondary', mr: 2 }} 
                />

                <Typography
                  noWrap
                  component="span"
                  variant="body2"
                  sx={{ flexGrow: 1, fontWeight: 'fontWeightMedium' }}
                >
                  {option.name}
                </Typography>

                {option.address && (
                  <Typography
                    noWrap
                    component="span"
                    variant="caption"
                    sx={{ color: 'text.secondary', maxWidth: 100 }}
                  >
                    {option.address}
                  </Typography>
                )}
              </MenuItem>
            ))
          ) : (
            <MenuItem disabled>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                No locations found
              </Typography>
            </MenuItem>
          )}
        </MenuList>
      </Scrollbar>

      <Divider sx={{ my: 0.5, borderStyle: 'dashed' }} />

      <Button
        fullWidth
        startIcon={<Iconify width={18} icon="mingcute:add-line" />}
        onClick={handleAddLocation}
        sx={{
          gap: 2,
          justifyContent: 'flex-start',
          fontWeight: 'fontWeightMedium',
          [`& .${buttonClasses.startIcon}`]: {
            m: 0,
            width: 24,
            height: 24,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          },
        }}
      >
        Add location
      </Button>
    </CustomPopover>
  );

  return (
    <>
      {renderButton()}
      {renderMenuList()}
    </>
  );
}

