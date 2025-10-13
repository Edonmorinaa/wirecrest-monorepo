import { PrismaClient } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';
import { createQuotaResetService } from '@wirecrest/feature-flags';

const prisma = new PrismaClient();

/**
 * GET /api/cron/quota-reset
 * 
 * Vercel Cron job that runs every hour to reset expired quotas
 * Schedule: "0 * * * *" (every hour at minute 0)
 * 
 * Protected by Vercel Cron secret for security
 */
export async function GET(request: NextRequest) {
  try {
    // Verify this is a legitimate cron request from Vercel
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret) {
      if (authHeader !== `Bearer ${cronSecret}`) {
        console.error('[Quota Reset Cron] Unauthorized access attempt');
        return NextResponse.json({
          success: false,
          error: 'Unauthorized'
        }, { status: 401 });
      }
    }

    console.log('[Quota Reset Cron] Starting quota reset job...');
    const startTime = Date.now();

    // Create quota reset service
    const quotaResetService = createQuotaResetService(prisma);

    // Reset expired quotas
    const result = await quotaResetService.resetExpiredQuotas();

    const duration = Date.now() - startTime;

    console.log('[Quota Reset Cron] Job completed:', {
      tenantsProcessed: result.tenantsProcessed,
      quotasReset: result.quotasReset,
      errors: result.errors.length,
      durationMs: duration,
    });

    // Log errors if any
    if (result.errors.length > 0) {
      console.error('[Quota Reset Cron] Errors encountered:', result.errors);
    }

    return NextResponse.json({
      success: true,
      message: 'Quota reset completed',
      stats: {
        tenantsProcessed: result.tenantsProcessed,
        quotasReset: result.quotasReset,
        errors: result.errors.length,
        durationMs: duration,
      },
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('[Quota Reset Cron] Fatal error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Quota reset failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * POST endpoint for manual testing (protected)
 */
export async function POST(request: NextRequest) {
  try {
    // Verify authorization for manual trigger
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized'
      }, { status: 401 });
    }

    console.log('[Quota Reset Cron] Manual trigger initiated...');

    // Same logic as GET
    const startTime = Date.now();
    const quotaResetService = createQuotaResetService(prisma);
    const result = await quotaResetService.resetExpiredQuotas();
    const duration = Date.now() - startTime;

    console.log('[Quota Reset Cron] Manual job completed:', {
      tenantsProcessed: result.tenantsProcessed,
      quotasReset: result.quotasReset,
      errors: result.errors.length,
      durationMs: duration,
    });

    return NextResponse.json({
      success: true,
      message: 'Quota reset completed (manual trigger)',
      stats: {
        tenantsProcessed: result.tenantsProcessed,
        quotasReset: result.quotasReset,
        errors: result.errors.length,
        durationMs: duration,
      },
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('[Quota Reset Cron] Manual trigger error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Quota reset failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
