/**
 * Feature Flags Health Check Endpoint
 * 
 * Provides health metrics and status for the Stripe Features system.
 * Admin-only endpoint.
 */

// import { getMonitor } from '@wirecrest/feature-flags';
// import { NextRequest, NextResponse } from 'next/server';

// /**
//  * GET /api/admin/feature-flags/health
//  * 
//  * Get health status and metrics for the feature flags system
//  */
// export async function GET(request: NextRequest) {
//   try {
//     const monitor = getMonitor();
//     const report = monitor.getSummaryReport();

//     return NextResponse.json({
//       success: true,
//       timestamp: new Date().toISOString(),
//       system: 'stripe-features',
//       ...report,
//     });
//   } catch (error) {
//     console.error('Error getting feature flags health:', error);
//     return NextResponse.json({
//       success: false,
//       error: 'Failed to get health status',
//       healthy: false,
//     }, { status: 500 });
//   }
// }

// /**
//  * DELETE /api/admin/feature-flags/health
//  * 
//  * Reset metrics (admin only)
//  */
// export async function DELETE(request: NextRequest) {
//   try {
//     const monitor = getMonitor();
//     monitor.resetMetrics();
//     monitor.clearEvents();

//     return NextResponse.json({
//       success: true,
//       message: 'Metrics reset successfully',
//     });
//   } catch (error) {
//     console.error('Error resetting metrics:', error);
//     return NextResponse.json({
//       success: false,
//       error: 'Failed to reset metrics',
//     }, { status: 500 });
//   }
// }

