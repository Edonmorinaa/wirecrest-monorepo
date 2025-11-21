'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';

import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';

import { useCreateLocation, useUpdateLocation } from 'src/hooks/useLocations';

// ----------------------------------------------------------------------

interface LocationFormDialogProps {
  open: boolean;
  location?: any;
  teamSlug: string;
  onClose: (success?: boolean) => void;
}

interface LocationFormData {
  slug: string;
  name: string;
  address?: string;
  city?: string;
  country?: string;
  timezone?: string;
}

export function LocationFormDialog({ open, location, teamSlug, onClose }: LocationFormDialogProps) {
  const isEdit = !!location;
  const { createLocationAsync, isCreating } = useCreateLocation();
  const { updateLocationAsync, isUpdating } = useUpdateLocation();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<LocationFormData>({
    defaultValues: {
      slug: '',
      name: '',
      address: '',
      city: '',
      country: '',
      timezone: 'UTC',
    },
  });

  // Auto-generate slug from name if creating new location
  const name = watch('name');
  useEffect(() => {
    if (!isEdit && name) {
      const autoSlug = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
      setValue('slug', autoSlug);
    }
  }, [name, isEdit, setValue]);

  useEffect(() => {
    if (location) {
      reset({
        slug: location.slug || '',
        name: location.name || '',
        address: location.address || '',
        city: location.city || '',
        country: location.country || '',
        timezone: location.timezone || 'UTC',
      });
    } else {
      reset({
        slug: '',
        name: '',
        address: '',
        city: '',
        country: '',
        timezone: 'UTC',
      });
    }
  }, [location, reset]);

  const onSubmit = async (data: LocationFormData) => {
    try {
      if (isEdit) {
        await updateLocationAsync({
          locationId: location.id,
          ...data,
        });
      } else {
        await createLocationAsync({
          teamSlug,
          ...data,
        });
      }
      onClose(true);
    } catch (error) {
      console.error('Failed to save location:', error);
    }
  };

  const handleClose = () => {
    if (!isCreating && !isUpdating) {
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogTitle>{isEdit ? 'Edit Location' : 'Create Location'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              {...register('name', { required: 'Name is required' })}
              label="Location Name"
              fullWidth
              error={!!errors.name}
              helperText={errors.name?.message}
            />
            <TextField
              {...register('slug', { 
                required: 'Slug is required',
                pattern: {
                  value: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
                  message: 'Slug must be lowercase alphanumeric with hyphens'
                }
              })}
              label="Slug"
              fullWidth
              error={!!errors.slug}
              helperText={errors.slug?.message || 'URL-friendly identifier (auto-generated from name)'}
            //   disabled={isEdit}
            />
            <TextField
              {...register('address')}
              label="Address"
              fullWidth
              multiline
              rows={2}
            />
            <TextField
              {...register('city')}
              label="City"
              fullWidth
            />
            <TextField
              {...register('country')}
              label="Country"
              fullWidth
            />
            <TextField
              {...register('timezone')}
              label="Timezone"
              fullWidth
              placeholder="UTC"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} disabled={isCreating || isUpdating}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={isCreating || isUpdating}
          >
            {isEdit ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

