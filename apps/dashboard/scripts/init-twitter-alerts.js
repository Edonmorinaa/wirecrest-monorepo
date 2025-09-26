#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🐦 Twitter Alerts System Initialization (Apify Integration)');
console.log('========================================================\n');

// Check if required files exist
const requiredFiles = [
  'tweet-alert-system.js',
  'automation-flow.js'
];

console.log('Checking required files...');
let allFilesExist = true;

requiredFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`✅ ${file} - Found`);
  } else {
    console.log(`❌ ${file} - Missing`);
    allFilesExist = false;
  }
});

if (!allFilesExist) {
  console.log('\n❌ Some required files are missing. Please ensure all files are copied to the project root.');
  process.exit(1);
}

// Initialize the tweet alert system
console.log('\nInitializing tweet alert system with Apify integration...');
try {
  const tweetAlertSystem = require('./tweet-alert-system.js');
  tweetAlertSystem.initializeAlerts();
  console.log('✅ Tweet alert system initialized successfully');
} catch (error) {
  console.log(`❌ Failed to initialize: ${error.message}`);
  process.exit(1);
}

// Check automation-flow.js
console.log('\nChecking automation flow...');
try {
  const automationFlow = require('./automation-flow.js');
  console.log('✅ Automation flow loaded successfully');
} catch (error) {
  console.log(`❌ Error loading automation flow: ${error.message}`);
}

console.log('\n🎉 Twitter Alerts System Setup Complete!');
console.log('\nNext steps:');
console.log('1. Start your Next.js application');
console.log('2. Navigate to your team dashboard');
console.log('3. Look for the "Twitter Alerts" card');
console.log('4. Click on it to access the full interface');
console.log('5. Configure your Telegram chat ID');
console.log('6. Add keywords to monitor');
console.log('7. Start monitoring with Apify scraper!');
console.log('\nFor detailed instructions, see TWITTER_ALERTS_README.md');
