// /**
//  * Super Admin Stripe Features Management Page
//  * 
//  * View and manage Stripe Features that are attached to products.
//  * Features are now managed directly in Stripe, not in the application.
//  */

// 'use client';

// import { SuperRole } from '@prisma/client';
// import React, { useState, useEffect } from 'react';
// import { RoleGuard } from '@/components/guards/RoleGuard';
// import {
//   PlanTier,
//   PlanFeatures,
//   StripeFeatureLookupKeys,
// } from '@wirecrest/billing';

// import { 
//   Box,
//   Card,
//   Chip,
//   Alert,
//   Table,
//   Paper,
//   Button,
//   TableRow,
//   TableBody,
//   TableCell,
//   TableHead,
//   Typography,
//   CardContent,
//   TableContainer,
//   CircularProgress,
// } from '@mui/material';

// interface StripeFeature {
//   lookupKey: string;
//   name: string;
//   plans: PlanTier[];
// }

// export default function StripeFeaturePage() {
//   const [features, setFeatures] = useState<StripeFeature[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState<string | null>(null);

//   useEffect(() => {
//     loadFeatures();
//   }, []);

//   const loadFeatures = () => {
//     try {
//       // Build feature list from our configuration
//       const featureList: StripeFeature[] = Object.entries(StripeFeatureLookupKeys).map(
//         ([key, lookupKey]) => {
//           // Find which plans include this feature
//           const plans: PlanTier[] = [];
          
//           (Object.keys(PlanFeatures) as PlanTier[]).forEach((tier) => {
//             const tierFeatures = PlanFeatures[tier];
//             // Check if this lookup key is in the tier's features
//             if (tierFeatures.some(f => f === lookupKey)) {
//               plans.push(tier);
//             }
//           });

//           return {
//             lookupKey,
//             name: key.replace(/_/g, ' '),
//             plans,
//           };
//         }
//       );

//       setFeatures(featureList);
//       setError(null);
//     } catch (err) {
//       console.error('Error loading features:', err);
//       setError('Failed to load features');
//     } finally {
//       setLoading(false);
//     }
//   };

//   const getPlanColor = (tier: PlanTier) => {
//     switch (tier) {
//       case 'STARTER':
//         return 'primary';
//       case 'PROFESSIONAL':
//         return 'secondary';
//       case 'ENTERPRISE':
//         return 'success';
//       default:
//         return 'default';
//     }
//   };

//   return (
//     <RoleGuard requireRole={SuperRole.ADMIN}>
//       <Box sx={{ p: 3 }}>
//         <Box sx={{ mb: 4 }}>
//           <Typography variant="h4" gutterBottom>
//             Stripe Features Management
//           </Typography>
//           <Typography variant="body1" color="text.secondary" gutterBottom>
//             View Stripe Features and their plan assignments. Features are managed in Stripe Dashboard.
//           </Typography>
//           <Alert severity="info" sx={{ mt: 2 }}>
//             <Typography variant="body2">
//               <strong>Note:</strong> Features are now managed directly in Stripe. To add or modify features:
//             </Typography>
//             <ol style={{ margin: '8px 0', paddingLeft: '20px' }}>
//               <li>Go to Stripe Dashboard → Products → Features</li>
//               <li>Create or update features with the lookup keys shown below</li>
//               <li>Attach features to your products</li>
//               <li>Update the plan configuration in <code>stripe-features.ts</code></li>
//             </ol>
//           </Alert>
//         </Box>

//         {loading ? (
//           <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
//             <CircularProgress />
//           </Box>
//         ) : error ? (
//           <Alert severity="error">{error}</Alert>
//         ) : (
//           <Card>
//             <CardContent>
//               <Typography variant="h6" gutterBottom>
//                 Feature Configuration ({features.length} features)
//               </Typography>
              
//               <TableContainer component={Paper} variant="outlined" sx={{ mt: 2 }}>
//                 <Table>
//                   <TableHead>
//                     <TableRow>
//                       <TableCell><strong>Feature Name</strong></TableCell>
//                       <TableCell><strong>Stripe Lookup Key</strong></TableCell>
//                       <TableCell><strong>Included in Plans</strong></TableCell>
//                     </TableRow>
//                   </TableHead>
//                   <TableBody>
//                     {features.map((feature) => (
//                       <TableRow key={feature.lookupKey}>
//                         <TableCell>
//                           <Typography variant="body2" fontWeight="medium">
//                             {feature.name}
//                           </Typography>
//                         </TableCell>
//                         <TableCell>
//                           <Typography
//                             variant="body2"
//                             sx={{
//                               fontFamily: 'monospace',
//                               bgcolor: 'grey.100',
//                               px: 1,
//                               py: 0.5,
//                               borderRadius: 1,
//                               display: 'inline-block',
//                             }}
//                           >
//                             {feature.lookupKey}
//                           </Typography>
//                         </TableCell>
//                         <TableCell>
//                           <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
//                             {feature.plans.length === 0 ? (
//                               <Chip label="None" size="small" />
//                             ) : (
//                               feature.plans.map((plan) => (
//                                 <Chip
//                                   key={plan}
//                                   label={plan}
//                                   size="small"
//                                   color={getPlanColor(plan)}
//                                 />
//                               ))
//                             )}
//                           </Box>
//                         </TableCell>
//                       </TableRow>
//                     ))}
//                   </TableBody>
//                 </Table>
//               </TableContainer>

//               <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
//                 <Button
//                   variant="outlined"
//                   href="https://dashboard.stripe.com/test/products/features"
//                   target="_blank"
//                   rel="noopener noreferrer"
//                 >
//                   Open Stripe Features Dashboard
//                 </Button>
//                 <Button
//                   variant="outlined"
//                   onClick={loadFeatures}
//                 >
//                   Refresh
//                 </Button>
//               </Box>
//             </CardContent>
//           </Card>
//         )}

//         <Card sx={{ mt: 3 }}>
//           <CardContent>
//             <Typography variant="h6" gutterBottom>
//               Plan Summary
//             </Typography>
//             <Box sx={{ mt: 2 }}>
//               {(Object.keys(PlanFeatures) as PlanTier[]).map((tier) => {
//                 const featureCount = PlanFeatures[tier].length;
//                 return (
//                   <Box key={tier} sx={{ mb: 2 }}>
//                     <Chip
//                       label={tier}
//                       color={getPlanColor(tier)}
//                       sx={{ mr: 1 }}
//                     />
//                     <Typography variant="body2" component="span" color="text.secondary">
//                       {featureCount} features included
//                     </Typography>
//                   </Box>
//                 );
//               })}
//             </Box>
//           </CardContent>
//         </Card>
//       </Box>
//     </RoleGuard>
//   );
// }
