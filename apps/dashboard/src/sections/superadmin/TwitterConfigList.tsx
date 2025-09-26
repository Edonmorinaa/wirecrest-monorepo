'use client';

import Link from 'next/link';
import React, { useState, useEffect } from 'react';

import {
  People as PeopleIcon,
  Cancel as CancelIcon,
  Twitter as TwitterIcon,
  Refresh as RefreshIcon,
  Settings as SettingsIcon,
  CheckCircle as CheckCircleIcon,
  AdminPanelSettings as AdminIcon,
} from '@mui/icons-material';
import {
  Box,
  Card,
  Chip,
  Grid,
  Table,
  Alert,
  Button,
  Avatar,
  Tooltip,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
  IconButton,
  Typography,
  CardHeader,
  CardContent,
  TableContainer,
  TablePagination,
  CircularProgress,
} from '@mui/material';

interface TenantConfig {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  memberCount: number;
  profileCount: number;
  hasConfig: boolean;
  config: {
    maxProfiles: number;
    allowProfileCreation: boolean;
    allowProfileDeletion: boolean;
    allowProfileRefresh: boolean;
    autoSyncEnabled: boolean;
    lastUpdated: string;
  } | null;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export default function TwitterConfigList() {
  const [tenants, setTenants] = useState<TenantConfig[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadTenants();
  }, [pagination.page, pagination.limit]);

  const loadTenants = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `/api/superadmin/tenants/twitter-configs?page=${pagination.page}&limit=${pagination.limit}`
      );

      if (response.ok) {
        const data = await response.json();
        setTenants(data.tenants);
        setPagination(data.pagination);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to load tenant configurations');
      }
    } catch (err) {
      console.error('Error loading tenants:', err);
      setError(err instanceof Error ? err.message : 'Failed to load tenant configurations');
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (event: unknown, newPage: number) => {
    setPagination((prev) => ({ ...prev, page: newPage + 1 }));
  };

  const handleRowsPerPageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setPagination((prev) => ({
      ...prev,
      limit: parseInt(event.target.value, 10),
      page: 1,
    }));
  };

  const getConfigStatusChip = (tenant: TenantConfig) => {
    if (!tenant.hasConfig) {
      return <Chip label="No Config" color="default" size="small" />;
    }

    const config = tenant.config!;
    const activeFeatures = [
      config.allowProfileCreation && 'Create',
      config.allowProfileDeletion && 'Delete',
      config.allowProfileRefresh && 'Refresh',
      config.autoSyncEnabled && 'Auto Sync',
    ].filter(Boolean).length;

    return (
      <Chip
        label={`${activeFeatures} Features`}
        color={activeFeatures > 0 ? 'success' : 'warning'}
        size="small"
      />
    );
  };

  const getProfileCountChip = (count: number, max: number) => {
    const percentage = (count / max) * 100;
    let color: 'default' | 'warning' | 'error' = 'default';

    if (percentage >= 90) color = 'error';
    else if (percentage >= 70) color = 'warning';

    return <Chip label={`${count}/${max}`} color={color} size="small" />;
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert
        severity="error"
        action={
          <Button color="inherit" size="small" onClick={loadTenants}>
            Retry
          </Button>
        }
      >
        {error}
      </Alert>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Card sx={{ mb: 3 }}>
        <CardHeader
          avatar={<AdminIcon color="primary" />}
          title="Twitter Profile Configurations"
          subheader="Manage Twitter profile settings for all tenants"
          action={
            <Box display="flex" gap={1}>
              <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={loadTenants}
                disabled={loading}
              >
                Refresh
              </Button>
              <Button
                variant="contained"
                startIcon={<SettingsIcon />}
                component={Link}
                href="//twitter-configs"
              >
                Manage All Configs
              </Button>
            </Box>
          }
        />
      </Card>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2}>
                <Avatar sx={{ bgcolor: 'primary.main' }}>
                  <AdminIcon />
                </Avatar>
                <Box>
                  <Typography variant="h6">{pagination.total}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Tenants
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2}>
                <Avatar sx={{ bgcolor: 'success.main' }}>
                  <CheckCircleIcon />
                </Avatar>
                <Box>
                  <Typography variant="h6">{tenants.filter((t) => t.hasConfig).length}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Configured
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2}>
                <Avatar sx={{ bgcolor: 'warning.main' }}>
                  <CancelIcon />
                </Avatar>
                <Box>
                  <Typography variant="h6">{tenants.filter((t) => !t.hasConfig).length}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Not Configured
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2}>
                <Avatar sx={{ bgcolor: 'info.main' }}>
                  <TwitterIcon />
                </Avatar>
                <Box>
                  <Typography variant="h6">
                    {tenants.reduce((sum, t) => sum + t.profileCount, 0)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Profiles
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tenants Table */}
      <Card>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Tenant</TableCell>
                <TableCell>Members</TableCell>
                <TableCell>Profiles</TableCell>
                <TableCell>Configuration</TableCell>
                <TableCell>Features</TableCell>
                <TableCell>Last Updated</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {tenants.map((tenant) => (
                <TableRow key={tenant.id} hover>
                  <TableCell>
                    <Box>
                      <Typography variant="subtitle2" fontWeight={600}>
                        {tenant.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {tenant.slug}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box display="flex" alignItems="center" gap={1}>
                      <PeopleIcon fontSize="small" color="action" />
                      <Typography variant="body2">{tenant.memberCount}</Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    {tenant.hasConfig && tenant.config ? (
                      getProfileCountChip(tenant.profileCount, tenant.config.maxProfiles)
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        {tenant.profileCount}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>{getConfigStatusChip(tenant)}</TableCell>
                  <TableCell>
                    {tenant.hasConfig && tenant.config ? (
                      <Box display="flex" gap={0.5} flexWrap="wrap">
                        {tenant.config.allowProfileCreation && (
                          <Chip label="Create" size="small" color="success" />
                        )}
                        {tenant.config.allowProfileDeletion && (
                          <Chip label="Delete" size="small" color="error" />
                        )}
                        {tenant.config.allowProfileRefresh && (
                          <Chip label="Refresh" size="small" color="info" />
                        )}
                        {tenant.config.autoSyncEnabled && (
                          <Chip label="Auto Sync" size="small" color="warning" />
                        )}
                      </Box>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        No configuration
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    {tenant.hasConfig && tenant.config ? (
                      <Typography variant="body2" color="text.secondary">
                        {new Date(tenant.config.lastUpdated).toLocaleDateString()}
                      </Typography>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        Never
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell align="right">
                    <Box display="flex" gap={1} justifyContent="flex-end">
                      <Button
                        variant="outlined"
                        size="small"
                        component={Link}
                        href={`//tenants/${tenant.id}/twitter-config`}
                        startIcon={<SettingsIcon />}
                      >
                        Configure
                      </Button>
                      <Tooltip title="Quick Settings">
                        <IconButton
                          component={Link}
                          href={`//tenants/${tenant.id}/twitter-config`}
                          size="small"
                        >
                          <SettingsIcon />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          rowsPerPageOptions={[10, 20, 50]}
          component="div"
          count={pagination.total}
          rowsPerPage={pagination.limit}
          page={pagination.page - 1}
          onPageChange={handlePageChange}
          onRowsPerPageChange={handleRowsPerPageChange}
        />
      </Card>
    </Box>
  );
}
