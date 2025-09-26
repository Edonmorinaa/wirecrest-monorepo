
import { Container, Typography, Box, Button, Grid, Card, CardContent } from '@mui/material';
import { RouterLink } from 'src/routes/components';
import { paths } from 'src/routes/paths';
import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

export default function SuperAdminPage() {
  return (
    <>
      <Container maxWidth="xl">
        <Box sx={{ mb: 5 }}>
          <Typography variant="h4" sx={{ mb: 1 }}>
            Super Admin Dashboard
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage tenants, users, and system settings across the platform.
          </Typography>
        </Box>

        {/* Quick Navigation Cards */}
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6} md={4}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Iconify icon="solar:buildings-bold" width={24} sx={{ mr: 1, color: 'primary.main' }} />
                  <Typography variant="h6">Tenant Management</Typography>
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Manage organizations, create new tenants, and view tenant analytics.
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <Button
                    component={RouterLink}
                    href={paths.dashboard.superadmin.tenants.root}
                    variant="contained"
                    size="small"
                    startIcon={<Iconify icon="solar:list-bold" />}
                  >
                    View All
                  </Button>
                  <Button
                    component={RouterLink}
                    href={paths.dashboard.superadmin.tenants.create}
                    variant="outlined"
                    size="small"
                    startIcon={<Iconify icon="solar:add-circle-bold" />}
                  >
                    Create New
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={4}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Iconify icon="solar:users-group-rounded-bold" width={24} sx={{ mr: 1, color: 'success.main' }} />
                  <Typography variant="h6">User Management</Typography>
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Manage user accounts, roles, and permissions across the platform.
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <Button
                    component={RouterLink}
                    href={paths.dashboard.superadmin.users.root}
                    variant="contained"
                    size="small"
                    startIcon={<Iconify icon="solar:list-bold" />}
                  >
                    View Users
                  </Button>
                  <Button
                    component={RouterLink}
                    href={paths.dashboard.superadmin.users.roles}
                    variant="outlined"
                    size="small"
                    startIcon={<Iconify icon="solar:shield-user-bold" />}
                  >
                    Roles
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={4}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Iconify icon="solar:chart-bold" width={24} sx={{ mr: 1, color: 'warning.main' }} />
                  <Typography variant="h6">Analytics & Monitoring</Typography>
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  View system analytics, monitoring data, and platform health.
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <Button
                    component={RouterLink}
                    href={paths.dashboard.superadmin.analytics}
                    variant="contained"
                    size="small"
                    startIcon={<Iconify icon="solar:chart-bold" />}
                  >
                    Analytics
                  </Button>
                  <Button
                    component={RouterLink}
                    href={paths.dashboard.superadmin.monitoring}
                    variant="outlined"
                    size="small"
                    startIcon={<Iconify icon="solar:monitor-bold" />}
                  >
                    Monitoring
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={4}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Iconify icon="solar:card-bold" width={24} sx={{ mr: 1, color: 'info.main' }} />
                  <Typography variant="h6">Billing & Subscriptions</Typography>
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Manage billing, subscriptions, and payment methods.
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <Button
                    component={RouterLink}
                    href={paths.dashboard.superadmin.billing.root}
                    variant="contained"
                    size="small"
                    startIcon={<Iconify icon="solar:card-bold" />}
                  >
                    Billing
                  </Button>
                  <Button
                    component={RouterLink}
                    href={paths.dashboard.superadmin.billing.subscriptions}
                    variant="outlined"
                    size="small"
                    startIcon={<Iconify icon="solar:refresh-bold" />}
                  >
                    Subscriptions
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={4}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Iconify icon="solar:settings-bold" width={24} sx={{ mr: 1, color: 'secondary.main' }} />
                  <Typography variant="h6">System Settings</Typography>
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Configure system settings, platform integrations, and more.
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <Button
                    component={RouterLink}
                    href={paths.dashboard.superadmin.platforms.google}
                    variant="contained"
                    size="small"
                    startIcon={<Iconify icon="solar:settings-bold" />}
                  >
                    Platform Config
                  </Button>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<Iconify icon="solar:gear-bold" />}
                    disabled
                  >
                    Settings
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={4}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Iconify icon="solar:shield-check-bold" width={24} sx={{ mr: 1, color: 'error.main' }} />
                  <Typography variant="h6">System Health</Typography>
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Monitor system health, logs, and performance metrics.
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <Button
                    variant="contained"
                    size="small"
                    startIcon={<Iconify icon="solar:shield-check-bold" />}
                    disabled
                  >
                    Health Check
                  </Button>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<Iconify icon="solar:file-text-bold" />}
                    disabled
                  >
                    Logs
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Container>
    </>
  );
}
