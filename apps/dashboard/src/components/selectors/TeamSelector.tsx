'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

import Button from '@mui/material/Button';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import { Building, Check, ChevronDown, Plus } from 'lucide-react';

import { paths } from 'src/routes/paths';

import { trpc } from 'src/lib/trpc/client';

/**
 * Team Selector Component
 * Allows users to switch between different teams they have access to
 */
export function TeamSelector() {
  const params = useParams();
  const router = useRouter();
  const currentTeamSlug = params?.slug as string;

  const { data: teams, isLoading } = trpc.teams.list.useQuery();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleSelectTeam = (teamSlug: string) => {
    handleClose();
    // Switching teams means switching subdomains
    // Redirect to the new team's subdomain root
    const protocol = window.location.protocol;
    const rootDomain = window.location.hostname.split('.').slice(-2).join('.'); // Get base domain (e.g., wirecrest.local)
    const port = window.location.port ? `:${window.location.port}` : '';
    const newUrl = `${protocol}//${teamSlug}.${rootDomain}${port}/`;
    window.location.href = newUrl;
  };

  const handleCreateTeam = () => {
    handleClose();
    router.push(paths.dashboard.teams.create);
  };

  // Find current team
  const currentTeam = teams?.find((team) => team.slug === currentTeamSlug);

  // Don't show selector if not on a team page
  if (!currentTeamSlug) {
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
        startIcon={<Building size={16} />}
        endIcon={<ChevronDown size={16} />}
      >
        {isLoading ? (
          'Loading...'
        ) : currentTeam ? (
          currentTeam.name
        ) : (
          currentTeamSlug
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
        {teams?.map((team) => {
          const isSelected = team.slug === currentTeamSlug;

          return (
            <MenuItem
              key={team.id}
              onClick={() => handleSelectTeam(team.slug)}
              selected={isSelected}
            >
              <ListItemIcon>
                {isSelected ? <Check size={20} /> : <Building size={20} />}
              </ListItemIcon>
              <ListItemText
                primary={team.name}
                secondary={team.domain}
                secondaryTypographyProps={{
                  noWrap: true,
                  fontSize: 12,
                }}
              />
            </MenuItem>
          );
        })}
        <MenuItem onClick={handleCreateTeam} sx={{ borderTop: 1, borderColor: 'divider', mt: 1 }}>
          <ListItemIcon>
            <Plus size={20} />
          </ListItemIcon>
          <ListItemText primary="Create Team" />
        </MenuItem>
      </Menu>
    </>
  );
}

