/**
 * Script to update all team pages with the new PageGate pattern
 * 
 * This script will update all pages under /teams/[slug] to use:
 * 1. Server components (remove 'use client')
 * 2. getTenantBySlug to fetch team by slug
 * 3. PageGate wrapper for access control
 * 4. Proper feature gating
 */

const fs = require('fs');
const path = require('path');

// Pages to update with their corresponding features
const pagesToUpdate = [
  // Facebook pages
  {
    path: 'src/app/dashboard/teams/[slug]/facebook/page.jsx',
    feature: null, // No specific feature - just subscription check
    description: 'Facebook main page'
  },
  {
    path: 'src/app/dashboard/teams/[slug]/facebook/overview/page.jsx',
    feature: 'Feature.Facebook.Overview',
    description: 'Facebook overview page'
  },
  {
    path: 'src/app/dashboard/teams/[slug]/facebook/reviews/page.jsx',
    feature: 'Feature.Facebook.Reviews',
    description: 'Facebook reviews page'
  },

  // TripAdvisor pages
  {
    path: 'src/app/dashboard/teams/[slug]/tripadvisor/page.jsx',
    feature: null,
    description: 'TripAdvisor main page'
  },
  {
    path: 'src/app/dashboard/teams/[slug]/tripadvisor/overview/page.jsx',
    feature: 'Feature.TripAdvisor.Overview',
    description: 'TripAdvisor overview page'
  },
  {
    path: 'src/app/dashboard/teams/[slug]/tripadvisor/reviews/page.jsx',
    feature: 'Feature.TripAdvisor.Reviews',
    description: 'TripAdvisor reviews page'
  },

  // Booking pages
  {
    path: 'src/app/dashboard/teams/[slug]/booking/page.jsx',
    feature: null,
    description: 'Booking main page'
  },
  {
    path: 'src/app/dashboard/teams/[slug]/booking/overview/page.jsx',
    feature: 'Feature.Booking.Overview',
    description: 'Booking overview page'
  },
  {
    path: 'src/app/dashboard/teams/[slug]/booking/reviews/page.jsx',
    feature: 'Feature.Booking.Reviews',
    description: 'Booking reviews page'
  },

  // Instagram pages
  {
    path: 'src/app/dashboard/teams/[slug]/instagram/page.jsx',
    feature: 'Feature.Instagram.Overview',
    description: 'Instagram main page'
  },

  // TikTok pages
  {
    path: 'src/app/dashboard/teams/[slug]/tiktok/page.jsx',
    feature: 'Feature.TikTok.Overview',
    description: 'TikTok main page'
  },

  // Other pages
  {
    path: 'src/app/dashboard/teams/[slug]/automation/page.jsx',
    feature: null,
    description: 'Automation page'
  },
  {
    path: 'src/app/dashboard/teams/[slug]/inbox/page.jsx',
    feature: null,
    description: 'Inbox page'
  }
];

// Template for pages with specific features
const pageWithFeatureTemplate = (feature, description) => `import { CONFIG } from 'src/global-config';
import { Feature } from '@wirecrest/feature-flags';
import { PageGate } from '@/components/gates/PageGate';
import { getTenantBySlug } from '@/actions/tenants';
import { notFound } from 'next/navigation';
import { YourViewComponent } from 'src/sections/...';

// ----------------------------------------------------------------------

export const metadata = { title: \`${description} | Dashboard - \${CONFIG.appName}\` };

export default async function Page({ params }: { params: { slug: string } }) {
  const { slug } = params;
  
  // Fetch tenant by slug
  const tenant = await getTenantBySlug(slug);
  
  // Handle case where tenant is not found
  if (!tenant) {
    notFound();
  }

  return (
    <PageGate feature={${feature}} teamId={tenant.id}>
      <YourViewComponent />
    </PageGate>
  );
}`;

// Template for pages without specific features (just subscription check)
const pageWithoutFeatureTemplate = (description) => `import { CONFIG } from 'src/global-config';
import { PageGate } from '@/components/gates/PageGate';
import { getTenantBySlug } from '@/actions/tenants';
import { notFound } from 'next/navigation';
import { YourViewComponent } from 'src/sections/...';

// ----------------------------------------------------------------------

export const metadata = { title: \`${description} | Dashboard - \${CONFIG.appName}\` };

export default async function Page({ params }: { params: { slug: string } }) {
  const { slug } = params;
  
  // Fetch tenant by slug
  const tenant = await getTenantBySlug(slug);
  
  // Handle case where tenant is not found
  if (!tenant) {
    notFound();
  }

  return (
    <PageGate teamId={tenant.id}>
      <YourViewComponent />
    </PageGate>
  );
}`;

console.log('📋 Pages to update:');
pagesToUpdate.forEach((page, index) => {
  console.log(`${index + 1}. ${page.path} - ${page.description}`);
  if (page.feature) {
    console.log(`   Feature: ${page.feature}`);
  } else {
    console.log(`   Feature: None (subscription check only)`);
  }
});

console.log('\n🎯 Next steps:');
console.log('1. Review each page file');
console.log('2. Update imports and component structure');
console.log('3. Replace YourViewComponent with actual component');
console.log('4. Test each page with different subscription states');

console.log('\n📝 Manual updates needed:');
console.log('- Replace YourViewComponent with actual view components');
console.log('- Update import paths for view components');
console.log('- Test feature gating works correctly');
console.log('- Verify subscription checks work');
