'use client';

import { useState } from 'react';
// import { SuperRole } from '@prisma/client';
import { useRouter } from 'next/navigation';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Step from '@mui/material/Step';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Stepper from '@mui/material/Stepper';
import Divider from '@mui/material/Divider';
import MenuItem from '@mui/material/MenuItem';
import StepLabel from '@mui/material/StepLabel';
import TextField from '@mui/material/TextField';
import AlertTitle from '@mui/material/AlertTitle';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';

import { useCreateTeamWithLocation } from '@/hooks/useSuperAdminLocations';

import { DashboardContent } from 'src/layouts/dashboard';

import { Iconify } from 'src/components/iconify';
// import { RoleGuard } from 'src/components/guards';

// Common timezones for dropdown
const COMMON_TIMEZONES = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Asia/Dubai',
  'Australia/Sydney',
];

const STEPS = ['Tenant Information', 'First Location', 'Review & Create'];

export default function CreateTenantPage() {
  const router = useRouter();
  const { createTeamWithLocationAsync, isCreating, error: mutationError } = useCreateTeamWithLocation();
  
  const [activeStep, setActiveStep] = useState(0);
  const [formData, setFormData] = useState({
    // Tenant data
    teamName: '',
    teamSlug: '',
    // Location data
    locationName: '',
    locationSlug: '',
    address: '',
    city: '',
    country: '',
    timezone: 'UTC',
  });
  const [errors, setErrors] = useState({});

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    
    // Clear field-specific error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const generateSlug = (text, targetField) => {
    const slug = text
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim()
      .replace(/^-+|-+$/g, '');

    handleInputChange(targetField, slug);
  };

  const validateStep = (step) => {
    const newErrors = {};

    if (step === 0) {
      // Validate tenant information
      if (!formData.teamName.trim()) {
        newErrors.teamName = 'Tenant name is required';
      } else if (formData.teamName.length < 2) {
        newErrors.teamName = 'Tenant name must be at least 2 characters';
    }

      if (!formData.teamSlug.trim()) {
        newErrors.teamSlug = 'Tenant slug is required';
      } else if (formData.teamSlug.length < 2) {
        newErrors.teamSlug = 'Tenant slug must be at least 2 characters';
      } else if (!/^[a-z0-9-]+$/.test(formData.teamSlug)) {
        newErrors.teamSlug =
          'Tenant slug can only contain lowercase letters, numbers, and hyphens';
      }
    } else if (step === 1) {
      // Validate location information
      if (!formData.locationName.trim()) {
        newErrors.locationName = 'Location name is required';
      } else if (formData.locationName.length < 2) {
        newErrors.locationName = 'Location name must be at least 2 characters';
      }

      if (!formData.locationSlug.trim()) {
        newErrors.locationSlug = 'Location slug is required';
      } else if (formData.locationSlug.length < 2) {
        newErrors.locationSlug = 'Location slug must be at least 2 characters';
      } else if (!/^[a-z0-9-]+$/.test(formData.locationSlug)) {
        newErrors.locationSlug =
          'Location slug can only contain lowercase letters, numbers, and hyphens';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(activeStep)) {
      setActiveStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    setActiveStep((prev) => prev - 1);
    setErrors({});
  };

  const handleSubmit = async () => {
    if (!validateStep(1)) {
      return;
    }

    try {
      await createTeamWithLocationAsync({
        teamName: formData.teamName.trim(),
        teamSlug: formData.teamSlug.trim(),
        locationName: formData.locationName.trim(),
        locationSlug: formData.locationSlug.trim(),
        address: formData.address.trim() || undefined,
        city: formData.city.trim() || undefined,
        country: formData.country.trim() || undefined,
        timezone: formData.timezone,
      });

      // Redirect to tenants list on success
      router.push('/tenants');
    } catch (error) {
      console.error('Error creating tenant:', error);
    }
  };

  const renderStepContent = (step) => {
    switch (step) {
      case 0:
        return (
          <Stack spacing={3}>
            <Typography variant="body2" color="text.secondary">
              Enter the basic information for the new tenant organization.
            </Typography>

            <TextField
              fullWidth
              label="Tenant Name"
              value={formData.teamName}
              onChange={(e) => handleInputChange('teamName', e.target.value)}
              error={!!errors.teamName}
              helperText={errors.teamName || 'e.g., Acme Corporation'}
              onBlur={() => {
                if (formData.teamName && !formData.teamSlug) {
                  generateSlug(formData.teamName, 'teamSlug');
                }
              }}
            />

            <Stack direction="row" spacing={2} alignItems="flex-start">
              <TextField
                fullWidth
                label="Tenant Slug"
                value={formData.teamSlug}
                onChange={(e) => handleInputChange('teamSlug', e.target.value)}
                error={!!errors.teamSlug}
                helperText={
                  errors.teamSlug || 'Unique identifier (lowercase, numbers, hyphens only)'
                }
              />
              <Button
                variant="outlined"
                onClick={() => generateSlug(formData.teamName, 'teamSlug')}
                disabled={!formData.teamName}
                sx={{ minWidth: 120, height: 56 }}
              >
                Generate
              </Button>
            </Stack>
          </Stack>
        );

      case 1:
        return (
          <Stack spacing={3}>
            <Typography variant="body2" color="text.secondary">
              Add the first location for this tenant. You can add more locations later.
            </Typography>

            <TextField
              fullWidth
              label="Location Name"
              value={formData.locationName}
              onChange={(e) => handleInputChange('locationName', e.target.value)}
              error={!!errors.locationName}
              helperText={errors.locationName || 'e.g., Main Office, Downtown Store'}
              onBlur={() => {
                if (formData.locationName && !formData.locationSlug) {
                  generateSlug(formData.locationName, 'locationSlug');
    }
              }}
            />

            <Stack direction="row" spacing={2} alignItems="flex-start">
              <TextField
                fullWidth
                label="Location Slug"
                value={formData.locationSlug}
                onChange={(e) => handleInputChange('locationSlug', e.target.value)}
                error={!!errors.locationSlug}
                helperText={
                  errors.locationSlug || 'Unique identifier for this location'
                }
              />
              <Button
                variant="outlined"
                onClick={() => generateSlug(formData.locationName, 'locationSlug')}
                disabled={!formData.locationName}
                sx={{ minWidth: 120, height: 56 }}
              >
                Generate
              </Button>
            </Stack>

            <Divider sx={{ my: 1 }} />

            <Typography variant="subtitle2" color="text.secondary">
              Optional Details
            </Typography>

            <TextField
              fullWidth
              label="Address"
              value={formData.address}
              onChange={(e) => handleInputChange('address', e.target.value)}
              placeholder="123 Main St"
            />

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                fullWidth
                label="City"
                value={formData.city}
                onChange={(e) => handleInputChange('city', e.target.value)}
                placeholder="New York"
              />

              <TextField
                fullWidth
                label="Country"
                value={formData.country}
                onChange={(e) => handleInputChange('country', e.target.value)}
                placeholder="United States"
              />
            </Stack>

            <TextField
              fullWidth
              select
              label="Timezone"
              value={formData.timezone}
              onChange={(e) => handleInputChange('timezone', e.target.value)}
            >
              {COMMON_TIMEZONES.map((tz) => (
                <MenuItem key={tz} value={tz}>
                  {tz}
                </MenuItem>
              ))}
            </TextField>
          </Stack>
        );

      case 2:
        return (
          <Stack spacing={3}>
            <Typography variant="body2" color="text.secondary">
              Review the information below and click &ldquo;Create&rdquo; to add the new tenant.
            </Typography>

            <Card variant="outlined" sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Tenant Information
              </Typography>
              <Stack spacing={1.5} sx={{ mt: 2 }}>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">
                    Name:
                  </Typography>
                  <Typography variant="body2" fontWeight="medium">
                    {formData.teamName}
                  </Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">
                    Slug:
                  </Typography>
                  <Typography variant="body2" fontWeight="medium">
                    {formData.teamSlug}
                  </Typography>
                </Stack>
              </Stack>
            </Card>

            <Card variant="outlined" sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                First Location
              </Typography>
              <Stack spacing={1.5} sx={{ mt: 2 }}>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">
                    Name:
                  </Typography>
                  <Typography variant="body2" fontWeight="medium">
                    {formData.locationName}
                  </Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">
                    Slug:
                  </Typography>
                  <Typography variant="body2" fontWeight="medium">
                    {formData.locationSlug}
                  </Typography>
                </Stack>
                {formData.address && (
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="body2" color="text.secondary">
                      Address:
                    </Typography>
                    <Typography variant="body2" fontWeight="medium">
                      {formData.address}
                    </Typography>
                  </Stack>
                )}
                {formData.city && (
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="body2" color="text.secondary">
                      City:
                    </Typography>
                    <Typography variant="body2" fontWeight="medium">
                      {formData.city}
                    </Typography>
                  </Stack>
                )}
                {formData.country && (
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="body2" color="text.secondary">
                      Country:
                    </Typography>
                    <Typography variant="body2" fontWeight="medium">
                      {formData.country}
                    </Typography>
                  </Stack>
                )}
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">
                    Timezone:
                  </Typography>
                  <Typography variant="body2" fontWeight="medium">
                    {formData.timezone}
                  </Typography>
                </Stack>
              </Stack>
            </Card>
          </Stack>
        );

      default:
        return null;
    }
  };

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
              Create New Tenant
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Add a new tenant organization with its first location
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
        {mutationError && (
          <Alert severity="error" sx={{ mb: 3 }}>
            <AlertTitle>Error</AlertTitle>
            {mutationError}
          </Alert>
        )}

        {/* Stepper */}
        <Card sx={{ p: 3, mb: 3 }}>
          <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
            {STEPS.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>

          {renderStepContent(activeStep)}

          <Stack direction="row" spacing={2} justifyContent="flex-end" sx={{ mt: 4 }}>
            {activeStep > 0 && (
              <Button onClick={handleBack} disabled={isCreating}>
                Back
              </Button>
            )}

            {activeStep < STEPS.length - 1 ? (
              <Button variant="contained" onClick={handleNext}>
                Next
              </Button>
            ) : (
              <Button
                variant="contained"
                onClick={handleSubmit}
                disabled={isCreating}
                startIcon={
                  isCreating ? <CircularProgress size={18} color="inherit" /> : <Iconify icon="solar:add-circle-bold" />
                }
              >
                {isCreating ? 'Creating...' : 'Create Tenant'}
              </Button>
            )}
          </Stack>
        </Card>
      </DashboardContent>
    // </RoleGuard>
  );
}
