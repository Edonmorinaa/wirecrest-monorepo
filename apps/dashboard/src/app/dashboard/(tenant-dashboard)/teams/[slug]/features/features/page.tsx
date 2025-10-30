// 'use client';

// import React, { useState } from 'react';
// import { Feature } from '@wirecrest/feature-flags';
// import { useFeatureFlags } from '@/hooks/useFeatureFlags';
// import { FeatureUsageCard } from '@/components/FeatureUsageCard';
// import { FeatureToggleCard } from '@/components/FeatureToggleCard';

// import {
//   Info as InfoIcon,
//   Refresh as RefreshIcon,
//   Settings as SettingsIcon,
//   Schedule as ScheduleIcon,
//   Security as SecurityIcon,
//   Analytics as AnalyticsIcon
// } from '@mui/icons-material';
// import {
//   Box,
//   Tab,
//   Grid,
//   Card,
//   Tabs,
//   Chip,
//   Alert,
//   Button,
//   Dialog,
//   Select,
//   Tooltip,
//   MenuItem,
//   Typography,
//   CardHeader,
//   InputLabel,
//   IconButton,
//   CardContent,
//   DialogTitle,
//   FormControl,
//   DialogContent,
//   DialogActions
// } from '@mui/material';

// interface TabPanelProps {
//   children?: React.ReactNode;
//   index: number;
//   value: number;
// }

// function TabPanel(props: TabPanelProps) {
//   const { children, value, index, ...other } = props;

//   return (
//     <div
//       role="tabpanel"
//       hidden={value !== index}
//       id={`feature-tabpanel-${index}`}
//       aria-labelledby={`feature-tab-${index}`}
//       {...other}
//     >
//       {value === index && (
//         <Box sx={{ p: 3 }}>
//           {children}
//         </Box>
//       )}
//     </div>
//   );
// }

// interface TeamFeaturesPageProps {
//   params: {
//     teamId: string;
//   };
// }

// export default function TeamFeaturesPage({ params }: TeamFeaturesPageProps) {
//   const { teamId } = params;
//   const [tabValue, setTabValue] = useState(0);
//   const [upgradeDialogOpen, setUpgradeDialogOpen] = useState(false);
//   const [selectedPlan, setSelectedPlan] = useState('');

//   const {
//     features,
//     isEnabled,
//     isDisabled,
//     loading,
//     error,
//     refresh,
//     updateFeature,
//     updateFeatures,
//     metadata,
//     sources,
//     isCustom,
//     scrapeIntervalHours
//   } = useFeatureFlags(teamId);

//   const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
//     setTabValue(newValue);
//   };

//   const handleUpgrade = () => {
//     setUpgradeDialogOpen(true);
//   };

//   const handleUpgradeConfirm = () => {
//     // Navigate to upgrade page
//     window.location.href = `/dashboard/teams/${teamId}/upgrade`;
//   };

//   const handleRefresh = async () => {
//     await refresh();
//   };

//   // Group features by platform
//   const platformFeatures = {
//     Google: [
//       { key: Feature.Google.Overview, label: 'Overview', description: 'Business profile overview and basic metrics' },
//       { key: Feature.Google.Reviews, label: 'Reviews', description: 'Review collection and analysis' },
//       { key: Feature.Google.Analytics, label: 'Analytics', description: 'Advanced analytics and insights' },
//       { key: Feature.Google.CompetitorAnalysis, label: 'Competitor Analysis', description: 'Compare with competitors' }
//     ],
//     Facebook: [
//       { key: Feature.Facebook.Overview, label: 'Overview', description: 'Facebook page overview and metrics' },
//       { key: Feature.Facebook.Reviews, label: 'Reviews', description: 'Facebook reviews and ratings' },
//       { key: Feature.Facebook.Analytics, label: 'Analytics', description: 'Facebook insights and analytics' },
//       { key: Feature.Facebook.CompetitorAnalysis, label: 'Competitor Analysis', description: 'Facebook competitor comparison' }
//     ],
//     Twitter: [
//       { key: Feature.Twitter.ProfileTracking, label: 'Profile Tracking', description: 'Track Twitter profiles and mentions' },
//       { key: Feature.Twitter.Alerts, label: 'Alerts', description: 'Real-time Twitter alerts and notifications' },
//       { key: Feature.Twitter.Analytics, label: 'Analytics', description: 'Twitter analytics and engagement metrics' },
//       { key: Feature.Twitter.CompetitorAnalysis, label: 'Competitor Analysis', description: 'Twitter competitor monitoring' }
//     ],
//     Instagram: [
//       { key: Feature.Instagram.Engagement, label: 'Engagement', description: 'Instagram engagement tracking' },
//       { key: Feature.Instagram.Followers, label: 'Followers', description: 'Follower growth and analytics' },
//       { key: Feature.Instagram.Analytics, label: 'Analytics', description: 'Instagram insights and metrics' },
//       { key: Feature.Instagram.CompetitorAnalysis, label: 'Competitor Analysis', description: 'Instagram competitor analysis' }
//     ],
//     TikTok: [
//       { key: Feature.TikTok.Analytics, label: 'Analytics', description: 'TikTok performance analytics' },
//       { key: Feature.TikTok.Reach, label: 'Reach', description: 'TikTok reach and engagement metrics' },
//       { key: Feature.TikTok.CompetitorAnalysis, label: 'Competitor Analysis', description: 'TikTok competitor monitoring' }
//     ],
//     TripAdvisor: [
//       { key: Feature.TripAdvisor.Overview, label: 'Overview', description: 'TripAdvisor business overview' },
//       { key: Feature.TripAdvisor.Reviews, label: 'Reviews', description: 'TripAdvisor reviews and ratings' },
//       { key: Feature.TripAdvisor.Analytics, label: 'Analytics', description: 'TripAdvisor analytics and insights' },
//       { key: Feature.TripAdvisor.CompetitorAnalysis, label: 'Competitor Analysis', description: 'TripAdvisor competitor analysis' }
//     ],
//     Booking: [
//       { key: Feature.Booking.Overview, label: 'Overview', description: 'Booking.com property overview' },
//       { key: Feature.Booking.Reviews, label: 'Reviews', description: 'Booking.com reviews and ratings' },
//       { key: Feature.Booking.Analytics, label: 'Analytics', description: 'Booking.com analytics and insights' },
//       { key: Feature.Booking.CompetitorAnalysis, label: 'Competitor Analysis', description: 'Booking.com competitor analysis' }
//     ],
//     LinkedIn: [
//       { key: Feature.LinkedIn.Analytics, label: 'Analytics', description: 'LinkedIn company page analytics' },
//       { key: Feature.LinkedIn.CompetitorAnalysis, label: 'Competitor Analysis', description: 'LinkedIn competitor monitoring' }
//     ],
//     YouTube: [
//       { key: Feature.YouTube.Analytics, label: 'Analytics', description: 'YouTube channel analytics' },
//       { key: Feature.YouTube.CompetitorAnalysis, label: 'Competitor Analysis', description: 'YouTube competitor analysis' }
//     ]
//   };

//   const platformFeaturesArray = Object.entries(platformFeatures).map(([platform, features]) => ({
//     platform,
//     features: features.map(f => ({
//       ...f,
//       enabled: isEnabled(f.key),
//       source: sources?.[f.key] || 'unknown'
//     }))
//   }));

//   if (loading) {
//     return (
//       <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
//         <Typography variant="body1">Loading features...</Typography>
//       </Box>
//     );
//   }

//   if (error) {
//     return (
//       <Alert severity="error" sx={{ m: 2 }}>
//         Error loading features: {error}
//       </Alert>
//     );
//   }

//   return (
//     <Box sx={{ p: 3 }}>
//       {/* Header */}
//       <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
//         <Box>
//           <Typography variant="h4" gutterBottom>
//             Feature Management
//           </Typography>
//           <Typography variant="body2" color="text.secondary">
//             Manage your team's feature access and platform integrations
//           </Typography>
//         </Box>
//         <Box display="flex" gap={1}>
//           <Button
//             variant="outlined"
//             startIcon={<RefreshIcon />}
//             onClick={handleRefresh}
//             disabled={loading}
//           >
//             Refresh
//           </Button>
//           <Button
//             variant="contained"
//             startIcon={<SettingsIcon />}
//             onClick={handleUpgrade}
//           >
//             Upgrade Plan
//           </Button>
//         </Box>
//       </Box>

//       {/* Plan Status */}
//       <Card sx={{ mb: 3 }}>
//         <CardContent>
//           <Box display="flex" justifyContent="space-between" alignItems="center">
//             <Box>
//               <Typography variant="h6">
//                 Current Plan: {isCustom ? 'Custom Enterprise' : 'Standard'}
//               </Typography>
//               <Typography variant="body2" color="text.secondary">
//                 Scrape Interval: {scrapeIntervalHours || 6} hours
//               </Typography>
//             </Box>
//             <Box display="flex" gap={1}>
//               {isCustom && <Chip label="Custom Plan" color="primary" />}
//               <Chip 
//                 label={`${Object.values(features).filter(Boolean).length} Features Enabled`} 
//                 color="success" 
//                 variant="outlined" 
//               />
//             </Box>
//           </Box>
//         </CardContent>
//       </Card>

//       {/* Tabs */}
//       <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
//         <Tabs value={tabValue} onChange={handleTabChange}>
//           <Tab 
//             label="Platform Features" 
//             icon={<SettingsIcon />} 
//             iconPosition="start"
//           />
//           <Tab 
//             label="Usage Analytics" 
//             icon={<AnalyticsIcon />} 
//             iconPosition="start"
//           />
//           <Tab 
//             label="Automation" 
//             icon={<ScheduleIcon />} 
//             iconPosition="start"
//           />
//           <Tab 
//             label="Security" 
//             icon={<SecurityIcon />} 
//             iconPosition="start"
//           />
//         </Tabs>
//       </Box>

//       {/* Platform Features Tab */}
//       <TabPanel value={tabValue} index={0}>
//         <Grid container spacing={3}>
//           {platformFeaturesArray.map(({ platform, features }) => (
//             <Grid item xs={12} md={6} lg={4} key={platform}>
//               <FeatureToggleCard
//                 platform={platform}
//                 features={features}
//                 onFeatureToggle={async (featureKey, enabled) => {
//                   await updateFeature(featureKey, enabled);
//                 }}
//                 loading={loading}
//                 disabled={!isCustom} // Only allow changes for custom plans
//               />
//             </Grid>
//           ))}
//         </Grid>
//       </TabPanel>

//       {/* Usage Analytics Tab */}
//       <TabPanel value={tabValue} index={1}>
//         <Grid container spacing={3}>
//           <Grid item xs={12} md={8}>
//             <FeatureUsageCard tenantId={teamId} onRefresh={handleRefresh} />
//           </Grid>
//           <Grid item xs={12} md={4}>
//             <Card>
//               <CardHeader title="Feature Sources" />
//               <CardContent>
//                 <Box>
//                   {Object.entries(sources || {}).map(([feature, source]) => (
//                     <Box key={feature} display="flex" justifyContent="space-between" mb={1}>
//                       <Typography variant="body2">{feature}</Typography>
//                       <Chip 
//                         label={source} 
//                         size="small" 
//                         color={source === 'plan' ? 'primary' : source === 'override' ? 'warning' : 'default'}
//                       />
//                     </Box>
//                   ))}
//                 </Box>
//               </CardContent>
//             </Card>
//           </Grid>
//         </Grid>
//       </TabPanel>

//       {/* Automation Tab */}
//       <TabPanel value={tabValue} index={2}>
//         <Grid container spacing={3}>
//           <Grid item xs={12} md={6}>
//             <Card>
//               <CardHeader 
//                 title="Scheduled Scraping"
//                 action={
//                   <Tooltip title="Automatically scrape data at regular intervals">
//                     <IconButton size="small">
//                       <InfoIcon />
//                     </IconButton>
//                   </Tooltip>
//                 }
//               />
//               <CardContent>
//                 <Box display="flex" alignItems="center" gap={2}>
//                   <Typography variant="body1">
//                     Interval: {scrapeIntervalHours || 6} hours
//                   </Typography>
//                   <Chip 
//                     label={isEnabled('automation.scheduledScraping') ? 'Enabled' : 'Disabled'} 
//                     color={isEnabled('automation.scheduledScraping') ? 'success' : 'default'}
//                   />
//                 </Box>
//               </CardContent>
//             </Card>
//           </Grid>
//           <Grid item xs={12} md={6}>
//             <Card>
//               <CardHeader title="Real-time Monitoring" />
//               <CardContent>
//                 <Box display="flex" alignItems="center" gap={2}>
//                   <Typography variant="body1">
//                     Real-time alerts and notifications
//                   </Typography>
//                   <Chip 
//                     label={isEnabled('platform.realTimeMonitoring') ? 'Enabled' : 'Disabled'} 
//                     color={isEnabled('platform.realTimeMonitoring') ? 'success' : 'default'}
//                   />
//                 </Box>
//               </CardContent>
//             </Card>
//           </Grid>
//         </Grid>
//       </TabPanel>

//       {/* Security Tab */}
//       <TabPanel value={tabValue} index={3}>
//         <Grid container spacing={3}>
//           <Grid item xs={12} md={6}>
//             <Card>
//               <CardHeader title="API Access" />
//               <CardContent>
//                 <Box display="flex" alignItems="center" gap={2}>
//                   <Typography variant="body1">
//                     API rate limiting and access control
//                   </Typography>
//                   <Chip 
//                     label={isEnabled('platform.apiAccess') ? 'Enabled' : 'Disabled'} 
//                     color={isEnabled('platform.apiAccess') ? 'success' : 'default'}
//                   />
//                 </Box>
//               </CardContent>
//             </Card>
//           </Grid>
//           <Grid item xs={12} md={6}>
//             <Card>
//               <CardHeader title="Data Export" />
//               <CardContent>
//                 <Box display="flex" alignItems="center" gap={2}>
//                   <Typography variant="body1">
//                     Export data in various formats
//                   </Typography>
//                   <Chip 
//                     label={isEnabled('platform.dataExport') ? 'Enabled' : 'Disabled'} 
//                     color={isEnabled('platform.dataExport') ? 'success' : 'default'}
//                   />
//                 </Box>
//               </CardContent>
//             </Card>
//           </Grid>
//         </Grid>
//       </TabPanel>

//       {/* Upgrade Dialog */}
//       <Dialog open={upgradeDialogOpen} onClose={() => setUpgradeDialogOpen(false)} maxWidth="sm" fullWidth>
//         <DialogTitle>Upgrade Your Plan</DialogTitle>
//         <DialogContent>
//           <FormControl fullWidth sx={{ mt: 2 }}>
//             <InputLabel>Select Plan</InputLabel>
//             <Select
//               value={selectedPlan}
//               onChange={(e) => setSelectedPlan(e.target.value)}
//             >
//               <MenuItem value="pro">Pro Plan - $99/month</MenuItem>
//               <MenuItem value="enterprise">Enterprise Plan - $299/month</MenuItem>
//               <MenuItem value="custom">Custom Enterprise - Contact Sales</MenuItem>
//             </Select>
//           </FormControl>
//         </DialogContent>
//         <DialogActions>
//           <Button onClick={() => setUpgradeDialogOpen(false)}>Cancel</Button>
//           <Button onClick={handleUpgradeConfirm} variant="contained">
//             Upgrade
//           </Button>
//         </DialogActions>
//       </Dialog>
//     </Box>
//   );
// }
