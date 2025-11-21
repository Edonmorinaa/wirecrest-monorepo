'use client';

import { useCallback, useMemo } from 'react';
import { usePopover } from 'minimal-shared/hooks';
import { useRouter } from 'next/navigation';

import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import MenuList from '@mui/material/MenuList';
import MenuItem from '@mui/material/MenuItem';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';
import ButtonBase from '@mui/material/ButtonBase';
import Button, { buttonClasses } from '@mui/material/Button';

import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';
import { CustomPopover } from 'src/components/custom-popover';

/**
 * LocationSelector - Superadmin component for selecting locations
 * 
 * @param {Object} props
 * @param {Array} props.locations - Array of location objects
 * @param {Object} props.selectedLocation - Currently selected location
 * @param {Function} props.onLocationChange - Callback when location is selected
 * @param {Function} props.onAddLocation - Callback to add a new location
 * @param {boolean} props.isLoading - Loading state
 * @param {Object} props.sx - MUI sx prop for styling
 */
export function LocationSelector({
  locations = [],
  selectedLocation = null,
  onLocationChange,
  onAddLocation,
  isLoading = false,
  sx,
  ...other
}) {
  const mediaQuery = 'sm';
  const { open, anchorEl, onClose, onOpen } = usePopover();

  const handleChangeLocation = useCallback(
    (newLocation) => {
      if (onLocationChange) {
        onLocationChange(newLocation);
      }
      onClose();
    },
    [onLocationChange, onClose]
  );

  const handleAddLocation = useCallback(() => {
    if (onAddLocation) {
      onAddLocation();
    }
    onClose();
  }, [onAddLocation, onClose]);

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

    if (!selectedLocation && locations.length === 0) {
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

    const displayLocation = selectedLocation || locations[0];

    return (
      <ButtonBase
        disableRipple
        onClick={onOpen}
        sx={[
          {
            py: 0.5,
            px: 1,
            gap: { xs: 0.5, [mediaQuery]: 1 },
            '&::before': buttonBg,
            borderRadius: 1,
            border: (theme) => `1px solid ${theme.palette.divider}`,
          },
          ...(Array.isArray(sx) ? sx : [sx]),
        ]}
        {...other}
      >
        <Iconify
          width={20}
          icon="mdi:map-marker"
          sx={{ color: 'text.secondary' }}
        />

        <Box
          component="span"
          sx={{ typography: 'subtitle2', display: { xs: 'none', [mediaQuery]: 'inline-flex' } }}
        >
          {displayLocation?.name || 'Select location'}
        </Box>

        {locations.length > 1 && (
          <Iconify width={16} icon="carbon:chevron-sort" sx={{ color: 'text.disabled' }} />
        )}
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
        paper: { sx: { mt: 0.5, ml: -1.55, width: 320 } },
      }}
    >
      <Scrollbar sx={{ maxHeight: 360 }}>
        <MenuList>
          {locations.length > 0 ? (
            locations.map((option) => (
              <MenuItem
                key={option.id}
                selected={option.id === selectedLocation?.id}
                onClick={() => handleChangeLocation(option)}
                sx={{ minHeight: 56, px: 2 }}
              >
                <Iconify
                  width={24}
                  icon="mdi:map-marker"
                  sx={{ color: 'text.secondary', mr: 2, flexShrink: 0 }}
                />

                <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                  <Typography
                    noWrap
                    component="div"
                    variant="body2"
                    sx={{ fontWeight: 'fontWeightMedium', mb: 0.5 }}
                  >
                    {option.name}
                  </Typography>

                  {(option.city || option.address) && (
                    <Typography
                      noWrap
                      component="div"
                      variant="caption"
                      sx={{ color: 'text.secondary' }}
                    >
                      {option.city || option.address}
                    </Typography>
                  )}
                </Box>

                {option.platformCount !== undefined && (
                  <Typography
                    variant="caption"
                    sx={{
                      color: 'text.secondary',
                      bgcolor: 'action.hover',
                      px: 1,
                      py: 0.25,
                      borderRadius: 0.5,
                      ml: 1,
                      flexShrink: 0,
                    }}
                  >
                    {option.platformCount} platforms
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

      {onAddLocation && (
        <>
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
        </>
      )}
    </CustomPopover>
  );

  return (
    <>
      {renderButton()}
      {renderMenuList()}
    </>
  );
}

