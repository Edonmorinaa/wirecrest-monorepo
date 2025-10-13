import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Dialog from '@mui/material/Dialog';
import TextField from '@mui/material/TextField';
import ButtonBase from '@mui/material/ButtonBase';
import Typography from '@mui/material/Typography';
import InputAdornment from '@mui/material/InputAdornment';
import CircularProgress from '@mui/material/CircularProgress';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';
import { SearchNotFound } from 'src/components/search-not-found';

// ----------------------------------------------------------------------

export function TeamsAddressListDialog({
  sx,
  open,
  onClose,
  selected,
  onSelect,
  title = 'Select Customer (Team)',
  ...other
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchTeams = useCallback(async (search = '') => {
    try {
      setLoading(true);
      setError(null);

      const searchParams = new URLSearchParams();
      if (search) {
        searchParams.set('search', search);
      }

      const response = await fetch(`/api/teams/for-invoicing?${searchParams.toString()}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setTeams(data);
    } catch (err) {
      console.error('Failed to fetch teams:', err);
      setError(err.message || 'Failed to fetch teams');
      setTeams([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      fetchTeams(searchQuery);
    }
  }, [open, searchQuery, fetchTeams]);

  const handleSearchChange = useCallback((event) => {
    setSearchQuery(event.target.value);
  }, []);

  const handleSelectTeam = useCallback(
    (team) => {
      onSelect(team);
      setSearchQuery('');
      onClose();
    },
    [onClose, onSelect]
  );

  const notFound = !teams.length && !loading && searchQuery;

  const renderList = () => {
    if (loading) {
      return (
        <Box sx={{ p: 5, textAlign: 'center' }}>
          <CircularProgress size={32} />
          <Typography variant="body2" sx={{ mt: 1, color: 'text.secondary' }}>
            Loading teams...
          </Typography>
        </Box>
      );
    }

    if (error) {
      return (
        <Box sx={{ p: 5, textAlign: 'center' }}>
          <Iconify icon="solar:danger-bold" sx={{ fontSize: 48, color: 'error.main', mb: 1 }} />
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {error}
          </Typography>
        </Box>
      );
    }

    return (
      <Scrollbar sx={{ p: 0.5, maxHeight: 480 }}>
        <Box sx={{ gap: 0.5, display: 'flex', flexDirection: 'column' }}>
          {teams.map((team) => (
            <ButtonBase
              key={team.id}
              onClick={() => handleSelectTeam(team)}
              sx={{
                py: 1,
                px: 1.5,
                gap: 0.5,
                width: 1,
                borderRadius: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                ...(selected(team.id) && { bgcolor: 'action.selected' }),
              }}
            >
              <Box sx={{ gap: 1, display: 'flex', alignItems: 'center', width: 1 }}>
                <Typography variant="subtitle2" sx={{ flexGrow: 1 }}>
                  {team.name}
                </Typography>
                <Label 
                  color={
                    team.subscriptionTier === 'FREE' ? 'default' :
                    team.subscriptionTier === 'STARTER' ? 'info' :
                    team.subscriptionTier === 'PROFESSIONAL' ? 'success' :
                    'warning'
                  }
                  size="small"
                >
                  {team.subscriptionTier}
                </Label>
              </Box>

              <Box sx={{ color: 'primary.main', typography: 'caption' }}>
                @{team.slug}
              </Box>

              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                {team.memberCount} member{team.memberCount !== 1 ? 's' : ''}
                {team.hasStripeCustomer && ' • Stripe Customer'}
              </Typography>

              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                {team.email}
              </Typography>
            </ButtonBase>
          ))}
        </Box>
      </Scrollbar>
    );
  };

  return (
    <Dialog fullWidth maxWidth="sm" open={open} onClose={onClose} sx={sx} {...other}>
      <Box
        sx={{
          py: 3,
          pl: 3,
          pr: 1.5,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Typography variant="h6">{title}</Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {loading && <CircularProgress size={16} />}
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {teams.length} team{teams.length !== 1 ? 's' : ''}
          </Typography>
        </Box>
      </Box>

      <Box sx={{ px: 2, pb: 2 }}>
        <TextField
          fullWidth
          value={searchQuery}
          onChange={handleSearchChange}
          placeholder="Search teams by name or slug..."
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <Iconify icon="eva:search-fill" sx={{ color: 'text.disabled' }} />
                </InputAdornment>
              ),
            },
          }}
        />
      </Box>

      {notFound ? (
        <SearchNotFound query={searchQuery} sx={{ px: 3, pt: 5, pb: 10 }} />
      ) : (
        renderList()
      )}
    </Dialog>
  );
}
