#!/usr/bin/env node

/**
 * Environment Variable Checker
 * 
 * This script checks that all required environment variables are set
 * for production deployment. Run this before deploying to catch any
 * missing configuration early.
 */

const requiredEnvVars = [
  'DATABASE_URL',
  'APP_URL',
  'NEXTAUTH_SECRET',
  'NEXTAUTH_URL',
];

const optionalEnvVars = [
  'BACKEND_URL',
  'SMTP_HOST',
  'SMTP_PORT', 
  'SMTP_USER',
  'SMTP_PASSWORD',
  'SMTP_FROM',
  'SVIX_URL',
  'SVIX_API_KEY',
  'GITHUB_CLIENT_ID',
  'GITHUB_CLIENT_SECRET',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'NEXT_PUBLIC_GOOGLE_MAPS_API_KEY',
];

console.log('🔍 Checking environment variables...\n');

let missingRequired = [];
let missingOptional = [];

// Check required variables
requiredEnvVars.forEach(varName => {
  if (!process.env[varName]) {
    missingRequired.push(varName);
  } else {
    console.log(`✅ ${varName}: Set`);
  }
});

// Check optional variables
optionalEnvVars.forEach(varName => {
  if (!process.env[varName]) {
    missingOptional.push(varName);
  } else {
    console.log(`✅ ${varName}: Set`);
  }
});

console.log('\n📋 Summary:');

if (missingRequired.length > 0) {
  console.log(`\n❌ Missing required environment variables:`);
  missingRequired.forEach(varName => {
    console.log(`   - ${varName}`);
  });
}

if (missingOptional.length > 0) {
  console.log(`\n⚠️  Missing optional environment variables:`);
  missingOptional.forEach(varName => {
    console.log(`   - ${varName}`);
  });
  console.log(`\n   Optional variables may limit functionality but won't prevent the app from starting.`);
}

if (missingRequired.length === 0) {
  console.log(`\n✅ All required environment variables are set!`);
  
  // Validate APP_URL format
  const appUrl = process.env.APP_URL;
  if (appUrl && !appUrl.startsWith('http')) {
    console.log(`\n⚠️  APP_URL should start with http:// or https://`);
    console.log(`   Current value: ${appUrl}`);
  }
  
  if (missingOptional.length === 0) {
    console.log(`✅ All optional environment variables are also set!`);
  }
} else {
  console.log(`\n❌ Cannot start the application with missing required variables.`);
  process.exit(1);
} 