'use client';

import { paths } from 'src/routes/paths';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

const icon = (name) => <Iconify icon={name} />;

const ICONS = {
  dashboard: icon('solar:pie-chart-bold'),
  user: icon('solar:users-group-rounded-bold'),
  teams: icon('solar:users-group-two-rounded-bold'),
  google: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  ),
  facebook: icon('solar:facebook-circle-bold'),
  tripadvisor: icon('solar:star-bold'),
  booking: icon('solar:calendar-mark-bold'),
  instagram: icon('solar:instagram-bold'),
  tiktok: icon('solar:video-library-bold'),
  settings: icon('solar:settings-bold'),
  profile: icon('solar:user-bold'),
  billing: icon('solar:dollar-minimalistic-bold'),
  team: icon('solar:users-group-two-rounded-bold'),
  members: icon('solar:users-group-rounded-bold'),
  analytics: icon('solar:chart-bold'),
  reports: icon('solar:chart-2-bold'),
};

// ----------------------------------------------------------------------

/**
 * Tenant Member navigation data
 * This is for users who are members within their team/tenant (limited access)
 */
export const getTenantMemberNavData = (teamSlug) => [
  /**
   * Overview
   */
  {
    subheader: 'Overview',
    items: [
      { 
        title: 'Dashboard', 
        path: '/', 
        icon: ICONS.dashboard 
      },
      { 
        title: 'Analytics', 
        path: '/analytics', 
        icon: ICONS.analytics 
      },
      { 
        title: 'Reports', 
        path: '/reports', 
        icon: ICONS.reports 
      },
    ],
  },
  /**
   * Team
   */
  {
    subheader: 'Team',
    items: [
      { 
        title: 'Team Overview', 
        path: '/', 
        icon: ICONS.team 
      },
      { 
        title: 'Members', 
        path: '/members', 
        icon: ICONS.members 
      },
    ],
  },
  // Only show platform navigation if we have a team slug
  ...(teamSlug ? [
    /**
     * Social Media
     */
    {
      subheader: 'Social Media',
      items: [
        {
          title: 'Instagram',
          path: paths.dashboard.instagram.root(teamSlug),
          icon: ICONS.instagram,
        },
        {
          title: 'TikTok',
          path: paths.dashboard.tiktok.root(teamSlug),
          icon: ICONS.tiktok,
        },
      ],
    },
    /**
     * Platforms
     */
    {
      subheader: 'Platforms',
      items: [
        {
          title: 'Google Business',
          path: paths.dashboard.google.root(teamSlug),
          icon: ICONS.google,
          children: [
            { title: 'Overview', path: paths.dashboard.google.overview(teamSlug) },
            { title: 'Reviews', path: paths.dashboard.google.reviews(teamSlug) }
          ],
        },
        {
          title: 'Facebook Business',
          path: paths.dashboard.facebook.root(teamSlug),
          icon: ICONS.facebook,
          children: [
            { title: 'Overview', path: paths.dashboard.facebook.overview(teamSlug) },
            { title: 'Reviews', path: paths.dashboard.facebook.reviews(teamSlug) }
          ],
        },
        {
          title: 'TripAdvisor',
          path: paths.dashboard.tripadvisor.root(teamSlug),
          icon: ICONS.tripadvisor,
          children: [
            { title: 'Overview', path: paths.dashboard.tripadvisor.overview(teamSlug) },
            { title: 'Reviews', path: paths.dashboard.tripadvisor.reviews(teamSlug) }
          ],
        },
        {
          title: 'Booking.com',
          path: paths.dashboard.booking.root(teamSlug),
          icon: ICONS.booking,
          children: [
            { title: 'Overview', path: paths.dashboard.booking.overview(teamSlug) },
            { title: 'Reviews', path: paths.dashboard.booking.reviews(teamSlug) }
          ],
        },
      ],
    },
  ] : []),
  /**
   * Account
   */
  {
    subheader: 'Account',
    items: [
      {
        title: 'Profile',
        path: paths.dashboard.user.account,
        icon: ICONS.profile,
      },
      {
        title: 'Settings',
        path: paths.dashboard.user.settings,
        icon: ICONS.settings,
      },
      {
        title: 'Billing',
        path: paths.dashboard.user.billing,
        icon: ICONS.billing,
      },
    ],
  },
];

// Legacy export for backward compatibility (when no team context)
export const tenantMemberNavData = getTenantMemberNavData(null);
