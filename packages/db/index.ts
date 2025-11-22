import { PrismaClient } from '@prisma/client';

declare global {
  // allow global `var` declarations
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

const DATABASE_URL = process.env.DATABASE_URL || '';
const isDevelopment = process.env.NODE_ENV !== 'production';

export const prisma =
  (typeof global !== 'undefined' ? global.prisma : undefined) ||
  new PrismaClient({
    log: isDevelopment ? ['error', 'warn'] : ['error'],
    datasources: {
      db: {
        url: DATABASE_URL,
      },
    },
  });

// Cache the Prisma instance globally to prevent multiple instances
if (typeof global !== 'undefined') {
  global.prisma = prisma;
}

// Gracefully disconnect on shutdown
if (typeof process !== 'undefined') {
  process.on('beforeExit', async () => {
    await prisma.$disconnect();
  });

  process.on('SIGINT', async () => {
    await prisma.$disconnect();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}

// Re-export all Prisma types and enums
export * from '@prisma/client';
