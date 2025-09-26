'use server';

import { prisma } from '@wirecrest/db';

// Health check action
export async function checkHealth() {
  try {
    await prisma.$queryRaw`SELECT 1`;

    return {
      status: 'healthy',
    };
  } catch (err: any) {
    throw new Error('Service unhealthy');
  }
}
