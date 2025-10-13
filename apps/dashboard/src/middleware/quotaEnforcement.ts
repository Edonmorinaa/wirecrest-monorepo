import { prisma } from '@wirecrest/db';
import { NextRequest, NextResponse } from 'next/server';
import { TenantQuotas, createQuotaManager } from '@wirecrest/feature-flags';

/**
 * Middleware to enforce quota limits before allowing operations
 * 
 * Usage:
 * export const POST = withQuotaCheck('locations', 1)(yourHandler);
 */
export function withQuotaCheck(
  quotaType: keyof TenantQuotas,
  amount: number = 1
) {
  return function <T extends (...args: any[]) => Promise<NextResponse>>(
    handler: T
  ): T {
    return (async (req: NextRequest, context: any) => {
      try {
        // Extract tenantId from params
        const tenantId = context.params?.tenantId || context.params?.id;

        if (!tenantId) {
          return NextResponse.json(
            {
              success: false,
              error: 'Tenant ID is required',
            },
            { status: 400 }
          );
        }

        // Check quota
        const quotaManager = createQuotaManager(prisma);
        const canPerform = await quotaManager.canPerformAction(tenantId, {
          type: quotaType,
          amount,
        });

        if (!canPerform.allowed) {
          return NextResponse.json(
            {
              success: false,
              error: `Quota exceeded: ${canPerform.reason}`,
              quotaType,
              remaining: canPerform.remaining,
              upgradeRequired: true,
            },
            { status: 403 }
          );
        }

        // Continue to handler
        return await handler(req, context);
      } catch (error) {
        console.error('Quota check middleware error:', error);
        // Continue to handler even if quota check fails (fail open)
        // Log the error but don't block the request
        return await handler(req, context);
      }
    }) as T;
  };
}

/**
 * Middleware to record quota usage after successful operation
 * 
 * Usage:
 * export const POST = withQuotaRecording('locations', 1)(yourHandler);
 */
export function withQuotaRecording(
  quotaType: keyof TenantQuotas,
  amount: number = 1
) {
  return function <T extends (...args: any[]) => Promise<NextResponse>>(
    handler: T
  ): T {
    return (async (req: NextRequest, context: any) => {
      // Execute handler first
      const response = await handler(req, context);

      // Record usage only if successful (2xx status)
      if (response.status >= 200 && response.status < 300) {
        try {
          const tenantId = context.params?.tenantId || context.params?.id;

          if (tenantId) {
            const quotaManager = createQuotaManager(prisma);
            await quotaManager.recordUsage(tenantId, quotaType, amount);
          }
        } catch (error) {
          // Log error but don't fail the request
          console.error('Quota recording error:', error);
        }
      }

      return response;
    }) as T;
  };
}

/**
 * Combined middleware for checking and recording quota
 * 
 * Usage:
 * export const POST = withQuotaEnforcement('locations', 1)(yourHandler);
 */
export function withQuotaEnforcement(
  quotaType: keyof TenantQuotas,
  amount: number = 1
) {
  return function <T extends (...args: any[]) => Promise<NextResponse>>(
    handler: T
  ): T {
    // Combine check and recording
    return withQuotaRecording(quotaType, amount)(
      withQuotaCheck(quotaType, amount)(handler)
    );
  };
}

/**
 * Middleware for endpoints that need to check multiple quotas
 * 
 * Usage:
 * export const POST = withMultiQuotaCheck([
 *   { type: 'locations', amount: 1 },
 *   { type: 'apiCalls', amount: 10 }
 * ])(yourHandler);
 */
export function withMultiQuotaCheck(
  quotas: Array<{ type: keyof TenantQuotas; amount: number }>
) {
  return function <T extends (...args: any[]) => Promise<NextResponse>>(
    handler: T
  ): T {
    return (async (req: NextRequest, context: any) => {
      try {
        const tenantId = context.params?.tenantId || context.params?.id;

        if (!tenantId) {
          return NextResponse.json(
            {
              success: false,
              error: 'Tenant ID is required',
            },
            { status: 400 }
          );
        }

        const quotaManager = createQuotaManager(prisma);

        // Check all quotas
        for (const quota of quotas) {
          const canPerform = await quotaManager.canPerformAction(tenantId, {
            type: quota.type,
            amount: quota.amount,
          });

          if (!canPerform.allowed) {
            return NextResponse.json(
              {
                success: false,
                error: `Quota exceeded: ${canPerform.reason}`,
                quotaType: quota.type,
                remaining: canPerform.remaining,
                upgradeRequired: true,
              },
              { status: 403 }
            );
          }
        }

        // All quotas passed, continue to handler
        return await handler(req, context);
      } catch (error) {
        console.error('Multi-quota check error:', error);
        // Fail open
        return await handler(req, context);
      }
    }) as T;
  };
}
