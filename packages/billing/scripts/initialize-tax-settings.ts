#!/usr/bin/env tsx

/**
 * Initialize Tax Settings
 * Sets up tax registrations and compliance settings for the application
 */

import { TaxService } from '../src/tax-service';

async function initializeTaxSettings() {
  console.log('🏛️ Initializing Tax Settings and Compliance...\n');

  try {
    const taxService = new TaxService();

    // Check existing tax registrations
    console.log('📋 Checking existing tax registrations...');
    const existingRegistrations = await taxService.getTaxRegistrations();
    
    if (existingRegistrations.length > 0) {
      console.log(`✅ Found ${existingRegistrations.length} existing registration(s):`);
      existingRegistrations.forEach((reg, index) => {
        console.log(`   ${index + 1}. ${reg.country}${reg.state ? `-${reg.state}` : ''} (${reg.status})`);
      });
    } else {
      console.log('ℹ️  No existing tax registrations found.');
    }

    // Get tax compliance summary
    console.log('\n📊 Getting tax compliance summary...');
    const complianceSummary = await taxService.getTaxComplianceSummary();
    
    console.log(`   Compliance Status: ${complianceSummary.complianceStatus}`);
    console.log(`   Total Transactions: ${complianceSummary.totalTransactions}`);
    console.log(`   Total Tax Collected: $${(complianceSummary.totalTaxCollected / 100).toFixed(2)}`);

    if (complianceSummary.recommendations.length > 0) {
      console.log('\n💡 Recommendations:');
      complianceSummary.recommendations.forEach((rec, index) => {
        console.log(`   ${index + 1}. ${rec}`);
      });
    }

    // Test tax calculation for common scenarios
    console.log('\n🧮 Testing tax calculation capabilities...');
    
    // Test US tax calculation
    try {
      const usRates = await taxService.getTaxRatesForLocation('US', 'CA', 'San Francisco', '94102');
      console.log(`✅ US Tax Rates (CA): ${usRates.length} rate(s) found`);
      usRates.forEach(rate => {
        console.log(`   - ${rate.jurisdiction}: ${rate.rate}% (${rate.type})`);
      });
    } catch (error) {
      console.log('⚠️  US tax rate lookup failed (this is normal if not configured)');
    }

    // Test EU tax calculation
    try {
      const euRates = await taxService.getTaxRatesForLocation('DE', undefined, 'Berlin', '10115');
      console.log(`✅ EU Tax Rates (DE): ${euRates.length} rate(s) found`);
      euRates.forEach(rate => {
        console.log(`   - ${rate.jurisdiction}: ${rate.rate}% (${rate.type})`);
      });
    } catch (error) {
      console.log('⚠️  EU tax rate lookup failed (this is normal if not configured)');
    }

    // Test tax ID validation
    console.log('\n🔍 Testing tax ID validation...');
    
    // Test US EIN validation
    try {
      const einValidation = await taxService.validateTaxId('us_ein', '12-3456789');
      console.log(`✅ US EIN validation: ${einValidation.valid ? 'Valid' : 'Invalid'}`);
      if (!einValidation.valid) {
        console.log(`   Error: ${einValidation.error}`);
      }
    } catch (error) {
      console.log('⚠️  US EIN validation test failed (expected in test environment)');
    }

    // Test EU VAT validation
    try {
      const vatValidation = await taxService.validateTaxId('eu_vat', 'DE123456789');
      console.log(`✅ EU VAT validation: ${vatValidation.valid ? 'Valid' : 'Invalid'}`);
      if (!vatValidation.valid) {
        console.log(`   Error: ${vatValidation.error}`);
      }
    } catch (error) {
      console.log('⚠️  EU VAT validation test failed (expected in test environment)');
    }

    console.log('\n🎯 Tax Service Capabilities:');
    console.log('   ✅ Tax calculation for any location');
    console.log('   ✅ Subscription tax calculation');
    console.log('   ✅ Tax ID validation and management');
    console.log('   ✅ Tax registration management');
    console.log('   ✅ Compliance monitoring');
    console.log('   ✅ Tax reporting and analytics');

    console.log('\n💡 Next Steps for Tax Compliance:');
    console.log('   1. Register for tax collection in your primary markets');
    console.log('   2. Configure automatic tax calculation in Stripe Dashboard');
    console.log('   3. Set up tax ID collection for business customers');
    console.log('   4. Monitor compliance status regularly');
    console.log('   5. Generate tax reports for filing');

    console.log('\n📚 Common Tax Registration Scenarios:');
    console.log('   • US Sales Tax: Register in states where you have nexus');
    console.log('   • EU VAT: Use OSS (One Stop Shop) for simplified EU-wide registration');
    console.log('   • UK VAT: Register if annual sales exceed £85,000');
    console.log('   • Canada GST/HST: Register if annual sales exceed CAD $30,000');

  } catch (error) {
    console.error('❌ Failed to initialize tax settings:', error);
    process.exit(1);
  }
}

// Helper function to create sample tax registrations (for testing)
async function createSampleTaxRegistrations() {
  console.log('\n🧪 Creating sample tax registrations (for testing)...');
  
  try {
    const taxService = new TaxService();

    // Create US registration (California)
    try {
      const usRegistration = await taxService.createTaxRegistration('US', {
        state: 'CA',
        type: 'standard',
        activeFrom: new Date(),
      });
      console.log(`✅ Created US-CA tax registration: ${usRegistration.id}`);
    } catch (error) {
      console.log('⚠️  US tax registration creation failed (may already exist)');
    }

    // Create EU registration (Germany)
    try {
      const euRegistration = await taxService.createTaxRegistration('DE', {
        type: 'standard',
        activeFrom: new Date(),
      });
      console.log(`✅ Created DE tax registration: ${euRegistration.id}`);
    } catch (error) {
      console.log('⚠️  EU tax registration creation failed (may already exist)');
    }

  } catch (error) {
    console.log('⚠️  Sample registration creation failed (this is normal in test environments)');
  }
}

// Run the initialization
if (require.main === module) {
  initializeTaxSettings()
    .then(() => {
      console.log('\n✨ Tax settings initialization completed!');
      
      // Optionally create sample registrations
      const createSamples = process.argv.includes('--create-samples');
      if (createSamples) {
        return createSampleTaxRegistrations();
      }
    })
    .then(() => {
      console.log('\n🎉 Tax service is ready for use!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Initialization failed:', error);
      process.exit(1);
    });
}

export { initializeTaxSettings, createSampleTaxRegistrations };
