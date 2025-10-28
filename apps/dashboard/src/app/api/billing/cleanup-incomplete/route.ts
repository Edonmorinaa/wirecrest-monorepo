/**
 * Cleanup Incomplete Subscriptions and Invoices API Route
 * POST /api/billing/cleanup-incomplete - Clean up incomplete subscriptions and open invoices
 */

import { NextRequest, NextResponse } from 'next/server';

import { StripeService } from '@wirecrest/billing';
import { prisma } from '@wirecrest/db';
import { auth } from '@wirecrest/auth-next';

const stripe = StripeService.getStripeInstance();

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { teamId } = body;

    if (!teamId) {
      return NextResponse.json(
        { error: 'Missing teamId parameter' },
        { status: 400 }
      );
    }

    // Verify user has access to this team
    const teamMember = await prisma.teamMember.findFirst({
      where: {
        teamId,
        userId: session.user.id,
        role: { in: ['OWNER', 'ADMIN'] },
      },
      include: {
        team: {
          include: {
            subscription: true,
          },
        },
      },
    });

    if (!teamMember) {
      return NextResponse.json(
        { error: 'Team not found or insufficient permissions' },
        { status: 404 }
      );
    }

    const team = teamMember.team;
    const customerId = team.subscription?.stripeCustomerId;

    if (!customerId) {
      return NextResponse.json({
        message: 'No Stripe customer found',
        cleaned: {
          subscriptions: 0,
          invoices: 0,
        },
      });
    }

    let canceledSubscriptions = 0;
    let voidedInvoices = 0;

    // 1. Clean up incomplete subscriptions
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: 'all',
      limit: 100,
    });

    for (const sub of subscriptions.data) {
      if (['incomplete', 'incomplete_expired', 'unpaid'].includes(sub.status)) {
        console.log(`🧹 Canceling incomplete subscription: ${sub.id} (status: ${sub.status})`);
        try {
          await stripe.subscriptions.cancel(sub.id);
          canceledSubscriptions++;
          console.log(`✅ Canceled subscription: ${sub.id}`);
        } catch (error) {
          console.warn(`⚠️ Failed to cancel subscription ${sub.id}:`, error);
        }
      }
    }

    // 2. Clean up open/draft invoices
    const invoices = await stripe.invoices.list({
      customer: customerId,
      status: 'open',
      limit: 100,
    });

    for (const invoice of invoices.data) {
      if (['draft', 'open'].includes(invoice.status || '')) {
        console.log(`🧹 Voiding invoice: ${invoice.id} (status: ${invoice.status})`);
        try {
          if (invoice.status === 'open') {
            await stripe.invoices.voidInvoice(invoice.id);
          } else if (invoice.status === 'draft') {
            await stripe.invoices.del(invoice.id);
          }
          voidedInvoices++;
          console.log(`✅ Voided/deleted invoice: ${invoice.id}`);
        } catch (error) {
          console.warn(`⚠️ Failed to void/delete invoice ${invoice.id}:`, error);
        }
      }
    }

    // 3. Clean up local incomplete subscriptions
    if (team.subscription && ['INCOMPLETE', 'INCOMPLETE_EXPIRED', 'UNPAID'].includes(team.subscription.status)) {
      await prisma.teamSubscription.delete({
        where: { teamId },
      });
      console.log(`✅ Cleaned up local incomplete subscription`);
    }

    return NextResponse.json({
      success: true,
      message: `Cleaned up ${canceledSubscriptions} subscriptions and ${voidedInvoices} invoices`,
      cleaned: {
        subscriptions: canceledSubscriptions,
        invoices: voidedInvoices,
      },
    });
  } catch (error) {
    console.error('Failed to cleanup incomplete subscriptions:', error);
    return NextResponse.json(
      {
        error: 'Failed to cleanup incomplete subscriptions',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

