/**
 * Payment Method Service
 * Manages Stripe payment methods with hosted payment collection
 */

import Stripe from 'stripe';
import { prisma } from '@wirecrest/db';
import { 
  PaymentMethodData, 
  SetupIntentResult, 
  AttachPaymentMethodResult 
} from './types';
import { StripeService } from './stripe-service';

export class PaymentMethodService {
  private stripe: Stripe;

  constructor() {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY environment variable is required');
    }

    this.stripe = StripeService.getStripeInstance();
  }

  /**
   * Create setup intent for payment method collection
   */
  async createSetupIntent(teamId: string): Promise<SetupIntentResult> {
    // Get or create Stripe customer
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        members: {
          include: { user: true },
          where: { role: 'OWNER' },
          take: 1,
        },
      },
    });

    if (!team) {
      throw new Error('Team not found');
    }

    let customerId = team.stripeCustomerId;

    // Create customer if doesn't exist
    if (!customerId) {
      const owner = team.members[0]?.user;
      const customer = await this.stripe.customers.create({
        email: owner?.email || `team-${teamId}@example.com`,
        name: owner?.name || team.name,
        metadata: { teamId },
      });

      customerId = customer.id;

      // Update team with customer ID
      await prisma.team.update({
        where: { id: teamId },
        data: { stripeCustomerId: customerId },
      });
    }

    // Create setup intent
    const setupIntent = await this.stripe.setupIntents.create({
      customer: customerId,
      payment_method_types: ['card'],
      usage: 'off_session',
      metadata: { teamId },
    });

    return {
      clientSecret: setupIntent.client_secret!,
      setupIntentId: setupIntent.id,
    };
  }

  /**
   * Attach payment method to team after successful setup
   */
  async attachPaymentMethod(
    teamId: string,
    setupIntentId: string,
    nickname?: string
  ): Promise<AttachPaymentMethodResult> {
    // Retrieve the setup intent to get the payment method
    const setupIntent = await this.stripe.setupIntents.retrieve(setupIntentId);
    
    if (!setupIntent.payment_method) {
      throw new Error('No payment method found on setup intent');
    }

    const stripePaymentMethod = await this.stripe.paymentMethods.retrieve(
      setupIntent.payment_method as string
    );

    // Check if this is the first payment method for the team
    const existingPaymentMethods = await prisma.paymentMethod.findMany({
      where: { teamId },
    });

    const isDefault = existingPaymentMethods.length === 0;

    // If this is being set as default, unset other defaults
    if (isDefault) {
      await prisma.paymentMethod.updateMany({
        where: { teamId },
        data: { isDefault: false },
      });
    }

    // Store payment method in database
    const paymentMethod = await prisma.paymentMethod.create({
      data: {
        teamId,
        stripePaymentMethodId: stripePaymentMethod.id,
        type: stripePaymentMethod.type,
        isDefault,
        cardBrand: stripePaymentMethod.card?.brand,
        cardLast4: stripePaymentMethod.card?.last4,
        cardExpMonth: stripePaymentMethod.card?.exp_month,
        cardExpYear: stripePaymentMethod.card?.exp_year,
        nickname,
      },
    });

    return {
      paymentMethod: this.transformPaymentMethodForUI(paymentMethod, stripePaymentMethod),
      isDefault,
    };
  }

  /**
   * List all payment methods for a team
   */
  async listPaymentMethods(teamId: string): Promise<PaymentMethodData[]> {
    const paymentMethods = await prisma.paymentMethod.findMany({
      where: { teamId },
      orderBy: [
        { isDefault: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    // Get Stripe payment method details for each
    const enrichedPaymentMethods = await Promise.all(
      paymentMethods.map(async (pm) => {
        try {
          const stripePaymentMethod = await this.stripe.paymentMethods.retrieve(
            pm.stripePaymentMethodId
          );
          return this.transformPaymentMethodForUI(pm, stripePaymentMethod);
        } catch (error) {
          console.error(`Failed to retrieve Stripe payment method ${pm.stripePaymentMethodId}:`, error);
          // Return local data only if Stripe fails
          return this.transformPaymentMethodForUI(pm);
        }
      })
    );

    return enrichedPaymentMethods;
  }

  /**
   * Set default payment method
   */
  async setDefaultPaymentMethod(teamId: string, paymentMethodId: string): Promise<void> {
    // Unset all current defaults
    await prisma.paymentMethod.updateMany({
      where: { teamId },
      data: { isDefault: false },
    });

    // Set new default
    const updatedPaymentMethod = await prisma.paymentMethod.updateMany({
      where: {
        teamId,
        id: paymentMethodId,
      },
      data: { isDefault: true },
    });

    if (updatedPaymentMethod.count === 0) {
      throw new Error('Payment method not found');
    }

    // Also update the default payment method in Stripe customer
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      select: { stripeCustomerId: true },
    });

    if (team?.stripeCustomerId) {
      const paymentMethod = await prisma.paymentMethod.findFirst({
        where: { teamId, id: paymentMethodId },
      });

      if (paymentMethod) {
        await this.stripe.customers.update(team.stripeCustomerId, {
          invoice_settings: {
            default_payment_method: paymentMethod.stripePaymentMethodId,
          },
        });
      }
    }
  }

  /**
   * Delete payment method
   */
  async deletePaymentMethod(teamId: string, paymentMethodId: string): Promise<void> {
    const paymentMethod = await prisma.paymentMethod.findFirst({
      where: { teamId, id: paymentMethodId },
    });

    if (!paymentMethod) {
      throw new Error('Payment method not found');
    }

    // Detach from Stripe
    try {
      await this.stripe.paymentMethods.detach(paymentMethod.stripePaymentMethodId);
    } catch (error) {
      console.error('Failed to detach payment method from Stripe:', error);
      // Continue with local deletion even if Stripe fails
    }

    // Delete from database
    await prisma.paymentMethod.delete({
      where: { id: paymentMethodId },
    });

    // If this was the default, set another one as default
    if (paymentMethod.isDefault) {
      const remainingPaymentMethods = await prisma.paymentMethod.findMany({
        where: { teamId },
        orderBy: { createdAt: 'desc' },
        take: 1,
      });

      if (remainingPaymentMethods.length > 0) {
        await this.setDefaultPaymentMethod(teamId, remainingPaymentMethods[0].id);
      }
    }
  }

  /**
   * Get default payment method for a team
   */
  async getDefaultPaymentMethod(teamId: string): Promise<PaymentMethodData | null> {
    const paymentMethod = await prisma.paymentMethod.findFirst({
      where: { teamId, isDefault: true },
    });

    if (!paymentMethod) {
      return null;
    }

    try {
      const stripePaymentMethod = await this.stripe.paymentMethods.retrieve(
        paymentMethod.stripePaymentMethodId
      );
      return this.transformPaymentMethodForUI(paymentMethod, stripePaymentMethod);
    } catch (error) {
      console.error('Failed to retrieve default payment method from Stripe:', error);
      return this.transformPaymentMethodForUI(paymentMethod);
    }
  }

  /**
   * Transform payment method for UI consumption
   */
  private transformPaymentMethodForUI(
    localPaymentMethod: {
      id: string;
      stripePaymentMethodId: string;
      type: string;
      isDefault: boolean;
      nickname?: string | null;
      cardBrand?: string | null;
      cardLast4?: string | null;
      cardExpMonth?: number | null;
      cardExpYear?: number | null;
      createdAt: Date;
      updatedAt: Date;
    },
    stripePaymentMethod?: Stripe.PaymentMethod
  ): PaymentMethodData {
    return {
      id: localPaymentMethod.id,
      stripePaymentMethodId: localPaymentMethod.stripePaymentMethodId,
      type: localPaymentMethod.type as Stripe.PaymentMethod.Type,
      isDefault: localPaymentMethod.isDefault,
      nickname: localPaymentMethod.nickname || undefined,
      card: localPaymentMethod.cardBrand || stripePaymentMethod?.card ? {
        brand: (stripePaymentMethod?.card?.brand || localPaymentMethod.cardBrand) as string,
        last4: (stripePaymentMethod?.card?.last4 || localPaymentMethod.cardLast4) as string,
        expMonth: (stripePaymentMethod?.card?.exp_month || localPaymentMethod.cardExpMonth) as number,
        expYear: (stripePaymentMethod?.card?.exp_year || localPaymentMethod.cardExpYear) as number,
        funding: stripePaymentMethod?.card?.funding,
        country: stripePaymentMethod?.card?.country,
      } : undefined,
      billingDetails: stripePaymentMethod?.billing_details,
      createdAt: localPaymentMethod.createdAt,
      updatedAt: localPaymentMethod.updatedAt,
    };
  }

  /**
   * Update payment method nickname
   */
  async updatePaymentMethodNickname(
    teamId: string,
    paymentMethodId: string,
    nickname: string
  ): Promise<void> {
    const updatedPaymentMethod = await prisma.paymentMethod.updateMany({
      where: {
        teamId,
        id: paymentMethodId,
      },
      data: { nickname },
    });

    if (updatedPaymentMethod.count === 0) {
      throw new Error('Payment method not found');
    }
  }
}
