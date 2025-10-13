/**
 * Initialize Trial and Demo System
 * Creates default trial configurations and tests the system
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function initializeTrialSystem() {
  console.log('🚀 Initializing Trial and Demo System...');

  try {
    // Create default trial configurations
    const trialConfigs = [
      {
        name: 'Starter Trial',
        description: '14-day trial of our Starter plan with full features',
        durationDays: 14,
        tier: 'STARTER',
        features: [
          'google_reviews_access',
          'basic_analytics',
          'email_support',
          'api_access',
        ],
        limitations: {
          maxSeats: 2,
          maxLocations: 1,
          maxApiCalls: 1000,
          maxStorage: 5, // GB
        },
        requiresPaymentMethod: false,
        autoConvert: false,
        gracePeriodDays: 3,
        retentionOffers: [
          {
            type: 'discount',
            value: 20,
            description: '20% off your first 3 months',
          },
          {
            type: 'extended_trial',
            value: 7,
            description: '7 additional days to try our features',
          },
        ],
        active: true,
      },
      {
        name: 'Pro Trial',
        description: '7-day trial of our Pro plan with advanced features',
        durationDays: 7,
        tier: 'PRO',
        features: [
          'google_reviews_access',
          'advanced_analytics',
          'priority_support',
          'api_access',
          'custom_integrations',
          'white_label',
        ],
        limitations: {
          maxSeats: 5,
          maxLocations: 3,
          maxApiCalls: 10000,
          maxStorage: 50, // GB
        },
        requiresPaymentMethod: true,
        autoConvert: true,
        gracePeriodDays: 2,
        retentionOffers: [
          {
            type: 'discount',
            value: 30,
            description: '30% off your first 6 months',
          },
          {
            type: 'feature_upgrade',
            value: 0,
            description: 'Free upgrade to Enterprise features for 1 month',
          },
        ],
        active: true,
      },
      {
        name: 'Enterprise Demo',
        description: '30-day demo of our Enterprise solution',
        durationDays: 30,
        tier: 'ENTERPRISE',
        features: [
          'google_reviews_access',
          'advanced_analytics',
          'dedicated_support',
          'api_access',
          'custom_integrations',
          'white_label',
          'sso_integration',
          'advanced_reporting',
        ],
        limitations: {
          maxSeats: 25,
          maxLocations: 10,
          maxApiCalls: 100000,
          maxStorage: 500, // GB
        },
        requiresPaymentMethod: true,
        autoConvert: false,
        gracePeriodDays: 7,
        retentionOffers: [
          {
            type: 'discount',
            value: 25,
            description: '25% off your first year',
          },
          {
            type: 'extended_trial',
            value: 14,
            description: '14 additional days to evaluate',
          },
        ],
        active: true,
      },
    ];

    console.log('📋 Creating trial configurations...');
    for (const config of trialConfigs) {
      const existing = await prisma.trialConfig.findFirst({
        where: { name: config.name },
      });

      if (!existing) {
        await prisma.trialConfig.create({
          data: config,
        });
        console.log(`✅ Created trial config: ${config.name}`);
      } else {
        console.log(`⚠️ Trial config already exists: ${config.name}`);
      }
    }

    // Test trial system functionality
    console.log('🧪 Testing trial system...');

    // Get all trial configs
    const allConfigs = await prisma.trialConfig.findMany({
      where: { active: true },
    });

    console.log(`📊 Found ${allConfigs.length} active trial configurations:`);
    for (const config of allConfigs) {
      console.log(`  - ${config.name} (${config.tier}): ${config.durationDays} days`);
    }

    // Test analytics (if we have any demo accounts)
    const totalTrials = await prisma.demoAccount.count();
    const activeTrials = await prisma.demoAccount.count({
      where: { status: 'active' },
    });
    const convertedTrials = await prisma.demoAccount.count({
      where: { status: 'converted' },
    });

    console.log('📈 Trial Analytics:');
    console.log(`  - Total trials: ${totalTrials}`);
    console.log(`  - Active trials: ${activeTrials}`);
    console.log(`  - Converted trials: ${convertedTrials}`);

    if (totalTrials > 0) {
      const conversionRate = (convertedTrials / totalTrials) * 100;
      console.log(`  - Conversion rate: ${conversionRate.toFixed(1)}%`);
    }

    // Test usage tracking
    const totalUsageRecords = await prisma.usageRecord.count();
    const totalQuotas = await prisma.usageQuota.count();

    console.log('📊 Usage Tracking:');
    console.log(`  - Total usage records: ${totalUsageRecords}`);
    console.log(`  - Total quotas: ${totalQuotas}`);

    console.log('✅ Trial and Demo System initialized successfully!');
    console.log('');
    console.log('🎯 Next steps:');
    console.log('1. Run database migration: npx prisma db push');
    console.log('2. Generate Prisma client: npx prisma generate');
    console.log('3. Test trial creation with: startTrial() action');
    console.log('4. Monitor trial analytics with: getTrialAnalytics() action');

  } catch (error) {
    console.error('❌ Failed to initialize trial system:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the initialization
if (require.main === module) {
  initializeTrialSystem()
    .then(() => {
      console.log('🎉 Trial system initialization completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Trial system initialization failed:', error);
      process.exit(1);
    });
}

export { initializeTrialSystem };
