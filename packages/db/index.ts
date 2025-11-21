import { PrismaClient } from '@prisma/client';

declare global {
  // allow global `var` declarations
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

// Connection pool configuration for Supabase
// Supabase free tier has ~100 connection limit
// Vercel serverless creates many function instances
// Key: Keep connection_limit LOW per instance to avoid exhaustion
const DATABASE_URL = process.env.DATABASE_URL || '';
const isDevelopment = process.env.NODE_ENV !== 'production';

// Add connection_limit and pool_timeout to URL if not present
// This is crucial for Supabase + serverless deployments
const getOptimizedDatabaseUrl = (url: string): string => {
  if (!url) return url;
  
  const urlObj = new URL(url);
  const params = urlObj.searchParams;
  
  // Set conservative connection limit for serverless (max 5 connections per instance)
  if (!params.has('connection_limit')) {
    params.set('connection_limit', '5');
  }
  
  // Set pool timeout
  if (!params.has('pool_timeout')) {
    params.set('pool_timeout', '10');
  }
  
  return urlObj.toString();
};

export const prisma =
  (typeof global !== 'undefined' ? global.prisma : undefined) ||
  new PrismaClient({
    log: isDevelopment ? ['error', 'warn'] : ['error'],
    datasources: {
      db: {
        url: getOptimizedDatabaseUrl(DATABASE_URL),
      },
    },
  });

if (isDevelopment && typeof global !== 'undefined') {
  global.prisma = prisma;
}

// Gracefully disconnect on shutdown
if (typeof process !== 'undefined') {
  process.on('beforeExit', async () => {
    await prisma.$disconnect();
  });
}

// Re-export all Prisma types and enums
export * from '@prisma/client';
