import { PrismaClient } from '@prisma/client';

declare global {
  var prisma: PrismaClient | undefined;
}

const DATABASE_URL = process.env.DATABASE_URL!;
const isServerless = process.env.PRISMA_SERVERLESS === 'true';

let prisma: PrismaClient;

if (isServerless) {
  // --- SERVERLESS MODE: VERCEL ---
  // Create a require function that bundlers cannot analyze
  // Using Function constructor prevents static analysis
  const createRequire = new Function('moduleName', 'return require(moduleName)');
  
  try {
    const pg = createRequire('pg');
    const prismaPg = createRequire('@prisma/adapter-pg');
    
    const pool = new pg.Pool({
      connectionString: DATABASE_URL,
      max: 5,
    });

    const adapter = new prismaPg.PrismaPg(pool);

    prisma =
      global.prisma ??
      new PrismaClient({
        adapter,
        log: ['error'],
      });

    if (process.env.NODE_ENV !== 'production') {
      global.prisma = prisma;
    }
  } catch (error) {
    // Fallback if require fails (e.g., in browser context)
    console.warn('Failed to load pg adapter, falling back to default Prisma client');
    prisma = global.prisma ?? new PrismaClient({ log: ['error'] });
  }
} else {
  // --- NORMAL NODE / DOCKER MODE ---
  prisma =
    global.prisma ??
    new PrismaClient({
      log: ['error', 'warn'],
      datasources: { db: { url: DATABASE_URL } },
    });

  global.prisma = prisma;
}

export { prisma };
export * from '@prisma/client';