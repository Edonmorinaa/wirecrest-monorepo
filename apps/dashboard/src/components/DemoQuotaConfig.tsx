// 'use client';

// import React, { useState } from 'react';
// import { PLAN_QUOTAS } from '@wirecrest/feature-flags';
// import { configureDemoQuotas } from '@/actions';

// import {
//   Stop as StopIcon,
//   PlayArrow as PlayIcon,
//   Refresh as RefreshIcon,
//   Settings as SettingsIcon
// } from '@mui/icons-material';
// import {
//   Box,
//   Card,
//   Grid,
//   Chip,
//   Alert,
//   Button,
//   Dialog,
//   Select,
//   Switch,
//   MenuItem,
//   TextField,
//   CardHeader,
//   Typography,
//   InputLabel,
//   CardContent,
//   DialogTitle,
//   FormControl,
//   DialogContent,
//   DialogActions,
//   FormControlLabel
// } from '@mui/material';

// interface DemoQuotaConfigProps {
//   tenantId: string;
//   onQuotaChange?: (quotas: any) => void;
// }

// export function DemoQuotaConfig({ tenantId, onQuotaChange }: DemoQuotaConfigProps) {
//   const [open, setOpen] = useState(false);
//   const [selectedPlan, setSelectedPlan] = useState('demo');
//   const [customQuotas, setCustomQuotas] = useState(PLAN_QUOTAS.demo);
//   const [isDemoMode, setIsDemoMode] = useState(true);

//   const handlePlanChange = (plan: string) => {
//     setSelectedPlan(plan);
//     setCustomQuotas(PLAN_QUOTAS[plan as keyof typeof PLAN_QUOTAS]);
//   };

//   const handleQuotaChange = (quotaType: string, field: string, value: number) => {
//     setCustomQuotas(prev => ({
//       ...prev,
//       [quotaType]: {
//         ...prev[quotaType as keyof typeof prev],
//         [field]: value
//       }
//     }));
//   };

//   const handleApplyQuotas = async () => {
//     try {
//       // Use server action instead of fetch
//       const result = await configureDemoQuotas(
//         tenantId,
//         selectedPlan,
//         customQuotas,
//         isDemoMode
//       );

//       if (result.success) {
//         onQuotaChange?.(customQuotas);
//         setOpen(false);
//       } else {
//         console.error('Error applying demo quotas:', result.error);
//       }
//     } catch (error) {
//       console.error('Error applying demo quotas:', error);
//     }
//   };

//   const handleResetToDemo = () => {
//     setSelectedPlan('demo');
//     setCustomQuotas(PLAN_QUOTAS.demo);
//     setIsDemoMode(true);
//   };

//   return (
//     <>
//       <Card>
//         <CardHeader
//           title="Demo Configuration"
//           action={
//             <Button
//               variant="outlined"
//               startIcon={<SettingsIcon />}
//               onClick={() => setOpen(true)}
//               size="small"
//             >
//               Configure Demo
//             </Button>
//           }
//         />
//         <CardContent>
//           <Box display="flex" alignItems="center" gap={2} mb={2}>
//             <Chip 
//               label={isDemoMode ? "Demo Mode" : "Live Mode"} 
//               color={isDemoMode ? "warning" : "success"}
//               variant="outlined"
//             />
//             <Typography variant="body2" color="text.secondary">
//               {isDemoMode 
//                 ? "Showing limited data for demonstration purposes"
//                 : "Showing full data with actual quotas"
//               }
//             </Typography>
//           </Box>

//           <Alert severity="info" sx={{ mb: 2 }}>
//             <Typography variant="body2">
//               Demo mode shows limited data to demonstrate the platform's capabilities 
//               without overwhelming users with full functionality.
//             </Typography>
//           </Alert>

//           <Box display="flex" gap={2}>
//             <Button
//               variant="contained"
//               startIcon={<PlayIcon />}
//               onClick={() => setIsDemoMode(true)}
//               color="warning"
//               size="small"
//             >
//               Enable Demo Mode
//             </Button>
//             <Button
//               variant="outlined"
//               startIcon={<StopIcon />}
//               onClick={() => setIsDemoMode(false)}
//               size="small"
//             >
//               Disable Demo Mode
//             </Button>
//             <Button
//               variant="outlined"
//               startIcon={<RefreshIcon />}
//               onClick={handleResetToDemo}
//               size="small"
//             >
//               Reset to Demo
//             </Button>
//           </Box>
//         </CardContent>
//       </Card>

//       <Dialog open={open} onClose={() => setOpen(false)} maxWidth="md" fullWidth>
//         <DialogTitle>Configure Demo Quotas</DialogTitle>
//         <DialogContent>
//           <Box mb={3}>
//             <FormControl fullWidth>
//               <InputLabel>Plan Template</InputLabel>
//               <Select
//                 value={selectedPlan}
//                 onChange={(e) => handlePlanChange(e.target.value)}
//               >
//                 <MenuItem value="demo">Demo (Limited)</MenuItem>
//                 <MenuItem value="basic">Basic</MenuItem>
//                 <MenuItem value="pro">Pro</MenuItem>
//                 <MenuItem value="enterprise">Enterprise</MenuItem>
//               </Select>
//             </FormControl>
//           </Box>

//           <FormControlLabel
//             control={
//               <Switch
//                 checked={isDemoMode}
//                 onChange={(e) => setIsDemoMode(e.target.checked)}
//               />
//             }
//             label="Enable Demo Mode"
//           />

//           <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
//             Customize Quotas
//           </Typography>

//           <Grid container spacing={2}>
//             <Grid item xs={12} md={6}>
//               <Typography variant="subtitle2" gutterBottom>
//                 Team Seats
//               </Typography>
//               <TextField
//                 label="Max Seats"
//                 type="number"
//                 value={customQuotas.seats.max}
//                 onChange={(e) => handleQuotaChange('seats', 'max', parseInt(e.target.value))}
//                 fullWidth
//                 size="small"
//               />
//             </Grid>

//             <Grid item xs={12} md={6}>
//               <Typography variant="subtitle2" gutterBottom>
//                 Business Locations
//               </Typography>
//               <TextField
//                 label="Max Locations"
//                 type="number"
//                 value={customQuotas.locations.max}
//                 onChange={(e) => handleQuotaChange('locations', 'max', parseInt(e.target.value))}
//                 fullWidth
//                 size="small"
//               />
//             </Grid>

//             <Grid item xs={12} md={6}>
//               <Typography variant="subtitle2" gutterBottom>
//                 Review Rate Limit (Daily)
//               </Typography>
//               <TextField
//                 label="Max Reviews"
//                 type="number"
//                 value={customQuotas.reviewRateLimit.max}
//                 onChange={(e) => handleQuotaChange('reviewRateLimit', 'max', parseInt(e.target.value))}
//                 fullWidth
//                 size="small"
//               />
//             </Grid>

//             <Grid item xs={12} md={6}>
//               <Typography variant="subtitle2" gutterBottom>
//                 API Calls (Monthly)
//               </Typography>
//               <TextField
//                 label="Max API Calls"
//                 type="number"
//                 value={customQuotas.apiCalls.max}
//                 onChange={(e) => handleQuotaChange('apiCalls', 'max', parseInt(e.target.value))}
//                 fullWidth
//                 size="small"
//               />
//             </Grid>

//             <Grid item xs={12} md={6}>
//               <Typography variant="subtitle2" gutterBottom>
//                 Data Retention (Days)
//               </Typography>
//               <TextField
//                 label="Max Days"
//                 type="number"
//                 value={customQuotas.dataRetention.max}
//                 onChange={(e) => handleQuotaChange('dataRetention', 'max', parseInt(e.target.value))}
//                 fullWidth
//                 size="small"
//               />
//             </Grid>

//             <Grid item xs={12} md={6}>
//               <Typography variant="subtitle2" gutterBottom>
//                 Data Exports (Monthly)
//               </Typography>
//               <TextField
//                 label="Max Exports"
//                 type="number"
//                 value={customQuotas.exportLimit.max}
//                 onChange={(e) => handleQuotaChange('exportLimit', 'max', parseInt(e.target.value))}
//                 fullWidth
//                 size="small"
//               />
//             </Grid>
//           </Grid>

//           <Alert severity="warning" sx={{ mt: 2 }}>
//             <Typography variant="body2">
//               Demo mode will limit the data shown to users. This is useful for 
//               demonstrations and trials where you want to show the platform's 
//               capabilities without overwhelming users with full functionality.
//             </Typography>
//           </Alert>
//         </DialogContent>
//         <DialogActions>
//           <Button onClick={() => setOpen(false)}>Cancel</Button>
//           <Button onClick={handleApplyQuotas} variant="contained">
//             Apply Configuration
//           </Button>
//         </DialogActions>
//       </Dialog>
//     </>
//   );
// }

// export default DemoQuotaConfig;
