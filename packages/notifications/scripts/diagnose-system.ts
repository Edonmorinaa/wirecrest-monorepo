// #!/usr/bin/env tsx
// /**
//  * Notification System Diagnostic Script
//  * 
//  * Checks database schema, environment variables, and Supabase configuration
//  * to diagnose common notification system issues.
//  * 
//  * Usage: npx tsx scripts/diagnose-system.ts
//  */

// import { prisma } from '@wirecrest/db';
// import { createClient } from '@supabase/supabase-js';

// interface DiagnosticResult {
//   category: string;
//   status: 'pass' | 'fail' | 'warning';
//   message: string;
//   fix?: string;
// }

// const results: DiagnosticResult[] = [];

// /**
//  * Check database connection and Notification table
//  */
// async function checkDatabase() {
//   console.log('\n🔍 Checking Database Connection...\n');
  
//   try {
//     // Test connection
//     await prisma.$connect();
//     results.push({
//       category: 'Database',
//       status: 'pass',
//       message: 'Database connection successful',
//     });
    
//     // Check if Notification table exists and get column info
//     const tableInfo = await prisma.$queryRaw<any[]>`
//       SELECT column_name, data_type, is_nullable
//       FROM information_schema.columns
//       WHERE table_name = 'Notification'
//       ORDER BY ordinal_position;
//     `;
    
//     if (tableInfo.length === 0) {
//       results.push({
//         category: 'Database',
//         status: 'fail',
//         message: 'Notification table does not exist',
//         fix: 'Run: npx prisma db push',
//       });
//       return;
//     }
    
//     results.push({
//       category: 'Database',
//       status: 'pass',
//       message: `Notification table found with ${tableInfo.length} columns`,
//     });
    
//     // Verify critical columns exist
//     const columnNames = tableInfo.map(col => col.column_name);
//     const requiredColumns = ['id', 'userId', 'teamId', 'superRole', 'title', 'category', 'createdAt'];
//     const missingColumns = requiredColumns.filter(col => !columnNames.includes(col));
    
//     if (missingColumns.length > 0) {
//       results.push({
//         category: 'Database',
//         status: 'fail',
//         message: `Missing columns: ${missingColumns.join(', ')}`,
//         fix: 'Run: npx prisma db push',
//       });
//     } else {
//       results.push({
//         category: 'Database',
//         status: 'pass',
//         message: 'All required columns exist with correct names (camelCase)',
//       });
//     }
    
//     // Check for notifications
//     const notificationCount = await prisma.notification.count();
//     results.push({
//       category: 'Database',
//       status: notificationCount > 0 ? 'pass' : 'warning',
//       message: `Found ${notificationCount} notifications in database`,
//     });
    
//   } catch (error: any) {
//     results.push({
//       category: 'Database',
//       status: 'fail',
//       message: `Database error: ${error.message}`,
//       fix: 'Check DATABASE_URL in .env',
//     });
//   }
// }

// /**
//  * Check environment variables
//  */
// function checkEnvironmentVariables() {
//   console.log('\n🔍 Checking Environment Variables...\n');
  
//   // Check VAPID keys (for push notifications)
//   const vapidPublic = process.env.VAPID_PUBLIC_KEY;
//   const vapidPrivate = process.env.VAPID_PRIVATE_KEY;
//   const vapidSubject = process.env.VAPID_SUBJECT;
  
//   if (!vapidPublic || !vapidPrivate) {
//     results.push({
//       category: 'Environment',
//       status: 'fail',
//       message: 'VAPID keys not configured',
//       fix: 'Run: npx web-push generate-vapid-keys\nThen add VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY to .env',
//     });
//   } else {
//     results.push({
//       category: 'Environment',
//       status: 'pass',
//       message: 'VAPID keys configured',
//     });
//   }
  
//   if (!vapidSubject) {
//     results.push({
//       category: 'Environment',
//       status: 'warning',
//       message: 'VAPID_SUBJECT not set',
//       fix: 'Add VAPID_SUBJECT=mailto:support@yourdomain.com to .env',
//     });
//   }
  
//   // Check Supabase credentials
//   const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
//   const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
//   if (!supabaseUrl || !supabaseKey) {
//     results.push({
//       category: 'Environment',
//       status: 'fail',
//       message: 'Supabase credentials not configured',
//       fix: 'Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env',
//     });
//   } else {
//     results.push({
//       category: 'Environment',
//       status: 'pass',
//       message: 'Supabase credentials configured',
//     });
//   }
  
//   // Check database URL
//   const databaseUrl = process.env.DATABASE_URL;
//   if (!databaseUrl) {
//     results.push({
//       category: 'Environment',
//       status: 'fail',
//       message: 'DATABASE_URL not configured',
//       fix: 'Add DATABASE_URL to .env',
//     });
//   } else {
//     results.push({
//       category: 'Environment',
//       status: 'pass',
//       message: 'DATABASE_URL configured',
//     });
//   }
// }

// /**
//  * Check Supabase Realtime configuration
//  */
// async function checkSupabaseRealtime() {
//   console.log('\n🔍 Checking Supabase Realtime Configuration...\n');
  
//   const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
//   const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
//   if (!supabaseUrl || !supabaseKey) {
//     results.push({
//       category: 'Supabase Realtime',
//       status: 'fail',
//       message: 'Cannot check - Supabase credentials missing',
//     });
//     return;
//   }
  
//   try {
//     const supabase = createClient(supabaseUrl, supabaseKey);
    
//     // Try to subscribe to a test channel
//     const channel = supabase.channel('diagnostic-test');
    
//     await new Promise((resolve, reject) => {
//       const timeout = setTimeout(() => {
//         reject(new Error('Connection timeout'));
//       }, 5000);
      
//       channel
//         .on('postgres_changes', {
//           event: 'INSERT',
//           schema: 'public',
//           table: 'Notification',
//         }, () => {})
//         .subscribe((status, err) => {
//           clearTimeout(timeout);
          
//           if (status === 'SUBSCRIBED') {
//             results.push({
//               category: 'Supabase Realtime',
//               status: 'pass',
//               message: 'Successfully subscribed to Notification table',
//             });
//             resolve(true);
//           } else if (status === 'CHANNEL_ERROR') {
//             results.push({
//               category: 'Supabase Realtime',
//               status: 'fail',
//               message: 'Realtime subscription failed - table replication likely not enabled',
//               fix: `Enable Realtime for Notification table:
// 1. Go to: https://supabase.com/dashboard/project/_/database/replication
// 2. Find the "Notification" table
// 3. Enable replication for INSERT, UPDATE, DELETE events
// 4. Wait 30 seconds for changes to propagate`,
//             });
//             reject(err);
//           } else if (status === 'TIMED_OUT') {
//             results.push({
//               category: 'Supabase Realtime',
//               status: 'fail',
//               message: 'Realtime connection timed out',
//               fix: 'Check Supabase project status and network connection',
//             });
//             reject(new Error('Timeout'));
//           }
//         });
//     });
    
//     // Cleanup
//     await supabase.removeChannel(channel);
    
//   } catch (error: any) {
//     if (!results.some(r => r.category === 'Supabase Realtime')) {
//       results.push({
//         category: 'Supabase Realtime',
//         status: 'fail',
//         message: `Connection error: ${error.message}`,
//         fix: 'Check Supabase URL and credentials',
//       });
//     }
//   }
// }

// /**
//  * Check push subscription table
//  */
// async function checkPushSubscriptions() {
//   console.log('\n🔍 Checking Push Subscriptions...\n');
  
//   try {
//     const subscriptionCount = await prisma.pushSubscription.count();
    
//     if (subscriptionCount === 0) {
//       results.push({
//         category: 'Push Notifications',
//         status: 'warning',
//         message: 'No push subscriptions found',
//         fix: 'Users need to enable push notifications in the dashboard',
//       });
//     } else {
//       const activeCount = await prisma.pushSubscription.count({
//         where: { isActive: true },
//       });
      
//       results.push({
//         category: 'Push Notifications',
//         status: 'pass',
//         message: `Found ${activeCount} active push subscriptions (${subscriptionCount} total)`,
//       });
//     }
//   } catch (error: any) {
//     results.push({
//       category: 'Push Notifications',
//       status: 'fail',
//       message: `Error checking push subscriptions: ${error.message}`,
//       fix: 'Check if PushSubscription table exists',
//     });
//   }
// }

// /**
//  * Print results
//  */
// function printResults() {
//   console.log('\n' + '='.repeat(80));
//   console.log('📊 DIAGNOSTIC RESULTS');
//   console.log('='.repeat(80) + '\n');
  
//   const categories = [...new Set(results.map(r => r.category))];
  
//   for (const category of categories) {
//     const categoryResults = results.filter(r => r.category === category);
//     console.log(`\n${category}:`);
//     console.log('-'.repeat(80));
    
//     for (const result of categoryResults) {
//       const icon = result.status === 'pass' ? '✅' : result.status === 'warning' ? '⚠️' : '❌';
//       console.log(`${icon} ${result.message}`);
      
//       if (result.fix) {
//         console.log(`   💡 Fix: ${result.fix.split('\n').join('\n   ')}`);
//       }
//     }
//   }
  
//   // Summary
//   const passCount = results.filter(r => r.status === 'pass').length;
//   const warningCount = results.filter(r => r.status === 'warning').length;
//   const failCount = results.filter(r => r.status === 'fail').length;
  
//   console.log('\n' + '='.repeat(80));
//   console.log('SUMMARY');
//   console.log('='.repeat(80));
//   console.log(`✅ Passed: ${passCount}`);
//   console.log(`⚠️  Warnings: ${warningCount}`);
//   console.log(`❌ Failed: ${failCount}`);
  
//   if (failCount === 0 && warningCount === 0) {
//     console.log('\n🎉 All checks passed! Your notification system is configured correctly.\n');
//   } else if (failCount === 0) {
//     console.log('\n✅ System is functional but has some warnings. Check above for improvements.\n');
//   } else {
//     console.log('\n❌ System has critical issues. Please fix the failed checks above.\n');
//   }
// }

// /**
//  * Main function
//  */
// async function main() {
//   console.log('🔧 Notification System Diagnostics');
//   console.log('='.repeat(80));
  
//   try {
//     await checkDatabase();
//     checkEnvironmentVariables();
//     await checkSupabaseRealtime();
//     await checkPushSubscriptions();
    
//     printResults();
    
//   } catch (error: any) {
//     console.error('\n❌ Diagnostic script failed:', error.message);
//     process.exit(1);
//   } finally {
//     await prisma.$disconnect();
//   }
// }

// // Run diagnostics
// main();

