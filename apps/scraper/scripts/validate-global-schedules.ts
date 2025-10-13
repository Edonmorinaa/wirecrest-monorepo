/**
 * Validation Script: Global Schedules
 * 
 * Validates that the global schedule system is working correctly:
 * - All businesses are mapped to schedules
 * - No orphaned mappings
 * - Schedule business counts match actual mappings
 * - Data isolation is maintained
 */

import 'dotenv/config';
import { prisma } from '@wirecrest/db';

interface ValidationResult {
  passed: boolean;
  message: string;
  details?: any;
}

async function validate(): Promise<void> {
  console.log('🔍 Validating global schedules system...\n');

  const results: ValidationResult[] = [];

  // Test 1: All active businesses have schedule mappings
  console.log('Test 1: Checking business profile coverage...');
  const googleProfiles = await prisma.googleBusinessProfile.findMany({
    where: { placeId: { not: null } },
  });
  const googleMappings = await prisma.businessScheduleMapping.count({
    where: { platform: 'google_reviews' },
  });
  
  const coverageTest: ValidationResult = {
    passed: googleProfiles.length === googleMappings,
    message: `Google profiles: ${googleProfiles.length}, Mappings: ${googleMappings}`,
    details: {
      googleProfiles: googleProfiles.length,
      googleMappings,
      difference: Math.abs(googleProfiles.length - googleMappings),
    },
  };
  results.push(coverageTest);
  console.log(coverageTest.passed ? '✓' : '✗', coverageTest.message);

  // Test 2: No orphaned mappings
  console.log('\nTest 2: Checking for orphaned mappings...');
  const orphanedMappings = await prisma.businessScheduleMapping.findMany({
    where: {
      schedule: null,
    },
  });
  
  const orphanTest: ValidationResult = {
    passed: orphanedMappings.length === 0,
    message: `Orphaned mappings: ${orphanedMappings.length}`,
    details: { orphanedMappings: orphanedMappings.length },
  };
  results.push(orphanTest);
  console.log(orphanTest.passed ? '✓' : '✗', orphanTest.message);

  // Test 3: Schedule business counts match actual mappings
  console.log('\nTest 3: Validating schedule business counts...');
  const schedules = await prisma.apifyGlobalSchedule.findMany({
    include: {
      _count: {
        select: { businessMappings: true },
      },
    },
  });

  let countMismatches = 0;
  for (const schedule of schedules) {
    const actualCount = await prisma.businessScheduleMapping.count({
      where: {
        scheduleId: schedule.id,
        isActive: true,
      },
    });

    if (schedule.businessCount !== actualCount) {
      countMismatches++;
      console.log(`  ✗ Schedule ${schedule.id}: stored=${schedule.businessCount}, actual=${actualCount}`);
    }
  }

  const countTest: ValidationResult = {
    passed: countMismatches === 0,
    message: `Count mismatches: ${countMismatches} / ${schedules.length}`,
    details: { mismatches: countMismatches, total: schedules.length },
  };
  results.push(countTest);
  console.log(countTest.passed ? '✓' : '✗', countTest.message);

  // Test 4: Data isolation - no duplicate business mappings
  console.log('\nTest 4: Checking data isolation (no duplicate mappings)...');
  const duplicates = await prisma.$queryRaw<Array<{ businessProfileId: string; platform: string; count: number }>>`
    SELECT "businessProfileId", platform, COUNT(*) as count
    FROM "BusinessScheduleMapping"
    GROUP BY "businessProfileId", platform
    HAVING COUNT(*) > 1
  `;

  const isolationTest: ValidationResult = {
    passed: duplicates.length === 0,
    message: `Duplicate mappings: ${duplicates.length}`,
    details: { duplicates },
  };
  results.push(isolationTest);
  console.log(isolationTest.passed ? '✓' : '✗', isolationTest.message);

  // Test 5: All active schedules have at least one business
  console.log('\nTest 5: Checking active schedules have businesses...');
  const emptyActiveSchedules = await prisma.apifyGlobalSchedule.findMany({
    where: {
      isActive: true,
      businessCount: 0,
    },
  });

  const activeScheduleTest: ValidationResult = {
    passed: emptyActiveSchedules.length === 0,
    message: `Empty active schedules: ${emptyActiveSchedules.length}`,
    details: { emptyActiveSchedules: emptyActiveSchedules.length },
  };
  results.push(activeScheduleTest);
  console.log(activeScheduleTest.passed ? '✓' : '✗', activeScheduleTest.message);

  // Test 6: All businesses have valid identifiers
  console.log('\nTest 6: Validating business identifiers...');
  const invalidIdentifiers = await prisma.businessScheduleMapping.findMany({
    where: {
      AND: [
        { placeId: null },
        { facebookUrl: null },
        { tripAdvisorUrl: null },
        { bookingUrl: null },
      ],
    },
  });

  const identifierTest: ValidationResult = {
    passed: invalidIdentifiers.length === 0,
    message: `Mappings without identifiers: ${invalidIdentifiers.length}`,
    details: { invalidIdentifiers: invalidIdentifiers.length },
  };
  results.push(identifierTest);
  console.log(identifierTest.passed ? '✓' : '✗', identifierTest.message);

  // Test 7: Schedule intervals are valid
  console.log('\nTest 7: Validating schedule intervals...');
  const validIntervals = [1, 3, 6, 8, 12, 18, 24, 48, 72, 168];
  const invalidIntervalSchedules = schedules.filter(
    s => !validIntervals.includes(s.intervalHours)
  );

  const intervalTest: ValidationResult = {
    passed: invalidIntervalSchedules.length === 0,
    message: `Invalid intervals: ${invalidIntervalSchedules.length}`,
    details: {
      invalidIntervals: invalidIntervalSchedules.map(s => ({
        id: s.id,
        interval: s.intervalHours,
      })),
    },
  };
  results.push(intervalTest);
  console.log(intervalTest.passed ? '✓' : '✗', intervalTest.message);

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 Validation Summary');
  console.log('='.repeat(50));

  const passedTests = results.filter(r => r.passed).length;
  const totalTests = results.length;

  console.log(`\nTests Passed: ${passedTests} / ${totalTests}`);
  console.log(`Tests Failed: ${totalTests - passedTests} / ${totalTests}`);

  if (passedTests === totalTests) {
    console.log('\n✅ All validation tests passed!');
    console.log('The global schedule system is working correctly.\n');
  } else {
    console.log('\n❌ Some validation tests failed!');
    console.log('Please review the failures above and fix before proceeding.\n');

    console.log('Failed Tests:');
    results.filter(r => !r.passed).forEach(r => {
      console.log(`  - ${r.message}`);
      if (r.details) {
        console.log(`    Details: ${JSON.stringify(r.details, null, 2)}`);
      }
    });
  }

  // Statistics
  console.log('\n📈 System Statistics:');
  console.log('─'.repeat(50));
  
  const totalSchedules = schedules.length;
  const activeSchedules = schedules.filter(s => s.isActive).length;
  const totalBusinesses = await prisma.businessScheduleMapping.count({
    where: { isActive: true },
  });

  console.log(`Total Schedules: ${totalSchedules}`);
  console.log(`Active Schedules: ${activeSchedules}`);
  console.log(`Total Businesses Mapped: ${totalBusinesses}`);

  // Per-platform breakdown
  const platforms = ['google_reviews', 'facebook', 'tripadvisor', 'booking'];
  console.log('\nPer-Platform Breakdown:');
  for (const platform of platforms) {
    const count = await prisma.businessScheduleMapping.count({
      where: { platform, isActive: true },
    });
    console.log(`  ${platform}: ${count} businesses`);
  }

  // Per-interval breakdown
  const intervals = [6, 12, 24, 72];
  console.log('\nPer-Interval Breakdown:');
  for (const interval of intervals) {
    const count = await prisma.businessScheduleMapping.count({
      where: { intervalHours: interval, isActive: true },
    });
    console.log(`  ${interval}h: ${count} businesses`);
  }

  console.log();
}

// Run validation
validate()
  .then(() => {
    console.log('✅ Validation complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Validation failed:', error);
    process.exit(1);
  });

