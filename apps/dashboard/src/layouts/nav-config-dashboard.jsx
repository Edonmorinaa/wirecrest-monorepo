'use client';

import { CONFIG } from 'src/global-config';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

const icon = (name) => <Iconify icon={name} />;

const ICONS = {
  job: icon('solar:case-minimalistic-bold'),
  app: icon('solar:widget-add-bold'),
  file: icon('solar:file-bold'),
  lock: icon('solar:lock-password-bold'),
  tour: icon('solar:camera-bold'),
  order: icon('solar:sort-by-time-bold'),
  label: icon('solar:text-circle-bold'),
  blank: icon('solar:file-text-bold'),
  kanban: icon('solar:checklist-minimalistic-bold'),
  folder: icon('solar:folder-with-files-bold'),
  banking: icon('solar:dollar-minimalistic-bold'),
  booking: icon('solar:calendar-mark-bold'),
  invoice: icon('solar:file-check-bold'),
  product: icon('solar:box-minimalistic-bold'),
  calendar: icon('solar:calendar-bold'),
  disabled: icon('solar:eye-closed-bold'),
  external: icon('solar:link-round-angle-bold'),
  menuItem: icon('solar:list-bold'),
  ecommerce: icon('solar:cart-large-2-bold'),
  analytics: icon('solar:chart-bold'),
  dashboard: icon('solar:pie-chart-bold'),
  course: icon('solar:atom-bold'),
  user: icon('solar:users-group-rounded-bold'),
  mail: icon('solar:letter-bold'),
  chat: icon('solar:chat-round-dots-bold'),
  blog: icon('solar:pen-new-round-bold'),
  params: icon('solar:sidebar-minimalistic-outline'),
  subpaths: icon('solar:filter-bold'),
  twitter: (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="1200"
      height="1227"
      viewBox="0 0 1200 1227"
      fill="none"
    >
      <path
        d="M714.163 519.284L1160.89 0H1055.03L667.137 450.887L357.328 0H0L468.492 681.821L0 1226.37H105.866L515.491 750.218L842.672 1226.37H1200L714.137 519.284H714.163ZM569.165 687.828L521.697 619.934L144.011 79.6944H306.615L611.412 515.685L658.88 583.579L1055.08 1150.3H892.476L569.165 687.854V687.828Z"
        fill="currentColor"
      />
    </svg>
  ),
  // Platform icons
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
  facebook: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path
        d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"
        fill="#1877F2"
      />
    </svg>
  ),
  instagram: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <defs>
        <radialGradient id="instagram-gradient" cx="0.3" cy="1.1" r="1.5">
          <stop offset="0%" stopColor="#FFD600" />
          <stop offset="25%" stopColor="#FF6B00" />
          <stop offset="50%" stopColor="#E60026" />
          <stop offset="75%" stopColor="#C13584" />
          <stop offset="100%" stopColor="#833AB4" />
        </radialGradient>
      </defs>
      <path
        d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"
        fill="url(#instagram-gradient)"
      />
    </svg>
  ),
  tiktok: (
    <img
      src={`${CONFIG.assetsDir}/assets/icons/navbar/tiktok-logo.png`}
      alt="TikTok"
      width="20"
      height="20"
      style={{ borderRadius: '50%' }}
    />
  ),
  tripadvisor: (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 -96 512.2 512.2">
      <path
        d="M128.2 127.9C92.7 127.9 64 156.6 64 192c0 35.4 28.7 64.1 64.1 64.1 35.4 0 64.1-28.7 64.1-64.1.1-35.4-28.6-64.1-64-64.1zm0 110c-25.3 0-45.9-20.5-45.9-45.9s20.5-45.9 45.9-45.9S174 166.7 174 192s-20.5 45.9-45.8 45.9z"
        fill="#00AF87"
      />
      <circle cx="128.4" cy="191.9" r="31.9" fill="#00AF87" />
      <path
        d="M384.2 127.9c-35.4 0-64.1 28.7-64.1 64.1 0 35.4 28.7 64.1 64.1 64.1 35.4 0 64.1-28.7 64.1-64.1 0-35.4-28.7-64.1-64.1-64.1zm0 110c-25.3 0-45.9-20.5-45.9-45.9s20.5-45.9 45.9-45.9S430 166.7 430 192s-20.5 45.9-45.8 45.9z"
        fill="#00AF87"
      />
      <circle cx="384.4" cy="191.9" r="31.9" fill="#00AF87" />
      <path
        d="M474.4 101.2l37.7-37.4h-76.4C392.9 29 321.8 0 255.9 0c-66 0-136.5 29-179.3 63.8H0l37.7 37.4C14.4 124.4 0 156.5 0 192c0 70.8 57.4 128.2 128.2 128.2 32.5 0 62.2-12.1 84.8-32.1l43.4 31.9 42.9-31.2-.5-1.2c22.7 20.2 52.5 32.5 85.3 32.5 70.8 0 128.2-57.4 128.2-128.2-.1-35.4-14.6-67.5-37.9-90.7zM368 64.8c-60.7 7.6-108.3 57.6-111.9 119.5-3.7-62-51.4-112.1-112.3-119.5 30.6-22 69.6-32.8 112.1-32.8S337.4 42.8 368 64.8zM128.2 288.2C75 288.2 32 245.1 32 192s43.1-96.2 96.2-96.2 96.2 43.1 96.2 96.2c-.1 53.1-43.1 96.2-96.2 96.2zm256 0c-53.1 0-96.2-43.1-96.2-96.2s43.1-96.2 96.2-96.2 96.2 43.1 96.2 96.2c-.1 53.1-43.1 96.2-96.2 96.2z"
        fill="#00AF87"
      />
    </svg>
  ),
  bookingcom: (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="-.092 .015 2732.125 2671.996"
    >
      <path
        d="m2732.032 513.03c0-283.141-229.978-513.015-513.118-513.015h-1705.89c-283.138 0-513.116 229.874-513.116 513.015v1645.965c0 283.066 229.978 513.016 513.118 513.016h1705.889c283.14 0 513.118-229.95 513.118-513.016z"
        fill="#003580"
      />
      <path d="m.001 1659.991h1364.531v1012.019h-1364.53z" fill="#003580" />
      <path
        d="m1241.6 1768.638-220.052-.22v-263.12c0-56.22 21.808-85.48 69.917-92.165h150.136c107.068 0 176.328 67.507 176.328 176.766 0 112.219-67.507 178.63-176.328 178.739zm-220.052-709.694v-69.26c0-60.602 25.643-89.424 81.862-93.15h112.657c96.547 0 154.41 57.753 154.41 154.52 0 73.643-39.671 159.67-150.903 159.67h-198.026zm501.037 262.574-39.78-22.356 34.74-29.699c40.437-34.74 108.163-112.876 108.163-247.67 0-206.464-160.109-339.614-407.888-339.614h-282.738v-.11h-32.219c-73.424 2.74-132.273 62.466-133.04 136.329v1171.499h453.586c275.396 0 453.148-149.917 453.148-382.135 0-125.04-57.424-231.889-153.972-286.244"
        fill="#fff"
      />
      <path
        d="m1794.688 1828.066c0-89.492 72.178-161.894 161.107-161.894 89.154 0 161.669 72.402 161.669 161.894 0 89.379-72.515 161.894-161.67 161.894-88.928 0-161.106-72.515-161.106-161.894"
        fill="#00bafc"
      />
    </svg>
  ),
};

// ----------------------------------------------------------------------

/*
 * Generate navigation data based on team slug and location slug
 * @param {string} teamSlug - The team slug from URL params
 * @param {string} locationSlug - The location slug from URL params (optional)
 * @returns {Array} Navigation configuration array
 * 
 * Navigation visibility rules:
 * - No teamSlug: Show nothing
 * - teamSlug only (no locationSlug): Show nothing (user should select a location)
 * - teamSlug + locationSlug: Show full navigation with platform items
 */
export const getNavData = (teamSlug, locationSlug) => [
  // Only show navigation items if both team and location are selected
  ...(teamSlug && locationSlug
    ? [
        {
          subheader: 'General',
          items: [
            {
              title: 'Overview',
              path: `/${locationSlug}`,
              icon: ICONS.dashboard,
            },
            {
              title: 'Inbox',
              path: `/${locationSlug}/inbox`,
              icon: ICONS.chat,
            },
          ],
        },
        {
          subheader: 'Automation',
          items: [
            {
              title: 'X Automation',
              path: `/${locationSlug}/automation/twitter`,
              icon: ICONS.twitter,
              children: [
                { 
                  title: 'Profiles', 
                  path: `/${locationSlug}/automation/twitter/profiles` 
                },
                { 
                  title: 'Alerts', 
                  path: `/${locationSlug}/automation/twitter/alerts` 
                },
              ],
            },
          ],
        },
        {
          subheader: 'Social Media',
          items: [
            {
              title: 'Instagram',
              path: `/${locationSlug}/instagram`,
              icon: ICONS.instagram,
            },
            {
              title: 'TikTok',
              path: `/${locationSlug}/tiktok`,
              icon: ICONS.tiktok,
            },
          ],
        },
        {
          subheader: 'Platforms',
          items: [
            {
              title: 'Google Business',
              path: `/${locationSlug}/google`,
              icon: ICONS.google,
              children: [
                { 
                  title: 'Overview', 
                  path: `/${locationSlug}/google/overview` 
                },
                { 
                  title: 'Reviews', 
                  path: `/${locationSlug}/google/reviews` 
                },
              ],
            },
            {
              title: 'Facebook Business',
              path: `/${locationSlug}/facebook`,
              icon: ICONS.facebook,
              children: [
                { 
                  title: 'Overview', 
                  path: `/${locationSlug}/facebook/overview` 
                },
                { 
                  title: 'Reviews', 
                  path: `/${locationSlug}/facebook/reviews` 
                },
              ],
            },
            {
              title: 'TripAdvisor',
              path: `/${locationSlug}/tripadvisor`,
              icon: ICONS.tripadvisor,
              children: [
                { 
                  title: 'Overview', 
                  path: `/${locationSlug}/tripadvisor/overview` 
                },
                { 
                  title: 'Reviews', 
                  path: `/${locationSlug}/tripadvisor/reviews` 
                },
              ],
            },
            {
              title: 'Booking.com',
              path: `/${locationSlug}/booking`,
              icon: ICONS.bookingcom,
              children: [
                { 
                  title: 'Overview', 
                  path: `/${locationSlug}/booking/overview` 
                },
                { 
                  title: 'Reviews', 
                  path: `/${locationSlug}/booking/reviews` 
                },
              ],
            },
          ],
        },
      ]
    : []),
];
