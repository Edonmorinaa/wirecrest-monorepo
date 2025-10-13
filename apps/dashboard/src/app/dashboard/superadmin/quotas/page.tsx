'use client';

import React, { useState, useEffect } from 'react';

import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import {
  Box,
  Card,
  Chip,
  Table,
  Paper,
  Alert,
  Button,
  Select,
  Dialog,
  MenuItem,
  TableRow,
  Skeleton,
  TextField,
  TableBody,
  TableCell,
  TableHead,
  CardHeader,
  Typography,
  InputLabel,
  IconButton,
  CardContent,
  FormControl,
  DialogTitle,
  DialogContent,
  DialogActions,
  TableContainer,
} from '@mui/material';

import { paths } from 'src/routes/paths';

import { DashboardContent } from 'src/layouts/dashboard';

import { toast } from 'src/components/snackbar';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

interface Team {
  id: string;
  name: string;
  slug: string;
}

interface QuotaOverride {
  type: string;
  limit?: number;
  resetPeriod?: 'daily' | 'monthly' | 'yearly' | 'never';
}

interface TenantQuotaConfig {
  teamId: string;
  teamName: string;
  teamSlug: string;
  planTier: string;
  planId: string | null;
  overrides: Record<string, QuotaOverride>;
}

const QUOTA_TYPES = [
  { value: 'seats', label: 'Team Seats' },
  { value: 'locations', label: 'Business Locations' },
  { value: 'reviewRateLimit', label: 'Review Rate Limit' },
  { value: 'apiCalls', label: 'API Calls' },
  { value: 'dataRetention', label: 'Data Retention (days)' },
  { value: 'exportLimit', label: 'Export Limit' },
];

const RESET_PERIODS = [
  { value: 'daily', label: 'Daily' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
  { value: 'never', label: 'Never' },
];

export default function AdminQuotasPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [quotaConfig, setQuotaConfig] = useState<TenantQuotaConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingQuota, setEditingQuota] = useState<{ type: string; data: QuotaOverride } | null>(null);

  // Add/Edit Dialog State
  const [quotaType, setQuotaType] = useState('');
  const [limit, setLimit] = useState<number>(0);
  const [resetPeriod, setResetPeriod] = useState<'daily' | 'monthly' | 'yearly' | 'never'>('monthly');

  // Load teams on mount
  useEffect(() => {
    loadTeams();
  }, []);

  // Load quota config when team is selected
  useEffect(() => {
    if (selectedTeamId) {
      loadQuotaConfig(selectedTeamId);
    }
  }, [selectedTeamId]);

  const loadTeams = async () => {
    try {
      const response = await fetch('/api/admin/teams');
      if (!response.ok) throw new Error('Failed to load teams');
      const data = await response.json();
      setTeams(data);
    } catch (error) {
      console.error('Error loading teams:', error);
      toast.error('Failed to load teams');
    }
  };

  const loadQuotaConfig = async (teamId: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/tenants/${teamId}/quota-overrides`);
      if (!response.ok) throw new Error('Failed to load quota config');
      const data = await response.json();
      setQuotaConfig(data);
    } catch (error) {
      console.error('Error loading quota config:', error);
      toast.error('Failed to load quota configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleAddOverride = () => {
    setEditingQuota(null);
    setQuotaType('');
    setLimit(0);
    setResetPeriod('monthly');
    setShowAddDialog(true);
  };

  const handleEditOverride = (type: string, data: QuotaOverride) => {
    setEditingQuota({ type, data });
    setQuotaType(type);
    setLimit(data.limit || 0);
    setResetPeriod(data.resetPeriod || 'monthly');
    setShowAddDialog(true);
  };

  const handleSaveOverride = async () => {
    if (!selectedTeamId || !quotaType) {
      toast.error('Please select a team and quota type');
      return;
    }

    try {
      const response = await fetch(`/api/admin/tenants/${selectedTeamId}/quota-overrides`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          [quotaType]: {
            limit,
            resetPeriod,
          },
        }),
      });

      if (!response.ok) throw new Error('Failed to save override');

      toast.success(`Quota override ${editingQuota ? 'updated' : 'added'} successfully`);
      setShowAddDialog(false);
      loadQuotaConfig(selectedTeamId);
    } catch (error) {
      console.error('Error saving override:', error);
      toast.error('Failed to save quota override');
    }
  };

  const handleDeleteOverride = async (type: string) => {
    if (!selectedTeamId) return;

    if (!confirm(`Are you sure you want to delete the ${type} override?`)) return;

    try {
      const response = await fetch(
        `/api/admin/tenants/${selectedTeamId}/quota-overrides?type=${type}`,
        { method: 'DELETE' }
      );

      if (!response.ok) throw new Error('Failed to delete override');

      toast.success('Quota override deleted successfully');
      loadQuotaConfig(selectedTeamId);
    } catch (error) {
      console.error('Error deleting override:', error);
      toast.error('Failed to delete quota override');
    }
  };

  const formatQuotaType = (type: string) => QUOTA_TYPES.find((q) => q.value === type)?.label || type;

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading="Quota Management"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Super Admin', href: '/dashboard/superadmin' },
          { name: 'Quotas' },
        ]}
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      {/* Team Selector */}
      <Card sx={{ mb: 3 }}>
        <CardHeader
          title="Select Team"
          subheader="Choose a team to manage quota overrides"
        />
        <CardContent>
          <FormControl fullWidth>
            <InputLabel>Team</InputLabel>
            <Select
              value={selectedTeamId}
              onChange={(e) => setSelectedTeamId(e.target.value)}
              label="Team"
            >
              {teams.map((team) => (
                <MenuItem key={team.id} value={team.id}>
                  {team.name} ({team.slug})
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </CardContent>
      </Card>

      {/* Quota Configuration */}
      {selectedTeamId && (
        <Card>
          <CardHeader
            title="Quota Overrides"
            subheader={
              quotaConfig
                ? `Managing quotas for ${quotaConfig.teamName} (Plan: ${quotaConfig.planTier})`
                : 'Loading...'
            }
            action={
              <Box display="flex" gap={1}>
                <IconButton onClick={() => loadQuotaConfig(selectedTeamId)} disabled={loading}>
                  <RefreshIcon />
                </IconButton>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={handleAddOverride}
                  disabled={loading}
                >
                  Add Override
                </Button>
              </Box>
            }
          />
          <CardContent>
            {loading ? (
              <Box>
                <Skeleton variant="rectangular" height={200} />
              </Box>
            ) : quotaConfig ? (
              <>
                {/* Plan Info */}
                <Alert severity="info" sx={{ mb: 3 }}>
                  <Typography variant="subtitle2">Base Plan: {quotaConfig.planTier}</Typography>
                  <Typography variant="caption">
                    Plan ID: {quotaConfig.planId || 'None'}
                  </Typography>
                </Alert>

                {/* Overrides Table */}
                {Object.keys(quotaConfig.overrides).length > 0 ? (
                  <TableContainer component={Paper} variant="outlined">
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Quota Type</TableCell>
                          <TableCell align="right">Limit</TableCell>
                          <TableCell>Reset Period</TableCell>
                          <TableCell align="right">Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {Object.entries(quotaConfig.overrides).map(([type, data]) => (
                          <TableRow key={type}>
                            <TableCell>
                              <Typography variant="body2" fontWeight={600}>
                                {formatQuotaType(type)}
                              </Typography>
                            </TableCell>
                            <TableCell align="right">
                              <Chip
                                label={data.limit !== undefined ? data.limit : 'Unlimited'}
                                color="primary"
                                size="small"
                              />
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={data.resetPeriod || 'Never'}
                                variant="outlined"
                                size="small"
                              />
                            </TableCell>
                            <TableCell align="right">
                              <IconButton
                                size="small"
                                onClick={() => handleEditOverride(type, data)}
                              >
                                <EditIcon fontSize="small" />
                              </IconButton>
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => handleDeleteOverride(type)}
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                ) : (
                  <Alert severity="info">
                    No quota overrides configured. Using default plan limits.
                  </Alert>
                )}
              </>
            ) : (
              <Alert severity="warning">Select a team to view quota configuration</Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={showAddDialog} onClose={() => setShowAddDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingQuota ? 'Edit Quota Override' : 'Add Quota Override'}
        </DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} mt={2}>
            <FormControl fullWidth>
              <InputLabel>Quota Type</InputLabel>
              <Select
                value={quotaType}
                onChange={(e) => setQuotaType(e.target.value)}
                label="Quota Type"
                disabled={!!editingQuota}
              >
                {QUOTA_TYPES.map((type) => (
                  <MenuItem key={type.value} value={type.value}>
                    {type.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              fullWidth
              label="Limit"
              type="number"
              value={limit}
              onChange={(e) => setLimit(parseInt(e.target.value) || 0)}
              helperText="Set to 0 for unlimited"
            />

            <FormControl fullWidth>
              <InputLabel>Reset Period</InputLabel>
              <Select
                value={resetPeriod}
                onChange={(e) => setResetPeriod(e.target.value as any)}
                label="Reset Period"
              >
                {RESET_PERIODS.map((period) => (
                  <MenuItem key={period.value} value={period.value}>
                    {period.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowAddDialog(false)}>Cancel</Button>
          <Button onClick={handleSaveOverride} variant="contained">
            {editingQuota ? 'Update' : 'Add'}
          </Button>
        </DialogActions>
      </Dialog>
    </DashboardContent>
  );
}
