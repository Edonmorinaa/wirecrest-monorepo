import { PrismaClient } from '@prisma/client';
import type { Pool } from 'pg';
import type { PrismaPg } from '@prisma/adapter-pg';

declare global {
  var prisma: PrismaClient | undefined;
}

const DATABASE_URL = process.env.DATABASE_URL!;
const isServerless = process.env.PRISMA_SERVERLESS === 'true';

let prisma: PrismaClient;

if (isServerless) {
  // --- SERVERLESS MODE: VERCEL ---
  // Dynamic require to avoid top-level import issues
  const pg = require('pg');
  const prismaPg = require('@prisma/adapter-pg');
  
  const pool: Pool = new pg.Pool({
    connectionString: DATABASE_URL,
    max: 1, // crucial
  });

  const adapter: PrismaPg = new prismaPg.PrismaPg(pool);

  prisma =
    global.prisma ??
    new PrismaClient({
      adapter,
      log: ['error'],
    });

  // share in dev only
  if (process.env.NODE_ENV !== 'production') {
    global.prisma = prisma;
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
