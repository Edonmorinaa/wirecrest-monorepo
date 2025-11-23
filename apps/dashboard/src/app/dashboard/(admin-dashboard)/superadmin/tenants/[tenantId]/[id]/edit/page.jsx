'use client';

// import { SuperRole } from '@prisma/client';
import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { getTenant, updateTenant, deleteTenant } from '@/actions/tenants';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Skeleton from '@mui/material/Skeleton';
import { styled } from '@mui/material/styles';
import TextField from '@mui/material/TextField';
import AlertTitle from '@mui/material/AlertTitle';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import CircularProgress from '@mui/material/CircularProgress';
import DialogContentText from '@mui/material/DialogContentText';

import { DashboardContent } from 'src/layouts/dashboard';

import { Iconify } from 'src/components/iconify';
// import { RoleGuard } from 'src/components/guards';

const StyledCard = styled(Card)(({ theme }) => ({
  padding: theme.spacing(3),
  marginBottom: theme.spacing(3),
}));

export default function EditTenantPage() {
  const router = useRouter();
  const params = useParams();
  const tenantId = params.id;

  const [tenant, setTenant] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    slug: ''
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const fetchTenant = async () => {
      try {
        setIsLoading(true);
        const tenantData = await getTenant(tenantId);
        setTenant(tenantData);
        setFormData({
          name: tenantData.name,
          slug: tenantData.slug
        });
      } catch (error) {
        console.error('Error fetching tenant:', error);
        setSubmitError(error.message || 'Failed to fetch tenant');
      } finally {
        setIsLoading(false);
      }
    };

    if (tenantId) {
      fetchTenant();
    }
  }, [tenantId]);

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
      await updateTenant(tenantId, {
        name: formData.name.trim(),
        slug: formData.slug.trim()
      });

      // Redirect to tenant details on success
      router.push(`/tenants/${tenantId}`);
    } catch (error) {
      console.error('Error updating tenant:', error);
      setSubmitError(error.message || 'Failed to update tenant');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteTenant(tenantId);
      router.push('//tenants');
    } catch (error) {
      console.error('Error deleting tenant:', error);
      setSubmitError(error.message || 'Failed to delete tenant');
      setDeleteDialogOpen(false);
    } finally {
      setIsDeleting(false);
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

  if (isLoading) {
    return (
      // <RoleGuard requireRole={SuperRole.ADMIN}>
        <DashboardContent maxWidth="md">
          <Box sx={{ mb: 3 }}>
            <Skeleton variant="text" width={300} height={40} />
            <Skeleton variant="text" width={200} height={24} />
          </Box>
          <Card sx={{ p: 3 }}>
            <Skeleton variant="text" width={200} height={32} />
            <Grid container spacing={3} sx={{ mt: 2 }}>
              <Grid size={{ xs: 12 }}>
                <Skeleton variant="rectangular" height={56} />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <Skeleton variant="rectangular" height={56} />
              </Grid>
            </Grid>
          </Card>
        </DashboardContent>
      // </RoleGuard>
    );
  }

  if (!tenant) {
    return (
      // <RoleGuard requireRole={SuperRole.ADMIN}>
        <DashboardContent maxWidth="md">
          <Alert severity="error">
            <AlertTitle>Error</AlertTitle>
            Tenant not found
          </Alert>
        </DashboardContent>
      // </RoleGuard>
    );
  }

  return (
    // <RoleGuard requireRole={SuperRole.ADMIN}>
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
              Edit Tenant
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Update tenant organization information
            </Typography>
          </Box>
          
          <Stack direction="row" spacing={2}>
            <Button
              variant="outlined"
              startIcon={<Iconify icon="solar:arrow-left-bold" />}
              onClick={() => router.back()}
            >
              Back
            </Button>
            <Button
              variant="outlined"
              color="error"
              startIcon={<Iconify icon="solar:trash-bin-trash-bold" />}
              onClick={() => setDeleteDialogOpen(true)}
              disabled={isSubmitting}
            >
              Delete
            </Button>
          </Stack>
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
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </Stack>
        </form>

        {/* Delete Confirmation Dialog */}
        <Dialog
          open={deleteDialogOpen}
          onClose={() => setDeleteDialogOpen(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>Delete Tenant</DialogTitle>
          <DialogContent>
            <DialogContentText>
              Are you sure you want to delete the tenant "{tenant?.name}"? This action cannot be undone and will permanently remove all associated data including:
            </DialogContentText>
            <Box component="ul" sx={{ mt: 2, pl: 2 }}>
              <Typography component="li">All team members</Typography>
              <Typography component="li">Business profiles and reviews</Typography>
              <Typography component="li">Platform integrations</Typography>
              <Typography component="li">Market identifiers</Typography>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button 
              onClick={() => setDeleteDialogOpen(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleDelete}
              color="error"
              variant="contained"
              disabled={isDeleting}
              startIcon={isDeleting ? <CircularProgress size={16} /> : <Iconify icon="solar:trash-bin-trash-bold" />}
            >
              {isDeleting ? 'Deleting...' : 'Delete Tenant'}
            </Button>
          </DialogActions>
        </Dialog>
      </DashboardContent>
    // </RoleGuard>
  );
}
