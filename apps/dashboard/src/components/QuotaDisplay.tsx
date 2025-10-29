// 'use client';

// import React from 'react';
// import { TenantQuotas, isQuotaExceeded, isQuotaNearLimit, getRemainingQuota, getQuotaUsagePercentage } from '@wirecrest/feature-flags';

// import {
//   Box,
//   Card,
//   Chip,
//   Grid,
//   Alert,
//   Button,
//   Tooltip,
//   CardHeader,
//   Typography,
//   IconButton,
//   CardContent,
//   LinearProgress
// } from '@mui/material';
// import {
//   Api as ApiIcon,
//   Info as InfoIcon,
//   Error as ErrorIcon,
//   People as PeopleIcon,
//   Storage as StorageIcon,
//   Warning as WarningIcon,
//   Refresh as RefreshIcon,
//   RateReview as ReviewIcon,
//   Download as DownloadIcon,
//   CheckCircle as CheckIcon,
//   LocationOn as LocationIcon
// } from '@mui/icons-material';

// interface QuotaDisplayProps {
//   quotas: TenantQuotas;
//   status: 'healthy' | 'warning' | 'critical';
//   warnings: string[];
//   critical: string[];
//   onRefresh?: () => void;
//   onUpgrade?: () => void;
// }

// interface QuotaItemProps {
//   title: string;
//   icon: React.ReactNode;
//   limit: any;
//   color: 'success' | 'warning' | 'error';
//   showUpgrade?: boolean;
//   onUpgrade?: () => void;
// }

// function QuotaItem({ title, icon, limit, color, showUpgrade, onUpgrade }: QuotaItemProps) {
//   const usage = getQuotaUsagePercentage(limit);
//   const remaining = getRemainingQuota(limit);
//   const isExceeded = isQuotaExceeded(limit);
//   const isNearLimit = isQuotaNearLimit(limit);

//   const getStatusIcon = () => {
//     if (isExceeded) return <ErrorIcon color="error" />;
//     if (isNearLimit) return <WarningIcon color="warning" />;
//     return <CheckIcon color="success" />;
//   };

//   const getStatusColor = () => {
//     if (isExceeded) return 'error';
//     if (isNearLimit) return 'warning';
//     return 'success';
//   };

//   return (
//     <Card sx={{ height: '100%' }}>
//       <CardContent>
//         <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
//           <Box display="flex" alignItems="center" gap={1}>
//             {icon}
//             <Typography variant="h6">{title}</Typography>
//           </Box>
//           {getStatusIcon()}
//         </Box>

//         <Box mb={2}>
//           <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
//             <Typography variant="body2" color="text.secondary">
//               {limit.used} / {limit.max}
//             </Typography>
//             <Typography variant="body2" color="text.secondary">
//               {Math.round(usage)}%
//             </Typography>
//           </Box>
          
//           <LinearProgress
//             variant="determinate"
//             value={usage}
//             color={getStatusColor()}
//             sx={{ height: 8, borderRadius: 4 }}
//           />
//         </Box>

//         <Box display="flex" justifyContent="space-between" alignItems="center">
//           <Typography variant="body2" color="text.secondary">
//             {remaining} remaining
//           </Typography>
          
//           {showUpgrade && (isExceeded || isNearLimit) && (
//             <Button
//               size="small"
//               variant="outlined"
//               onClick={onUpgrade}
//               color={isExceeded ? 'error' : 'warning'}
//             >
//               Upgrade
//             </Button>
//           )}
//         </Box>

//         {limit.allowOverage && (
//           <Box mt={1}>
//             <Chip 
//               label="Overage allowed" 
//               size="small" 
//               color="info" 
//               variant="outlined"
//             />
//           </Box>
//         )}
//       </CardContent>
//     </Card>
//   );
// }

// export function QuotaDisplay({ 
//   quotas, 
//   status, 
//   warnings, 
//   critical, 
//   onRefresh, 
//   onUpgrade 
// }: QuotaDisplayProps) {
//   const getStatusColor = () => {
//     switch (status) {
//       case 'critical': return 'error';
//       case 'warning': return 'warning';
//       default: return 'success';
//     }
//   };

//   const getStatusIcon = () => {
//     switch (status) {
//       case 'critical': return <ErrorIcon />;
//       case 'warning': return <WarningIcon />;
//       default: return <CheckIcon />;
//     }
//   };

//   return (
//     <Card>
//       <CardHeader
//         title="Usage & Limits"
//         action={
//           <Box display="flex" alignItems="center" gap={1}>
//             <Tooltip title="Quota status information">
//               <IconButton size="small">
//                 <InfoIcon />
//               </IconButton>
//             </Tooltip>
//             {onRefresh && (
//               <IconButton size="small" onClick={onRefresh}>
//                 <RefreshIcon />
//               </IconButton>
//             )}
//           </Box>
//         }
//       />
//       <CardContent>
//         {/* Status Alert */}
//         {status !== 'healthy' && (
//           <Alert 
//             severity={getStatusColor()} 
//             icon={getStatusIcon()}
//             sx={{ mb: 3 }}
//             action={
//               onUpgrade && (
//                 <Button 
//                   color="inherit" 
//                   size="small" 
//                   onClick={onUpgrade}
//                 >
//                   Upgrade Plan
//                 </Button>
//               )
//             }
//           >
//             {status === 'critical' 
//               ? 'Some quotas have been exceeded. Upgrade your plan to continue.'
//               : 'Some quotas are approaching their limits. Consider upgrading your plan.'
//             }
//           </Alert>
//         )}

//         {/* Critical Issues */}
//         {critical.length > 0 && (
//           <Alert severity="error" sx={{ mb: 2 }}>
//             <Typography variant="subtitle2" gutterBottom>
//               Critical Issues:
//             </Typography>
//             {critical.map((issue, index) => (
//               <Typography key={index} variant="body2">
//                 • {issue}
//               </Typography>
//             ))}
//           </Alert>
//         )}

//         {/* Warnings */}
//         {warnings.length > 0 && (
//           <Alert severity="warning" sx={{ mb: 2 }}>
//             <Typography variant="subtitle2" gutterBottom>
//               Warnings:
//             </Typography>
//             {warnings.map((warning, index) => (
//               <Typography key={index} variant="body2">
//                 • {warning}
//               </Typography>
//             ))}
//           </Alert>
//         )}

//         {/* Quota Items */}
//         <Grid container spacing={2}>
//           <Grid item xs={12} md={6} lg={4}>
//             <QuotaItem
//               title="Team Seats"
//               icon={<PeopleIcon />}
//               limit={quotas.seats}
//               color={isQuotaExceeded(quotas.seats) ? 'error' : isQuotaNearLimit(quotas.seats) ? 'warning' : 'success'}
//               showUpgrade={!quotas.seats.allowOverage}
//               onUpgrade={onUpgrade}
//             />
//           </Grid>

//           <Grid item xs={12} md={6} lg={4}>
//             <QuotaItem
//               title="Business Locations"
//               icon={<LocationIcon />}
//               limit={quotas.locations}
//               color={isQuotaExceeded(quotas.locations) ? 'error' : isQuotaNearLimit(quotas.locations) ? 'warning' : 'success'}
//               showUpgrade={!quotas.locations.allowOverage}
//               onUpgrade={onUpgrade}
//             />
//           </Grid>

//           <Grid item xs={12} md={6} lg={4}>
//             <QuotaItem
//               title="Review Scraping"
//               icon={<ReviewIcon />}
//               limit={quotas.reviewRateLimit}
//               color={isQuotaExceeded(quotas.reviewRateLimit) ? 'error' : isQuotaNearLimit(quotas.reviewRateLimit) ? 'warning' : 'success'}
//               showUpgrade
//               onUpgrade={onUpgrade}
//             />
//           </Grid>

//           <Grid item xs={12} md={6} lg={4}>
//             <QuotaItem
//               title="API Calls"
//               icon={<ApiIcon />}
//               limit={quotas.apiCalls}
//               color={isQuotaExceeded(quotas.apiCalls) ? 'error' : isQuotaNearLimit(quotas.apiCalls) ? 'warning' : 'success'}
//               showUpgrade
//               onUpgrade={onUpgrade}
//             />
//           </Grid>

//           <Grid item xs={12} md={6} lg={4}>
//             <QuotaItem
//               title="Data Retention"
//               icon={<StorageIcon />}
//               limit={quotas.dataRetention}
//               color={isQuotaExceeded(quotas.dataRetention) ? 'error' : isQuotaNearLimit(quotas.dataRetention) ? 'warning' : 'success'}
//               showUpgrade
//               onUpgrade={onUpgrade}
//             />
//           </Grid>

//           <Grid item xs={12} md={6} lg={4}>
//             <QuotaItem
//               title="Data Exports"
//               icon={<DownloadIcon />}
//               limit={quotas.exportLimit}
//               color={isQuotaExceeded(quotas.exportLimit) ? 'error' : isQuotaNearLimit(quotas.exportLimit) ? 'warning' : 'success'}
//               showUpgrade
//               onUpgrade={onUpgrade}
//             />
//           </Grid>
//         </Grid>

//         {/* Plan Information */}
//         <Box mt={3} p={2} bgcolor="grey.50" borderRadius={1}>
//           <Typography variant="subtitle2" gutterBottom>
//             Plan Information
//           </Typography>
//           <Typography variant="body2" color="text.secondary">
//             Current plan includes the above limits. Upgrade your plan to increase limits or add overage allowances.
//           </Typography>
//         </Box>
//       </CardContent>
//     </Card>
//   );
// }

// export default QuotaDisplay;
