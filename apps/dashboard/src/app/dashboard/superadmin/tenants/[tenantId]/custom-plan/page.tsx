'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

import {
  Save as SaveIcon,
  ArrowBack as ArrowBackIcon
} from '@mui/icons-material';
import {
  Box,
  Grid,
  Card,
  Chip,
  Alert,
  Paper,
  Button,
  Select,
  MenuItem,
  Checkbox,
  Container,
  TextField,
  Typography,
  CardHeader,
  InputLabel,
  IconButton,
  CardContent,
  FormControl,
  CircularProgress,
  FormControlLabel
} from '@mui/material';

interface PlanTemplate {
  id: string;
  name: string;
  features: string[];
  featureCount: number;
  isUnlimited: boolean;
  description: string;
  pricing: {
    monthly: number;
    yearly: number;
    currency: string;
  };
  featuresList: Array<{
    key: string;
    label: string;
    category: string;
  }>;
}

interface CustomPlanForm {
  basePlanId: string;
  planName: string;
  priceCents: number;
  currency: string;
  recurringInterval: 'month' | 'year';
  overrides: Record<string, boolean>;
}

export default function CustomPlanPage() {
  const params = useParams();
  const router = useRouter();
  const tenantId = params.tenantId as string;
  
  const [planTemplates, setPlanTemplates] = useState<PlanTemplate[]>([]);
  const [currentPlan, setCurrentPlan] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [showPreview, setShowPreview] = useState(false);
  
  const [form, setForm] = useState<CustomPlanForm>({
    basePlanId: '',
    planName: '',
    priceCents: 0,
    currency: 'usd',
    recurringInterval: 'month',
    overrides: {}
  });

  // Load plan templates
  useEffect(() => {
    loadPlanTemplates();
  }, [tenantId]);

  const loadPlanTemplates = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/tenants/${tenantId}/plan-templates`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to load plan templates');
      }

      if (result.success) {
        setPlanTemplates(result.planTemplates);
        setCurrentPlan(result.currentPlan);
      } else {
        throw new Error(result.error || 'Failed to load plan templates');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('Error loading plan templates:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFormChange = (field: keyof CustomPlanForm, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleFeatureToggle = (featureKey: string, enabled: boolean) => {
    setForm(prev => ({
      ...prev,
      overrides: { ...prev.overrides, [featureKey]: enabled }
    }));
  };

  const handleBasePlanChange = (basePlanId: string) => {
    const template = planTemplates.find(t => t.id === basePlanId);
    if (template) {
      setForm(prev => ({
        ...prev,
        basePlanId,
        planName: `${template.name} - Custom`,
        overrides: template.features.reduce((acc, feature) => {
          acc[feature] = true;
          return acc;
        }, {} as Record<string, boolean>)
      }));
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const response = await fetch(`/api/admin/tenants/${tenantId}/custom-plan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(form),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create custom plan');
      }

      if (result.success) {
        // Redirect to features page or show success message
        router.push(`/dashboard/superadmin/tenants/${tenantId}/features?success=true`);
      } else {
        throw new Error(result.error || 'Failed to create custom plan');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('Error creating custom plan:', err);
    } finally {
      setSaving(false);
    }
  };

  const getFeatureLabel = (key: string): string => {
    const labels: Record<string, string> = {
      'google.reviews': 'Google Reviews',
      'google.overview': 'Google Overview',
      'google.analytics': 'Google Analytics',
      'facebook.overview': 'Facebook Overview',
      'facebook.reviews': 'Facebook Reviews',
      'facebook.analytics': 'Facebook Analytics',
      'twitter.profileTracking': 'Twitter Profile Tracking',
      'twitter.alerts': 'Twitter Alerts',
      'twitter.analytics': 'Twitter Analytics',
      'instagram.engagement': 'Instagram Engagement',
      'instagram.followers': 'Instagram Followers',
      'instagram.analytics': 'Instagram Analytics',
      'tiktok.analytics': 'TikTok Analytics',
      'tiktok.reach': 'TikTok Reach',
      'tripadvisor.overview': 'TripAdvisor Overview',
      'tripadvisor.reviews': 'TripAdvisor Reviews',
      'tripadvisor.analytics': 'TripAdvisor Analytics',
      'booking.overview': 'Booking.com Overview',
      'booking.reviews': 'Booking.com Reviews',
      'booking.analytics': 'Booking.com Analytics',
      'linkedin.analytics': 'LinkedIn Analytics',
      'youtube.analytics': 'YouTube Analytics',
      'platform.advancedAnalytics': 'Advanced Analytics',
      'platform.customReports': 'Custom Reports',
      'platform.apiAccess': 'API Access',
      'platform.whiteLabel': 'White Label',
      'platform.prioritySupport': 'Priority Support',
      'platform.customIntegrations': 'Custom Integrations',
      'automation.scheduledScraping': 'Scheduled Scraping',
      'automation.realTimeMonitoring': 'Real-time Monitoring',
      'automation.customScrapeInterval': 'Custom Scrape Interval',
      'automation.advancedScheduling': 'Advanced Scheduling'
    };
    return labels[key] || key;
  };

  const getFeatureCategory = (key: string): string => {
    if (key.startsWith('google.')) return 'Google';
    if (key.startsWith('facebook.')) return 'Facebook';
    if (key.startsWith('twitter.')) return 'Twitter';
    if (key.startsWith('instagram.')) return 'Instagram';
    if (key.startsWith('tiktok.')) return 'TikTok';
    if (key.startsWith('tripadvisor.')) return 'TripAdvisor';
    if (key.startsWith('booking.')) return 'Booking.com';
    if (key.startsWith('linkedin.')) return 'LinkedIn';
    if (key.startsWith('youtube.')) return 'YouTube';
    if (key.startsWith('platform.')) return 'Platform';
    if (key.startsWith('automation.')) return 'Automation';
    return 'Other';
  };

  const formatPrice = (cents: number, currency: string): string => new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase()
    }).format(cents / 100);

  if (loading) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Button onClick={loadPlanTemplates}>
          Retry
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header */}
      <Box display="flex" alignItems="center" mb={4}>
        <IconButton onClick={() => router.back()} sx={{ mr: 2 }}>
          <ArrowBackIcon />
        </IconButton>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            Create Custom Plan
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Create a custom enterprise plan for tenant: {tenantId}
          </Typography>
        </Box>
      </Box>

      {/* Current Plan Info */}
      {currentPlan && (
        <Alert severity="info" sx={{ mb: 4 }}>
          <Typography variant="body2">
            Current plan: {currentPlan.isCustom ? 'Custom' : 'Standard'} 
            {currentPlan.planId && ` (${currentPlan.planId})`}
          </Typography>
        </Alert>
      )}

      {/* Form */}
      <Card>
        <CardHeader title="Custom Plan Configuration" />
        <CardContent>
          <Grid container spacing={3}>
            {/* Step 1: Base Plan Selection */}
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                1. Select Base Plan
              </Typography>
              <FormControl fullWidth>
                <InputLabel>Base Plan</InputLabel>
                <Select
                  value={form.basePlanId}
                  onChange={(e) => handleBasePlanChange(e.target.value)}
                  label="Base Plan"
                >
                  {planTemplates.map((template) => (
                    <MenuItem key={template.id} value={template.id}>
                      <Box>
                        <Typography variant="body1">{template.name}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {template.description} ({template.featureCount} features)
                        </Typography>
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Step 2: Plan Details */}
            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom>
                2. Plan Details
              </Typography>
              <TextField
                fullWidth
                label="Plan Name"
                value={form.planName}
                onChange={(e) => handleFormChange('planName', e.target.value)}
                margin="normal"
              />
              <TextField
                fullWidth
                label="Price (cents)"
                type="number"
                value={form.priceCents}
                onChange={(e) => handleFormChange('priceCents', parseInt(e.target.value) || 0)}
                margin="normal"
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom>
                3. Billing Configuration
              </Typography>
              <FormControl fullWidth margin="normal">
                <InputLabel>Currency</InputLabel>
                <Select
                  value={form.currency}
                  onChange={(e) => handleFormChange('currency', e.target.value)}
                  label="Currency"
                >
                  <MenuItem value="usd">USD</MenuItem>
                  <MenuItem value="eur">EUR</MenuItem>
                  <MenuItem value="gbp">GBP</MenuItem>
                </Select>
              </FormControl>
              <FormControl fullWidth margin="normal">
                <InputLabel>Billing Interval</InputLabel>
                <Select
                  value={form.recurringInterval}
                  onChange={(e) => handleFormChange('recurringInterval', e.target.value)}
                  label="Billing Interval"
                >
                  <MenuItem value="month">Monthly</MenuItem>
                  <MenuItem value="year">Yearly</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* Step 3: Feature Overrides */}
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                4. Feature Overrides
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Select which features to enable for this custom plan
              </Typography>
              
              {form.basePlanId && (
                <Grid container spacing={2}>
                  {Object.entries(form.overrides).map(([featureKey, enabled]) => (
                    <Grid item xs={12} sm={6} md={4} key={featureKey}>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={enabled}
                            onChange={(e) => handleFeatureToggle(featureKey, e.target.checked)}
                          />
                        }
                        label={
                          <Box>
                            <Typography variant="body2" fontWeight={enabled ? 600 : 400}>
                              {getFeatureLabel(featureKey)}
                            </Typography>
                            <Chip
                              label={getFeatureCategory(featureKey)}
                              size="small"
                              variant="outlined"
                              sx={{ mt: 0.5 }}
                            />
                          </Box>
                        }
                      />
                    </Grid>
                  ))}
                </Grid>
              )}
            </Grid>

            {/* Step 4: Preview */}
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                5. Preview & Create
              </Typography>
              <Paper sx={{ p: 2, mb: 2 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Plan Summary
                </Typography>
                <Typography variant="h6">{form.planName}</Typography>
                <Typography variant="body2">
                  Price: {formatPrice(form.priceCents, form.currency)} / {form.recurringInterval}
                </Typography>
                <Typography variant="body2">
                  Features: {Object.values(form.overrides).filter(Boolean).length} enabled
                </Typography>
              </Paper>
              
              <Button
                variant="contained"
                startIcon={<SaveIcon />}
                onClick={handleSave}
                disabled={saving || !form.basePlanId || !form.planName || form.priceCents <= 0}
                size="large"
              >
                {saving ? 'Creating...' : 'Create Custom Plan'}
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </Container>
  );
}
