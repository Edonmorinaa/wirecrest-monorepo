'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';

// import { SuperRole } from '@prisma/client';

import { useSuperAdminTenants } from '@/hooks/useSuperAdminTenants';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Menu from '@mui/material/Menu';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import Select from '@mui/material/Select';
import Divider from '@mui/material/Divider';
import Tooltip from '@mui/material/Tooltip';
import MenuItem from '@mui/material/MenuItem';
import Skeleton from '@mui/material/Skeleton';
import TableRow from '@mui/material/TableRow';
import { styled } from '@mui/material/styles';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TextField from '@mui/material/TextField';
import AlertTitle from '@mui/material/AlertTitle';
import IconButton from '@mui/material/IconButton';
import InputLabel from '@mui/material/InputLabel';
import Typography from '@mui/material/Typography';
import FormControl from '@mui/material/FormControl';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import InputAdornment from '@mui/material/InputAdornment';
import LinearProgress from '@mui/material/LinearProgress';
import TableContainer from '@mui/material/TableContainer';
import TablePagination from '@mui/material/TablePagination';

import { DashboardContent } from 'src/layouts/dashboard';

import { Iconify } from 'src/components/iconify';
// import { RoleGuard } from 'src/components/guards';
import { TableNoData } from 'src/components/table/table-no-data';
import { TableSkeleton } from 'src/components/table/table-skeleton';

// Removed old status colors and icons - no longer showing per-platform status

const StyledTableCell = styled(TableCell)(({ theme }) => ({
  fontWeight: 600,
  backgroundColor: theme.palette.background.neutral,
}));

export default function SuperAdminTenantsPage() {
  const router = useRouter();
  
  const [filters, setFilters] = useState({
    page: 1,
    limit: 25,
    search: '',
    status: '',
    platform: '',
    sortBy: 'createdAt',
    sortOrder: 'desc'
  });

  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedTenant, setSelectedTenant] = useState(null);

  const {
    tenants,
    stats,
    pagination,
    isLoading,
    error,
    refresh
  } = useSuperAdminTenants(filters);

  const handleMenuOpen = (event, tenant) => {
    setAnchorEl(event.currentTarget);
    setSelectedTenant(tenant);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedTenant(null);
  };

  const handleSearch = (search) => {
    setFilters(prev => ({ ...prev, search, page: 1 }));
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value, page: 1 }));
  };

  const handlePageChange = (event, newPage) => {
    setFilters(prev => ({ ...prev, page: newPage + 1 }));
  };

  const handleRowsPerPageChange = (event) => {
    setFilters(prev => ({ 
      ...prev, 
      limit: parseInt(event.target.value, 10),
      page: 1 
    }));
  };

  // Removed getPlatformStatus and getPlatformChip - no longer showing individual platform chips

  // Show loading state
  if (isLoading) {
    return (
      // <RoleGuard requireRole={SuperRole.ADMIN}>
        <DashboardContent maxWidth="xl">
          <Typography variant="h4" sx={{ mb: { xs: 3, md: 5 } }}>
            Tenant Management
          </Typography>
          
          <Grid container spacing={3} sx={{ mb: 3 }}>
            {Array.from({ length: 4 }).map((_, i) => (
              <Grid key={i} size={{ xs: 12, sm: 6, md: 3 }}>
                <Card>
                  <Box sx={{ p: 3 }}>
                    <Skeleton variant="text" width={100} height={20} />
                    <Skeleton variant="text" width={60} height={32} />
                  </Box>
                </Card>
              </Grid>
            ))}
          </Grid>
          
          <Card>
            <Box sx={{ p: 3 }}>
              <Skeleton variant="text" width={200} height={24} />
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <StyledTableCell>Tenant</StyledTableCell>
                      <StyledTableCell>Members</StyledTableCell>
                      <StyledTableCell>Progress</StyledTableCell>
                      <StyledTableCell>Platforms</StyledTableCell>
                      <StyledTableCell>Last Activity</StyledTableCell>
                      <StyledTableCell align="right">Actions</StyledTableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    <TableSkeleton rowCount={5} cellCount={7} />
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          </Card>
        </DashboardContent>
      // </RoleGuard>
    );
  }

  // Show error state
  if (error) {
    return (
      // <RoleGuard requireRole={SuperRole.ADMIN}>
        <DashboardContent maxWidth="xl">
          <Alert severity="error">
            <AlertTitle>Error</AlertTitle>
            Failed to load tenants: {error?.message || 'Unknown error'}
          </Alert>
        </DashboardContent>
      // </RoleGuard>
    );
  }

  return (
    // <RoleGuard requireRole={SuperRole.ADMIN}>
      <DashboardContent maxWidth="xl">
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
              Tenant Management
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Manage all tenants and their platform integrations
            </Typography>
          </Box>
          
          <Stack direction="row" spacing={2}>
            <Button
              variant="outlined"
              startIcon={<Iconify icon="solar:refresh-bold" />}
              onClick={() => refresh()}
            >
              Refresh
            </Button>
            <Button
              variant="contained"
              startIcon={<Iconify icon="solar:add-circle-bold" />}
              onClick={() => router.push('/tenants/create')}
            >
              Create Tenant
            </Button>
          </Stack>
        </Stack>

        {/* Stats Cards */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card>
              <Box sx={{ p: 3 }}>
                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Total Tenants
                  </Typography>
                  <Avatar sx={{ bgcolor: 'primary.lighter', color: 'primary.main' }}>
                    <Iconify icon="solar:buildings-bold" />
                  </Avatar>
                </Stack>
                <Typography variant="h4" sx={{ mb: 0.5 }}>
                  {stats.totalTenants}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {stats.completedTenants} completed
                </Typography>
              </Box>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card>
              <Box sx={{ p: 3 }}>
                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Active Tenants
                  </Typography>
                  <Avatar sx={{ bgcolor: 'info.lighter', color: 'info.main' }}>
                    <Iconify icon="solar:activity-bold" />
                  </Avatar>
                </Stack>
                <Typography variant="h4" sx={{ mb: 0.5 }}>
                  {stats.inProgressTenants}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {stats.notStartedTenants} not started
                </Typography>
              </Box>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card>
              <Box sx={{ p: 3 }}>
                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Failed Tasks
                  </Typography>
                  <Avatar sx={{ bgcolor: 'error.lighter', color: 'error.main' }}>
                    <Iconify icon="solar:close-circle-bold" />
                  </Avatar>
                </Stack>
                <Typography variant="h4" sx={{ mb: 0.5 }}>
                  {stats.failedTenants}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Require attention
                </Typography>
              </Box>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card>
              <Box sx={{ p: 3 }}>
                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Total Locations
                  </Typography>
                  <Avatar sx={{ bgcolor: 'success.lighter', color: 'success.main' }}>
                    <Iconify icon="mdi:map-marker-multiple" />
                  </Avatar>
                </Stack>
                <Typography variant="h4" sx={{ mb: 0.5 }}>
                  {stats.totalLocations || 0}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {stats.totalIntegrations || 0} integrations
                </Typography>
              </Box>
            </Card>
          </Grid>
        </Grid>

        {/* Filters */}
        <Card sx={{ mb: 3 }}>
          <Box sx={{ p: 3 }}>
            <Grid container spacing={2} alignItems="center">
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  placeholder="Search tenants..."
                  value={filters.search}
                  onChange={(e) => handleSearch(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Iconify icon="solar:magnifer-bold" />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <FormControl fullWidth>
                  <InputLabel>Filter by status</InputLabel>
                  <Select
                    value={filters.status}
                    label="Filter by status"
                    onChange={(e) => handleFilterChange('status', e.target.value)}
                  >
                    <MenuItem value="">All Status</MenuItem>
                    <MenuItem value="not_started">Not Started</MenuItem>
                    <MenuItem value="in_progress">In Progress</MenuItem>
                    <MenuItem value="completed">Completed</MenuItem>
                    <MenuItem value="failed">Failed</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <FormControl fullWidth>
                  <InputLabel>Filter by platform</InputLabel>
                  <Select
                    value={filters.platform}
                    label="Filter by platform"
                    onChange={(e) => handleFilterChange('platform', e.target.value)}
                  >
                    <MenuItem value="">All Platforms</MenuItem>
                    <MenuItem value="google">Google Business</MenuItem>
                    <MenuItem value="facebook">Facebook Business</MenuItem>
                    <MenuItem value="tripadvisor">TripAdvisor</MenuItem>
                    <MenuItem value="booking">Booking.com</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </Box>
        </Card>

        {/* Tenants Table */}
        <Card>
          <Box sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Tenants
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Manage tenant organizations, locations, and platform integrations
            </Typography>
            
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <StyledTableCell>Tenant</StyledTableCell>
                    <StyledTableCell>Members</StyledTableCell>
                    <StyledTableCell>Locations</StyledTableCell>
                    <StyledTableCell>Integrations</StyledTableCell>
                    <StyledTableCell>Progress</StyledTableCell>
                    <StyledTableCell>Last Activity</StyledTableCell>
                    <StyledTableCell align="right">Actions</StyledTableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {tenants.length === 0 ? (
                    <TableNoData notFound={!isLoading} />
                  ) : (
                    tenants.map((tenant) => (
                      <TableRow key={tenant.id} hover>
                        <TableCell>
                          <Stack direction="row" alignItems="center" spacing={2}>
                            <Avatar sx={{ bgcolor: 'primary.main' }}>
                              <Iconify icon="solar:buildings-bold" />
                            </Avatar>
                            <Box>
                              <Typography variant="subtitle2">{tenant.name}</Typography>
                              <Typography variant="body2" color="text.secondary">
                                @{tenant.slug}
                              </Typography>
                            </Box>
                          </Stack>
                        </TableCell>
                        <TableCell>
                          <Stack direction="row" alignItems="center" spacing={1}>
                            <Iconify icon="solar:users-group-rounded-bold" />
                            <Typography variant="body2">{tenant.membersCount}</Typography>
                          </Stack>
                        </TableCell>
                        <TableCell>
                          <Stack direction="row" alignItems="center" spacing={1}>
                            <Iconify icon="mdi:map-marker" sx={{ color: 'text.secondary' }} />
                            <Typography variant="body2">
                              {tenant.locationsCount || 0}
                            </Typography>
                            {tenant.completedLocations > 0 && (
                              <Typography variant="caption" color="text.secondary">
                                ({tenant.completedLocations} setup)
                              </Typography>
                            )}
                          </Stack>
                        </TableCell>
                        <TableCell>
                          <Stack direction="row" alignItems="center" spacing={1}>
                            <Iconify icon="solar:widget-5-bold" sx={{ color: 'text.secondary' }} />
                            <Typography variant="body2">
                              {tenant.totalPlatformIntegrations || 0}
                            </Typography>
                          </Stack>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ width: 120 }}>
                            <Stack direction="row" justifyContent="space-between" sx={{ mb: 1 }}>
                              <Typography variant="body2">{Math.round(tenant.overallProgress || 0)}%</Typography>
                            </Stack>
                            <LinearProgress 
                              variant="determinate" 
                              value={tenant.overallProgress || 0} 
                              sx={{ height: 8, borderRadius: 1 }}
                            />
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary">
                            {tenant.lastActivity ? format(new Date(tenant.lastActivity), 'MMM dd, yyyy') : 'Never'}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Tooltip title="More actions">
                            <IconButton
                              onClick={(e) => handleMenuOpen(e, tenant)}
                              size="small"
                            >
                              <Iconify icon="solar:menu-dots-bold" />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            {/* Pagination */}
            <TablePagination
              component="div"
              count={pagination.total}
              page={pagination.page - 1}
              onPageChange={handlePageChange}
              rowsPerPage={pagination.limit}
              onRowsPerPageChange={handleRowsPerPageChange}
              rowsPerPageOptions={[10, 25, 50]}
            />
          </Box>
        </Card>

        {/* Actions Menu */}
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleMenuClose}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'right',
          }}
          transformOrigin={{
            vertical: 'top',
            horizontal: 'right',
          }}
        >
          <MenuItem onClick={() => {
            router.push(`/tenants/${selectedTenant?.id}`);
            handleMenuClose();
          }}>
            <ListItemIcon>
              <Iconify icon="solar:eye-bold" />
            </ListItemIcon>
            <ListItemText>View Details</ListItemText>
          </MenuItem>
          <MenuItem onClick={() => {
            router.push(`/tenants/${selectedTenant?.id}/edit`);
            handleMenuClose();
          }}>
            <ListItemIcon>
              <Iconify icon="solar:pen-bold" />
            </ListItemIcon>
            <ListItemText>Edit Tenant</ListItemText>
          </MenuItem>
          <MenuItem>
            <ListItemIcon>
              <Iconify icon="solar:download-bold" />
            </ListItemIcon>
            <ListItemText>Export Data</ListItemText>
          </MenuItem>
          <Divider />
          <MenuItem sx={{ color: 'error.main' }}>
            <ListItemIcon>
              <Iconify icon="solar:trash-bin-trash-bold" />
            </ListItemIcon>
            <ListItemText>Delete Tenant</ListItemText>
          </MenuItem>
        </Menu>
      </DashboardContent>
    // </RoleGuard>
  );
}
