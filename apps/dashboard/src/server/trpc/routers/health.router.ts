/**
 * Health Router
 * 
 * tRPC router for health check operations
 */

import { prisma } from '@wirecrest/db';
import { router, publicProcedure } from '../trpc';

/**
 * Health Router
 */
export const healthRouter = router({
  /**
   * Health check - verify database connectivity
   */
  check: publicProcedure.query(async () => {
    try {
      await prisma.$queryRaw`SELECT 1`;

      return {
        status: 'healthy',
        timestamp: new Date().toISOString(),
      };
    } catch (err: any) {
      return {
        status: 'unhealthy',
        error: 'Database connection failed',
        timestamp: new Date().toISOString(),
      };
    }
  }),
});

