/**
 * tRPC Integration Testing Script
 * 
 * This script tests the tRPC implementation by directly calling procedures
 * from the server side. It's useful for testing authentication, authorization,
 * and basic functionality without a browser.
 * 
 * Run with: npx tsx src/scripts/test-trpc-integration.ts
 */

import { appRouter } from '../server/trpc/root';
import { createContext } from '../server/trpc/context';

interface TestResult {
  name: string;
  status: 'pass' | 'fail' | 'skip';
  duration: number;
  error?: string;
  data?: any;
}

const testResults: TestResult[] = [];

/**
 * Helper to run a test and track results
 */
async function runTest(
  name: string,
  testFn: () => Promise<void>,
  skip: boolean = false
): Promise<void> {
  if (skip) {
    testResults.push({ name, status: 'skip', duration: 0 });
    console.log(`⏭️  SKIP: ${name}`);
    return;
  }

  const startTime = Date.now();
  try {
    await testFn();
    const duration = Date.now() - startTime;
    testResults.push({ name, status: 'pass', duration });
    console.log(`✅ PASS: ${name} (${duration}ms)`);
  } catch (error: any) {
    const duration = Date.now() - startTime;
    testResults.push({ 
      name, 
      status: 'fail', 
      duration, 
      error: error.message || String(error) 
    });
    console.error(`❌ FAIL: ${name} (${duration}ms)`);
    console.error(`   Error: ${error.message || String(error)}`);
  }
}

/**
 * Test Health Router
 */
async function testHealthRouter() {
  console.log('\n📋 Testing Health Router...\n');

  await runTest('health.check - should return OK status', async () => {
    const ctx = await createContext();
    const caller = appRouter.createCaller(ctx);
    
    const result = await caller.health.check();
    
    if (!result.status || result.status !== 'ok') {
      throw new Error(`Expected status 'ok', got '${result.status}'`);
    }
  });
}

/**
 * Test Teams Router (requires authenticated context)
 */
async function testTeamsRouter() {
  console.log('\n📋 Testing Teams Router...\n');

  // Test without authentication - should fail
  await runTest('teams.list - should fail without auth', async () => {
    const ctx = await createContext(); // No session
    const caller = appRouter.createCaller(ctx);
    
    try {
      await caller.teams.list();
      throw new Error('Expected UNAUTHORIZED error, but request succeeded');
    } catch (error: any) {
      if (!error.message?.includes('UNAUTHORIZED') && error.code !== 'UNAUTHORIZED') {
        throw error;
      }
      // Expected to fail, test passes
    }
  });

  // Note: Testing with authentication requires mocking the session
  // Skip these tests for now
  await runTest('teams.list - with auth', async () => {
    throw new Error('Requires authenticated session - mock not implemented');
  }, true); // Skip
}

/**
 * Test Reviews Router
 */
async function testReviewsRouter() {
  console.log('\n📋 Testing Reviews Router...\n');

  await runTest('reviews.getGoogleReviews - should fail without auth', async () => {
    const ctx = await createContext();
    const caller = appRouter.createCaller(ctx);
    
    try {
      await caller.reviews.getGoogleReviews({ 
        slug: 'test-team',
        filters: {} 
      });
      throw new Error('Expected UNAUTHORIZED error, but request succeeded');
    } catch (error: any) {
      if (!error.message?.includes('UNAUTHORIZED') && error.code !== 'UNAUTHORIZED') {
        throw error;
      }
      // Expected to fail, test passes
    }
  });
}

/**
 * Test Platforms Router
 */
async function testPlatformsRouter() {
  console.log('\n📋 Testing Platforms Router...\n');

  await runTest('platforms.googleProfile - should fail without auth', async () => {
    const ctx = await createContext();
    const caller = appRouter.createCaller(ctx);
    
    try {
      await caller.platforms.googleProfile({ slug: 'test-team' });
      throw new Error('Expected UNAUTHORIZED error, but request succeeded');
    } catch (error: any) {
      if (!error.message?.includes('UNAUTHORIZED') && error.code !== 'UNAUTHORIZED') {
        throw error;
      }
      // Expected to fail, test passes
    }
  });
}

/**
 * Test Billing Router
 */
async function testBillingRouter() {
  console.log('\n📋 Testing Billing Router...\n');

  await runTest('billing.getSubscriptionInfo - should fail without auth', async () => {
    const ctx = await createContext();
    const caller = appRouter.createCaller(ctx);
    
    try {
      await caller.billing.getSubscriptionInfo({ slug: 'test-team' });
      throw new Error('Expected UNAUTHORIZED error, but request succeeded');
    } catch (error: any) {
      if (!error.message?.includes('UNAUTHORIZED') && error.code !== 'UNAUTHORIZED') {
        throw error;
      }
      // Expected to fail, test passes
    }
  });
}

/**
 * Test Input Validation (Zod Schemas)
 */
async function testInputValidation() {
  console.log('\n📋 Testing Input Validation...\n');

  await runTest('teams.create - should reject empty name', async () => {
    const ctx = await createContext();
    const caller = appRouter.createCaller(ctx);
    
    try {
      // @ts-expect-error - Testing invalid input
      await caller.teams.create({ name: '' });
      throw new Error('Expected validation error, but request succeeded');
    } catch (error: any) {
      if (!error.message?.includes('too_small') && !error.message?.includes('required')) {
        throw error;
      }
      // Expected to fail validation, test passes
    }
  });

  await runTest('teams.get - should reject invalid slug', async () => {
    const ctx = await createContext();
    const caller = appRouter.createCaller(ctx);
    
    try {
      // @ts-expect-error - Testing invalid input
      await caller.teams.get({ slug: '' });
      throw new Error('Expected validation error, but request succeeded');
    } catch (error: any) {
      if (!error.message?.includes('too_small') && !error.message?.includes('required')) {
        throw error;
      }
      // Expected to fail validation, test passes
    }
  });
}

/**
 * Print test summary
 */
function printSummary() {
  console.log('\n' + '='.repeat(60));
  console.log('📊 Test Summary');
  console.log('='.repeat(60));

  const passed = testResults.filter(r => r.status === 'pass').length;
  const failed = testResults.filter(r => r.status === 'fail').length;
  const skipped = testResults.filter(r => r.status === 'skip').length;
  const total = testResults.length;

  console.log(`\nTotal Tests: ${total}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`⏭️  Skipped: ${skipped}`);

  if (failed > 0) {
    console.log('\n❌ Failed Tests:');
    testResults
      .filter(r => r.status === 'fail')
      .forEach(r => {
        console.log(`   - ${r.name}`);
        console.log(`     ${r.error}`);
      });
  }

  const totalDuration = testResults.reduce((sum, r) => sum + r.duration, 0);
  console.log(`\n⏱️  Total Duration: ${totalDuration}ms`);
  console.log('='.repeat(60) + '\n');

  // Exit with error code if any tests failed
  if (failed > 0) {
    process.exit(1);
  }
}

/**
 * Main test runner
 */
async function main() {
  console.log('🚀 Starting tRPC Integration Tests...\n');
  console.log('=' .repeat(60));

  try {
    // Run all test suites
    await testHealthRouter();
    await testTeamsRouter();
    await testReviewsRouter();
    await testPlatformsRouter();
    await testBillingRouter();
    await testInputValidation();

    // Print summary
    printSummary();
  } catch (error) {
    console.error('\n💥 Test runner crashed:', error);
    process.exit(1);
  }
}

// Run tests
main().catch(console.error);

