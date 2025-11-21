'use client';

import { useMemo, useCallback } from 'react';
import { usePopover } from 'minimal-shared/hooks';
import { useRouter, useParams } from 'next/navigation';

import Box from '@mui/material/Box';
import Avatar from '@mui/material/Avatar';
import Divider from '@mui/material/Divider';
import MenuList from '@mui/material/MenuList';
import MenuItem from '@mui/material/MenuItem';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';
import ButtonBase from '@mui/material/ButtonBase';
import Button, { buttonClasses } from '@mui/material/Button';

import useTeam from 'src/hooks/useTeam';
import useTeams from 'src/hooks/useTeams';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';
import { CustomPopover } from 'src/components/custom-popover';

// ----------------------------------------------------------------------

export function TeamsPopover({ sx, ...other }) {
  const mediaQuery = 'sm';
  const router = useRouter();
  const params = useParams();

  const { open, anchorEl, onClose, onOpen } = usePopover();

  // Fetch all teams for the user
  const { teams, isLoading: isLoadingTeams } = useTeams();
  
  // Get current team based on slug from URL
  const currentTeamSlug = params?.slug;
  const { team: currentTeam, isLoading: isLoadingCurrentTeam } = useTeam(currentTeamSlug);

  // Determine the active team
  const activeTeam = useMemo(() => {
    if (currentTeam) return currentTeam;
    if (teams && teams.length > 0) return teams[0];
    return null;
  }, [currentTeam, teams]);

  const handleChangeTeam = useCallback(
    (newTeam) => {
      // Navigate to the selected team's dashboard
      if (activeTeam?.slug !== newTeam.slug) {
        router.push(`/dashboard/teams/${newTeam.slug}`);
      }
      onClose();
    },
    [router, onClose, activeTeam]
  );

  const handleCreateTeam = useCallback(() => {
    router.push('/dashboard/teams/new');
    onClose();
  }, [router, onClose]);

  const isLoading = isLoadingTeams || isLoadingCurrentTeam;

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
            width={100} 
            sx={{ display: { xs: 'none', [mediaQuery]: 'block' } }} 
          />
        </Box>
      );
    }

    if (!activeTeam) {
      return null;
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
        <Avatar 
          alt={activeTeam.name}
          src={activeTeam.logo}
          sx={{ width: 24, height: 24 }}
        >
          {activeTeam.name?.charAt(0)?.toUpperCase()}
        </Avatar>

        <Box
          component="span"
          sx={{ typography: 'subtitle2', display: { xs: 'none', [mediaQuery]: 'inline-flex' } }}
        >
          {activeTeam.name}
        </Box>

        {/* <Label
          color={activeTeam.plan === 'Free' ? 'default' : 'info'}
          sx={{
            height: 22,
            cursor: 'inherit',
            display: { xs: 'none', [mediaQuery]: 'inline-flex' },
          }}
        >
          {activeTeam.plan || 'Free'}
        </Label> */}

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
        paper: { sx: { mt: 0.5, ml: -1.55, width: 240 } },
      }}
    >
      <Scrollbar sx={{ maxHeight: 240 }}>
        <MenuList>
          {teams?.map((option) => (
            <MenuItem
              key={option.id}
              selected={option.id === activeTeam?.id}
              onClick={() => handleChangeTeam(option)}
              sx={{ height: 48 }}
            >
              <Avatar 
                alt={option.name} 
                src={option.logo} 
                sx={{ width: 24, height: 24 }}
              >
                {option.name?.charAt(0)?.toUpperCase()}
              </Avatar>

              <Typography
                noWrap
                component="span"
                variant="body2"
                sx={{ flexGrow: 1, fontWeight: 'fontWeightMedium', ml: 1.5 }}
              >
                {option.name}
              </Typography>

              {/* <Label color={option.plan === 'Free' ? 'default' : 'info'}>
                {option.plan || 'Free'}
              </Label> */}
            </MenuItem>
          ))}
        </MenuList>
      </Scrollbar>

      {/* <Divider sx={{ my: 0.5, borderStyle: 'dashed' }} /> */}

      {/* <Button
        fullWidth
        startIcon={<Iconify width={18} icon="mingcute:add-line" />}
        onClick={handleCreateTeam}
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
        Create team
      </Button> */}
    </CustomPopover>
  );

  return (
    <>
      {renderButton()}
      {renderMenuList()}
    </>
  );
}

