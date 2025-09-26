#!/usr/bin/env ts-node

import { insert6MonthsMockData } from './insert-6-months-mock-data';

console.log('🚀 Starting 6-month mock data insertion script...');
console.log('This will create mock business profiles and insert 180 days of snapshots for both Instagram and TikTok.');
console.log('');

insert6MonthsMockData()
  .then(() => {
    console.log('\n✅ Script completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  }); 