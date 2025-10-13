#!/usr/bin/env tsx

/**
 * Initialize Customer Portal Configuration
 * Sets up the default Stripe Customer Portal configuration for the application
 */

import { CustomerPortalService } from '../src/customer-portal-service';

async function initializeCustomerPortal() {
  console.log('🏛️ Initializing Stripe Customer Portal Configuration...\n');

  try {
    const portalService = new CustomerPortalService();

    // Check if configurations already exist
    console.log('📋 Checking existing configurations...');
    const existingConfigs = await portalService.getPortalConfigurations();
    
    if (existingConfigs.length > 0) {
      console.log(`✅ Found ${existingConfigs.length} existing configuration(s):`);
      existingConfigs.forEach((config, index) => {
        console.log(`   ${index + 1}. ${config.id} (${config.active ? 'active' : 'inactive'})`);
      });
      console.log('\n⚠️  Customer Portal is already configured. Skipping initialization.');
      return;
    }

    // Initialize default configuration
    console.log('🚀 Creating default Customer Portal configuration...');
    const configuration = await portalService.initializeDefaultPortalConfiguration();

    console.log('✅ Customer Portal configuration created successfully!');
    console.log(`   Configuration ID: ${configuration.id}`);
    console.log(`   Active: ${configuration.active}`);
    console.log(`   Default: ${configuration.is_default}`);

    // Display configuration details
    console.log('\n📋 Configuration Details:');
    console.log('   Business Profile:');
    console.log(`     - Headline: ${configuration.business_profile.headline || 'Not set'}`);
    console.log(`     - Privacy Policy: ${configuration.business_profile.privacy_policy_url || 'Not set'}`);
    console.log(`     - Terms of Service: ${configuration.business_profile.terms_of_service_url || 'Not set'}`);

    console.log('\n   Features:');
    console.log(`     - Customer Updates: ${configuration.features.customer_update.enabled ? '✅' : '❌'}`);
    console.log(`     - Invoice History: ${configuration.features.invoice_history.enabled ? '✅' : '❌'}`);
    console.log(`     - Payment Method Updates: ${configuration.features.payment_method_update.enabled ? '✅' : '❌'}`);
    console.log(`     - Subscription Cancellation: ${configuration.features.subscription_cancel.enabled ? '✅' : '❌'}`);
    console.log(`     - Subscription Updates: ${configuration.features.subscription_update.enabled ? '✅' : '❌'}`);
    console.log(`     - Subscription Pause: ${configuration.features.subscription_pause?.enabled ? '✅' : '❌'}`);

    console.log('\n🎉 Customer Portal is now ready for use!');
    console.log('\n💡 Next steps:');
    console.log('   1. Test the portal by creating a session with createCustomerPortalSession()');
    console.log('   2. Customize the configuration if needed');
    console.log('   3. Set up environment variables for privacy policy and terms URLs');

  } catch (error) {
    console.error('❌ Failed to initialize Customer Portal:', error);
    process.exit(1);
  }
}

// Run the initialization
if (require.main === module) {
  initializeCustomerPortal()
    .then(() => {
      console.log('\n✨ Customer Portal initialization completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Initialization failed:', error);
      process.exit(1);
    });
}

export { initializeCustomerPortal };
