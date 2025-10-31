/**
 * Static Exports in Next.js
 *
 * 1. Set `isStaticExport = true` in `next.config.{mjs|ts}`.
 * 2. This allows `generateStaticParams()` to pre-render dynamic routes at build time.
 *
 * For more details, see:
 * https://nextjs.org/docs/app/building-your-application/deploying/static-exports
 *
 * NOTE: Remove all "generateStaticParams()" functions if not using static exports.
 */
const isStaticExport = false;

// ----------------------------------------------------------------------

const nextConfig = {
  trailingSlash: true,
  output: isStaticExport ? 'export' : 'standalone',
  
  // Environment variables exposed to the client
  env: {
    BUILD_STATIC_EXPORT: JSON.stringify(isStaticExport),
    AUTH_SERVICE_URL: process.env.AUTH_SERVICE_URL,
  },
  
  // TypeScript configuration
  typescript: {
    ignoreBuildErrors: true,
  },
  
  // ESLint configuration
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // Production optimizations
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  
  // Image optimization
  images: {
    domains: [],
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60,
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  
  // Experimental features for performance
  experimental: {
    // optimizeCss: true, // Disabled to avoid critters dependency
    optimizePackageImports: [
      '@mui/material',
      '@mui/icons-material',
      '@iconify/react',
      'react-hook-form',
      'date-fns',
    ],
  },
  
  // Headers for security and performance
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ];
  },
  
  // Without --turbopack (next dev)
  webpack(config, { dev, isServer }) {
    // SVG handling
    config.module.rules.push({
      test: /\.svg$/,
      use: ['@svgr/webpack'],
    });

    // Support for both TypeScript and JavaScript
    config.resolve.extensions = [
      '.ts',
      '.tsx',
      '.js',
      '.jsx',
      '.json',
      ...config.resolve.extensions,
    ];
    
    // Production optimizations
    if (!dev && !isServer) {
      // Tree shaking optimization
      config.optimization = {
        ...config.optimization,
        usedExports: true,
        sideEffects: false,
      };
    }

    return config;
  },
  
  // With --turbopack (next dev --turbopack)
  turbopack: {
    rules: {
      '*.svg': {
        loaders: ['@svgr/webpack'],
        as: '*.js',
      },
    },
  },
};

export default nextConfig;
