'use client';

import { useState } from 'react';
import { SuperRole } from '@prisma/client';
import { useRouter } from 'next/navigation';
import { createTenant } from '@/actions/tenants';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import { styled } from '@mui/material/styles';
import TextField from '@mui/material/TextField';
import AlertTitle from '@mui/material/AlertTitle';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';

import { DashboardContent } from 'src/layouts/dashboard';

import { Iconify } from 'src/components/iconify';
import { RoleGuard } from 'src/components/guards';

import { NextAuthSignUpView } from 'src/auth/view/nextauth/nextauth-sign-up-view';

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

        <NextAuthSignUpView />
      </DashboardContent>
    </RoleGuard>
  );
}
