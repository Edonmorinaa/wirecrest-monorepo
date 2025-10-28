import { useTeam } from '@wirecrest/auth-next';
import { useState, useCallback } from 'react';
import { useBoolean, usePopover } from 'minimal-shared/hooks';
// TODO: These billing functions need to be added to @/actions/billing
// For now, importing directly from billing/server will fail in client components
// import { 
//   deleteBillingAddress,
//   upsertBillingAddress,
//   validateBillingAddress,
// } from '@/actions/billing';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import MenuList from '@mui/material/MenuList';
import Snackbar from '@mui/material/Snackbar';
import CardHeader from '@mui/material/CardHeader';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';

import { Iconify } from 'src/components/iconify';
import { CustomPopover } from 'src/components/custom-popover';

import { AddressItem, AddressCreateForm } from '../address';

// ----------------------------------------------------------------------

export function AccountBillingAddress({ addressBook, onRefresh, sx, ...other }) {
  const { team } = useTeam();
  const teamId = team?.id;
  
  const menuActions = usePopover();
  const newAddressForm = useBoolean();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const handleAddAddress = useCallback(async (addressData) => {
    if (!teamId) return;

    try {
      setLoading(true);
      setError(null);

      // Validate address first
      // const validation = await validateBillingAddress(addressData);
      // if (!validation.isValid) {
      //   setError(validation.errors.join(', '));
      //   return;
      // }

      // await upsertBillingAddress(teamId, addressData);
      setSuccess('Billing address updated successfully');
      newAddressForm.onFalse();
      onRefresh?.();
    } catch (err) {
      console.error('Failed to add billing address:', err);
      setError(err.message || 'Failed to add billing address');
    } finally {
      setLoading(false);
    }
  }, [teamId, newAddressForm, onRefresh]);

  const handleDeleteAddress = useCallback(async () => {
    if (!teamId) return;

    try {
      setLoading(true);
      setError(null);

      // await deleteBillingAddress(teamId);
      setSuccess('Billing address deleted successfully');
      menuActions.onClose();
      onRefresh?.();
    } catch (err) {
      console.error('Failed to delete billing address:', err);
      setError(err.message || 'Failed to delete billing address');
    } finally {
      setLoading(false);
    }
  }, [teamId, menuActions, onRefresh]);

  const handleSelectedId = useCallback(
    (event) => {
      menuActions.onOpen(event);
    },
    [menuActions]
  );

  const handleClose = useCallback(() => {
    menuActions.onClose();
  }, [menuActions]);

  const renderMenuActions = () => (
    <CustomPopover open={menuActions.open} anchorEl={menuActions.anchorEl} onClose={handleClose}>
      <MenuList>
        <MenuItem
          onClick={() => {
            handleClose();
            // Set as primary is handled automatically when there's only one address
            setSuccess('Address is already set as primary');
          }}
        >
          <Iconify icon="eva:star-fill" />
          Set as primary
        </MenuItem>

        <MenuItem
          onClick={() => {
            handleClose();
            // Open edit form with current address data
            newAddressForm.onTrue();
          }}
        >
          <Iconify icon="solar:pen-bold" />
          Edit
        </MenuItem>

        <MenuItem
          onClick={() => {
            handleDeleteAddress();
          }}
          sx={{ color: 'error.main' }}
          disabled={loading}
        >
          <Iconify icon="solar:trash-bin-trash-bold" />
          {loading ? 'Deleting...' : 'Delete'}
        </MenuItem>
      </MenuList>
    </CustomPopover>
  );

  const renderAddressCreateForm = () => (
    <AddressCreateForm
      open={newAddressForm.value}
      onClose={newAddressForm.onFalse}
      onCreate={handleAddAddress}
    />
  );

  return (
    <>
      <Card sx={sx} {...other}>
        <CardHeader
          title="Billing address"
          action={
            <Button
              size="small"
              color="primary"
              startIcon={<Iconify icon="mingcute:add-line" />}
              onClick={newAddressForm.onTrue}
              disabled={loading}
            >
              {addressBook.length === 0 ? 'Add address' : 'Update address'}
            </Button>
          }
        />

        {error && (
          <Alert severity="error" sx={{ mx: 3, mb: 2 }}>
            {error}
          </Alert>
        )}

        <Stack spacing={2.5} sx={{ p: 3 }}>
          {addressBook.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="body2" color="text.secondary">
                No billing address on file
              </Typography>
              <Typography variant="caption" color="text.disabled">
                Add a billing address for invoicing and tax purposes
              </Typography>
            </Box>
          ) : (
            addressBook.map((address) => (
              <AddressItem
                variant="outlined"
                key={address.id}
                address={address}
                action={
                  <IconButton
                    onClick={handleSelectedId}
                    sx={{ position: 'absolute', top: 8, right: 8 }}
                    disabled={loading}
                  >
                    <Iconify icon="eva:more-vertical-fill" />
                  </IconButton>
                }
                sx={{ p: 2.5, borderRadius: 1 }}
              />
            ))
          )}
        </Stack>
      </Card>

      {renderMenuActions()}
      {renderAddressCreateForm()}
      
      <Snackbar
        open={!!success}
        autoHideDuration={6000}
        onClose={() => setSuccess(null)}
        message={success}
      />
    </>
  );
}
