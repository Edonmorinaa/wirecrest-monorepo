'use client';

import { useState } from 'react';

import { useRouter } from 'next/navigation';

import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { styled } from '@mui/material/styles';

import { createTenant } from '@/actions/tenants';
import { RoleGuard } from 'src/components/guards';
import { SuperRole } from '@prisma/client';
import { DashboardContent } from 'src/layouts/dashboard';
import { Iconify } from 'src/components/iconify';

const StyledCard = styled(Card)(({ theme }) => ({
  padding: theme.spacing(3),
  marginBottom: theme.spacing(3),
}));

export default function CreateTenantPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    slug: ''
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear field-specific error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Tenant name is required';
    } else if (formData.name.length < 2) {
      newErrors.name = 'Tenant name must be at least 2 characters';
    }

    if (!formData.slug.trim()) {
      newErrors.slug = 'Tenant slug is required';
    } else if (formData.slug.length < 2) {
      newErrors.slug = 'Tenant slug must be at least 2 characters';
    } else if (!/^[a-z0-9-]+$/.test(formData.slug)) {
      newErrors.slug = 'Tenant slug can only contain lowercase letters, numbers, and hyphens';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setSubmitError('');

    try {
      await createTenant({
        name: formData.name.trim(),
        slug: formData.slug.trim()
      });

      // Redirect to tenants list on success
      router.push('/tenants');
    } catch (error) {
      console.error('Error creating tenant:', error);
      setSubmitError(error.message || 'Failed to create tenant');
    } finally {
      setIsSubmitting(false);
    }
  };

  const generateSlug = () => {
    const slug = formData.name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim('-');
    
    handleInputChange('slug', slug);
  };

  return (
    <RoleGuard requireRole={SuperRole.ADMIN}>
      <DashboardContent maxWidth="md">
        {/* Header */}
        <Stack
          spacing={2}
          direction={{ xs: 'column', md: 'row' }}
          alignItems={{ xs: 'flex-start', md: 'center' }}
          justifyContent="space-between"
          sx={{ mb: { xs: 3, md: 5 } }}
        >
          <Box>
            <Typography variant="h4" gutterBottom>
              Create New Tenant
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Add a new tenant organization to the system
            </Typography>
          </Box>
          
          <Button
            variant="outlined"
            startIcon={<Iconify icon="solar:arrow-left-bold" />}
            onClick={() => router.back()}
          >
            Back
          </Button>
        </Stack>

        {/* Error Alert */}
        {submitError && (
          <Alert severity="error" sx={{ mb: 3 }}>
            <AlertTitle>Error</AlertTitle>
            {submitError}
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <Card sx={{ p: 3, mb: 3 }}>
            <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 3 }}>
              <Avatar sx={{ bgcolor: 'primary.main' }}>
                <Iconify icon="solar:buildings-bold" />
              </Avatar>
              <Typography variant="h6">
                Tenant Information
              </Typography>
            </Stack>

            <Grid container spacing={3}>
              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  label="Tenant Name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  error={!!errors.name}
                  helperText={errors.name}
                  placeholder="Enter tenant organization name"
                  disabled={isSubmitting}
                />
              </Grid>

              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  label="Tenant Slug"
                  value={formData.slug}
                  onChange={(e) => handleInputChange('slug', e.target.value)}
                  error={!!errors.slug}
                  helperText={errors.slug || 'This will be used as the unique identifier for the tenant'}
                  placeholder="tenant-slug"
                  disabled={isSubmitting}
                  InputProps={{
                    startAdornment: <Typography variant="body2" sx={{ mr: 1 }}>@</Typography>
                  }}
                />
                <Button
                  size="small"
                  onClick={generateSlug}
                  disabled={!formData.name || isSubmitting}
                  sx={{ mt: 1 }}
                >
                  Generate from name
                </Button>
              </Grid>
            </Grid>
          </Card>

          {/* Action Buttons */}
          <Stack direction="row" spacing={2} justifyContent="flex-end">
            <Button
              variant="outlined"
              onClick={() => router.back()}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              startIcon={isSubmitting ? <CircularProgress size={16} /> : <Iconify icon="solar:check-circle-bold" />}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Creating...' : 'Create Tenant'}
            </Button>
          </Stack>
        </form>
      </DashboardContent>
    </RoleGuard>
  );
}
