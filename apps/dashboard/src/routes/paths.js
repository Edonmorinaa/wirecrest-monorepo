import { kebabCase } from 'es-toolkit';

import { _id, _postTitles } from 'src/_mock/assets';

// ----------------------------------------------------------------------

const MOCK_ID = _id[1];
const MOCK_TITLE = _postTitles[2];

const ROOTS = {
  AUTH: '/auth',
  AUTH_DEMO: '/auth-demo',
  DASHBOARD: '',
};

// ----------------------------------------------------------------------

export const paths = {
  comingSoon: '/coming-soon',
  maintenance: '/maintenance',
  pricing: '/pricing',
  payment: '/payment',
  about: '/about-us',
  contact: '/contact-us',
  faqs: '/faqs',
  page403: '/error/403',
  page404: '/error/404',
  page500: '/error/500',
  components: '/components',
  docs: 'https://docs.minimals.cc/',
  changelog: 'https://docs.minimals.cc/changelog/',
  zoneStore: 'https://mui.com/store/items/zone-landing-page/',
  minimalStore: 'https://mui.com/store/items/minimal-dashboard/',
  freeUI: 'https://mui.com/store/items/minimal-dashboard-free/',
  figmaUrl: 'https://www.figma.com/design/WadcoP3CSejUDj7YZc87xj/%5BPreview%5D-Minimal-Web.v7.3.0',
  product: {
    root: `/product`,
    checkout: `/product/checkout`,
    details: (id) => `/product/${id}`,
    demo: { details: `/product/${MOCK_ID}` },
  },
  post: {
    root: `/post`,
    details: (title) => `/post/${kebabCase(title)}`,
    demo: { details: `/post/${kebabCase(MOCK_TITLE)}` },
  },
  // AUTH
  auth: {
    amplify: {
      signIn: `${ROOTS.AUTH}/amplify/auth/sign-in`,
      verify: `${ROOTS.AUTH}/amplify/verify`,
      signUp: `${ROOTS.AUTH}/amplify/sign-up`,
      updatePassword: `${ROOTS.AUTH}/amplify/update-password`,
      resetPassword: `${ROOTS.AUTH}/amplify/reset-password`,
    },
    jwt: {
      signIn: `${ROOTS.AUTH}/jwt/auth/sign-in`,
      signUp: `${ROOTS.AUTH}/jwt/sign-up`,
    },
    firebase: {
      signIn: `${ROOTS.AUTH}/firebase/auth/sign-in`,
      verify: `${ROOTS.AUTH}/firebase/verify`,
      signUp: `${ROOTS.AUTH}/firebase/sign-up`,
      resetPassword: `${ROOTS.AUTH}/firebase/reset-password`,
    },
    auth0: { signIn: `${ROOTS.AUTH}/auth0/auth/sign-in` },
    nextauth: {
      signIn: `${ROOTS.AUTH}/sign-in`,
      signUp: `${ROOTS.AUTH}/sign-up`,
      updatePassword: `${ROOTS.AUTH}/update-password`,
      resetPassword: `${ROOTS.AUTH}/reset-password`,
    },
    supabase: {
      signIn: `${ROOTS.AUTH}/supabase/auth/sign-in`,
      verify: `${ROOTS.AUTH}/supabase/verify`,
      signUp: `${ROOTS.AUTH}/supabase/sign-up`,
      updatePassword: `${ROOTS.AUTH}/supabase/update-password`,
      resetPassword: `${ROOTS.AUTH}/supabase/reset-password`,
    },
  },
  authDemo: {
    split: {
      signIn: `${ROOTS.AUTH_DEMO}/split/auth/sign-in`,
      signUp: `${ROOTS.AUTH_DEMO}/split/sign-up`,
      resetPassword: `${ROOTS.AUTH_DEMO}/split/reset-password`,
      updatePassword: `${ROOTS.AUTH_DEMO}/split/update-password`,
      verify: `${ROOTS.AUTH_DEMO}/split/verify`,
    },
    centered: {
      signIn: `${ROOTS.AUTH_DEMO}/centered/auth/sign-in`,
      signUp: `${ROOTS.AUTH_DEMO}/centered/sign-up`,
      resetPassword: `${ROOTS.AUTH_DEMO}/centered/reset-password`,
      updatePassword: `${ROOTS.AUTH_DEMO}/centered/update-password`,
      verify: `${ROOTS.AUTH_DEMO}/centered/verify`,
    },
  },
  // DASHBOARD
  dashboard: {
    root: ROOTS.DASHBOARD,
    mail: `${ROOTS.DASHBOARD}/mail`,
    chat: `${ROOTS.DASHBOARD}/chat`,
    blank: `${ROOTS.DASHBOARD}/blank`,
    kanban: `${ROOTS.DASHBOARD}/kanban`,
    calendar: `${ROOTS.DASHBOARD}/calendar`,
    fileManager: `${ROOTS.DASHBOARD}/file-manager`,
    permission: `${ROOTS.DASHBOARD}/permission`,
    general: {
      app: `${ROOTS.DASHBOARD}/app`,
      ecommerce: `${ROOTS.DASHBOARD}/ecommerce`,
      analytics: `${ROOTS.DASHBOARD}/analytics`,
      banking: `${ROOTS.DASHBOARD}/banking`,
      booking: `${ROOTS.DASHBOARD}/booking`,
      file: `${ROOTS.DASHBOARD}/file`,
      course: `${ROOTS.DASHBOARD}/course`,
    },
    // Teams
    teams: {
      root: `${ROOTS.DASHBOARD}/teams`,
      create: `${ROOTS.DASHBOARD}/teams?newTeam=true`,
      bySlug: (slug) => `${ROOTS.DASHBOARD}/teams/${slug}`,
    },
    // Team-scoped Social Media Platforms
    instagram: {
      root: (slug) => `${ROOTS.DASHBOARD}/instagram`,
      analytics: (slug) => `${ROOTS.DASHBOARD}/instagram/analytics`,
      posts: (slug) => `${ROOTS.DASHBOARD}/instagram/posts`,
      stories: (slug) => `${ROOTS.DASHBOARD}/instagram/stories`,
    },
    tiktok: {
      root: (slug) => `${ROOTS.DASHBOARD}/tiktok`,
      analytics: (slug) => `${ROOTS.DASHBOARD}/tiktok/analytics`,
      videos: (slug) => `${ROOTS.DASHBOARD}/tiktok/videos`,
      trends: (slug) => `${ROOTS.DASHBOARD}/tiktok/trends`,
    },
    inbox: {
      root: (slug) => `${ROOTS.DASHBOARD}/inbox`,
    },
    // Team-scoped Automation
    automation: {
      root: (slug) => `${ROOTS.DASHBOARD}/automation`,
      dashboard: (slug) => `${ROOTS.DASHBOARD}/automation`,
      twitter: (slug) => `${ROOTS.DASHBOARD}/automation/twitter`,
      twitterProfiles: (slug) => `${ROOTS.DASHBOARD}/automation/twitter/profiles`,
      twitterAlerts: (slug) => `${ROOTS.DASHBOARD}/automation/twitter/alerts`,
    },
    // Team-scoped Twitter (for backward compatibility)
    twitter: {
      root: (slug) => `${ROOTS.DASHBOARD}/automation/twitter`,
      profiles: (slug) => `${ROOTS.DASHBOARD}/automation/twitter/profiles`,
      alerts: (slug) => `${ROOTS.DASHBOARD}/automation/twitter/alerts`,
    },
    // Team-scoped Business Platforms
    google: {
      root: (slug) => `${ROOTS.DASHBOARD}/google`,
      overview: (slug) => `${ROOTS.DASHBOARD}/google/overview`,
      reviews: (slug) => `${ROOTS.DASHBOARD}/google/reviews`,
    },
    facebook: {
      root: (slug) => `${ROOTS.DASHBOARD}/facebook`,
      overview: (slug) => `${ROOTS.DASHBOARD}/facebook/overview`,
      reviews: (slug) => `${ROOTS.DASHBOARD}/facebook/reviews`,
    },
    tripadvisor: {
      root: (slug) => `${ROOTS.DASHBOARD}/tripadvisor`,
      overview: (slug) => `${ROOTS.DASHBOARD}/tripadvisor/overview`,
      reviews: (slug) => `${ROOTS.DASHBOARD}/tripadvisor/reviews`,
    },
    booking: {
      root: (slug) => `${ROOTS.DASHBOARD}/booking`,
      overview: (slug) => `${ROOTS.DASHBOARD}/booking/overview`,
      reviews: (slug) => `${ROOTS.DASHBOARD}/booking/reviews`,
    },
    bookingcom: {
      root: (slug) => `${ROOTS.DASHBOARD}/booking`,
      overview: (slug) => `${ROOTS.DASHBOARD}/booking/overview`,
      reviews: (slug) => `${ROOTS.DASHBOARD}/booking/reviews`,
    },
    user: {
      root: `${ROOTS.DASHBOARD}/user`,
      new: `${ROOTS.DASHBOARD}/user/new`,
      list: `${ROOTS.DASHBOARD}/user/list`,
      cards: `${ROOTS.DASHBOARD}/user/cards`,
      profile: `${ROOTS.DASHBOARD}/user/profile`,
      account: `${ROOTS.DASHBOARD}/user/account`,
      edit: (id) => `${ROOTS.DASHBOARD}/user/${id}/edit`,
      demo: { edit: `${ROOTS.DASHBOARD}/user/${MOCK_ID}/edit` },
    },
    product: {
      root: `${ROOTS.DASHBOARD}/product`,
      new: `${ROOTS.DASHBOARD}/product/new`,
      details: (id) => `${ROOTS.DASHBOARD}/product/${id}`,
      edit: (id) => `${ROOTS.DASHBOARD}/product/${id}/edit`,
      demo: {
        details: `${ROOTS.DASHBOARD}/product/${MOCK_ID}`,
        edit: `${ROOTS.DASHBOARD}/product/${MOCK_ID}/edit`,
      },
    },
    invoice: {
      root: `${ROOTS.DASHBOARD}/invoice`,
      new: `${ROOTS.DASHBOARD}/invoice/new`,
      details: (id) => `${ROOTS.DASHBOARD}/invoice/${id}`,
      edit: (id) => `${ROOTS.DASHBOARD}/invoice/${id}/edit`,
      demo: {
        details: `${ROOTS.DASHBOARD}/invoice/${MOCK_ID}`,
        edit: `${ROOTS.DASHBOARD}/invoice/${MOCK_ID}/edit`,
      },
    },
    post: {
      root: `${ROOTS.DASHBOARD}/post`,
      new: `${ROOTS.DASHBOARD}/post/new`,
      details: (title) => `${ROOTS.DASHBOARD}/post/${kebabCase(title)}`,
      edit: (title) => `${ROOTS.DASHBOARD}/post/${kebabCase(title)}/edit`,
      demo: {
        details: `${ROOTS.DASHBOARD}/post/${kebabCase(MOCK_TITLE)}`,
        edit: `${ROOTS.DASHBOARD}/post/${kebabCase(MOCK_TITLE)}/edit`,
      },
    },
    order: {
      root: `${ROOTS.DASHBOARD}/order`,
      details: (id) => `${ROOTS.DASHBOARD}/order/${id}`,
      demo: { details: `${ROOTS.DASHBOARD}/order/${MOCK_ID}` },
    },
    job: {
      root: `${ROOTS.DASHBOARD}/job`,
      new: `${ROOTS.DASHBOARD}/job/new`,
      details: (id) => `${ROOTS.DASHBOARD}/job/${id}`,
      edit: (id) => `${ROOTS.DASHBOARD}/job/${id}/edit`,
      demo: {
        details: `${ROOTS.DASHBOARD}/job/${MOCK_ID}`,
        edit: `${ROOTS.DASHBOARD}/job/${MOCK_ID}/edit`,
      },
    },
    tour: {
      root: `${ROOTS.DASHBOARD}/tour`,
      new: `${ROOTS.DASHBOARD}/tour/new`,
      details: (id) => `${ROOTS.DASHBOARD}/tour/${id}`,
      edit: (id) => `${ROOTS.DASHBOARD}/tour/${id}/edit`,
      demo: {
        details: `${ROOTS.DASHBOARD}/tour/${MOCK_ID}`,
        edit: `${ROOTS.DASHBOARD}/tour/${MOCK_ID}/edit`,
      },
    },
    superadmin: {
      root: '/',
      analytics: '/analytics',
      monitoring: '/monitoring',

      tenants: {
        root: '/tenants',
        create: '/tenants/create',
        analytics: '/tenants/analytics',
      },

      users: {
        root: '/users',
        roles: '/users/roles',
        permissions: '/users/permissions',
      },

      billing: {
        root: '/billing',
        subscriptions: '/billing/subscriptions',
        invoices: '/billing/invoices',
        paymentMethods: '/billing/payment-methods',
      },

      platforms: {
        google: '/platforms/google',
        googleSettings: '/platforms/google/settings',
        facebook: '/platforms/facebook',
        facebookSettings: '/platforms/facebook/settings',
        tripadvisor: '/platforms/tripadvisor',
        tripadvisorSettings: '/platforms/tripadvisor/settings',
        booking: '/platforms/booking',
      },

      system: {
        settings: '/system/settings',
        security: '/system/security',
        integrations: '/system/integrations',
        logs: '/system/logs',
        errorLogs: '/system/logs/errors',
        auditLogs: '/system/logs/audit',
      },

      security: {
        root: '/security',
        access: '/security/access',
        apiKeys: '/security/api-keys',
        sessions: '/security/sessions',
      },
    },
  },
};
