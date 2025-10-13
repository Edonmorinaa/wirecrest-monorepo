#!/usr/bin/env ts-node
/**
 * Generate VAPID keys for Web Push notifications
 * 
 * Run this script once to generate VAPID keys, then add them to your .env file:
 * 
 * ```bash
 * npx ts-node scripts/generate-vapid-keys.ts
 * ```
 * 
 * Then add the output to your .env file:
 * 
 * ```
 * VAPID_PUBLIC_KEY=your_public_key
 * VAPID_PRIVATE_KEY=your_private_key
 * VAPID_SUBJECT=mailto:support@wirecrest.app
 * ```
 */

import webpush from 'web-push';

console.log('🔐 Generating VAPID keys for Web Push notifications...\n');

const vapidKeys = webpush.generateVAPIDKeys();

console.log('✅ VAPID keys generated successfully!\n');
console.log('Add these to your .env file:\n');
console.log('# Web Push Notifications (VAPID Keys)');
console.log(`VAPID_PUBLIC_KEY=${vapidKeys.publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${vapidKeys.privateKey}`);
console.log('VAPID_SUBJECT=mailto:support@wirecrest.app');
console.log('\n# APNs Configuration (iOS/macOS) - Optional');
console.log('APNS_KEY_ID=your_apns_key_id');
console.log('APNS_TEAM_ID=your_apns_team_id');
console.log('APNS_KEY_PATH=/path/to/AuthKey_XXXX.p8');
console.log('APNS_BUNDLE_ID=app.wirecrest.dashboard');
console.log('\n⚠️  IMPORTANT: Keep these keys secret! Never commit them to version control.');
console.log('✅  Add these to your .env file and restart your server.');

