#!/usr/bin/env tsx
/**
 * Initialize Stripe Products Script
 * Run this script to create subscription products in Stripe and sync them to the database
 * 
 * Usage: npx tsx packages/billing/scripts/initialize-products.ts
 */

import { ProductService } from '../src/product-service';

async function main() {
  console.log('🚀 Starting Stripe products initialization...');
  
  try {
    const productService = new ProductService();
    await productService.initialize();
    
    console.log('\n✅ Initialization complete!');
    console.log('\nNext steps:');
    console.log('1. Check your Stripe Dashboard to see the created products');
    console.log('2. Run the database migration: npx prisma db push');
    console.log('3. Test the products API: GET /api/billing/products');
    
  } catch (error) {
    console.error('\n❌ Initialization failed:', error);
    process.exit(1);
  }
}

// Run the script
main().catch(console.error);
