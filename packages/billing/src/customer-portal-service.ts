/**
 * Customer Portal Service
 * Manages Stripe Customer Portal sessions and configuration
 */

import Stripe from 'stripe';
import { prisma } from '@wirecrest/db';
import { StripeService } from './stripe-service';

export interface CustomerPortalSessionOptions {
  teamId: string;
  returnUrl: string;
  locale?: string;
  flowData?: {
    type: 'subscription_cancel' | 'subscription_update' | 'payment_method_update';
    afterCompletion?: {
      type: 'redirect';
      redirect: {
        return_url: string;
      };
    };
    subscriptionCancel?: {
      subscription: string;
      retention?: {
        type: 'coupon';
        coupon: string;
      };
    };
    subscriptionUpdate?: {
      subscription: string;
    };
  };
}

export interface CustomerPortalConfiguration {
  businessProfile: {
    headline?: string;
    privacyPolicyUrl?: string;
    termsOfServiceUrl?: string;
  };
  features: {
    customerUpdate: {
      enabled: boolean;
      allowedUpdates: Array<'email' | 'address' | 'shipping' | 'phone' | 'tax_id'>;
    };
    invoiceHistory: {
      enabled: boolean;
    };
    paymentMethodUpdate: {
      enabled: boolean;
    };
    subscriptionCancel: {
      enabled: boolean;
      mode: 'at_period_end' | 'immediately';
      prorationBehavior: 'none' | 'create_prorations' | 'always_invoice';
      cancellationReason: {
        enabled: boolean;
        options: Array<
          | 'too_expensive'
          | 'missing_features'
          | 'switched_service'
          | 'unused'
          | 'customer_service'
          | 'too_complex'
          | 'low_quality'
          | 'other'
        >;
      };
    };
    subscriptionUpdate: {
      enabled: boolean;
      defaultAllowedUpdates: Array<'price' | 'quantity' | 'promotion_code'>;
      prorationBehavior: 'none' | 'create_prorations' | 'always_invoice';
      products?: Array<{
        product: string;
        prices: string[];
      }>;
    };
  };
}

export class CustomerPortalService {
  private stripe: Stripe;

  constructor() {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY environment variable is required');
    }

    this.stripe = StripeService.getStripeInstance()
  }

  /**
   * Create a Customer Portal session for a team
   */
  async createPortalSession(options: CustomerPortalSessionOptions): Promise<Stripe.BillingPortal.Session> {
    const { teamId, returnUrl, locale, flowData } = options;

    // Get team and ensure Stripe customer exists
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        subscription: true,
      },
    });

    if (!team) {
      throw new Error('Team not found');
    }

    if (!team.stripeCustomerId) {
      throw new Error('Team does not have a Stripe customer ID');
    }

    // Prepare session parameters
    const sessionParams: Stripe.BillingPortal.SessionCreateParams = {
      customer: team.stripeCustomerId,
      return_url: returnUrl,
    };

    // Add locale if specified
    if (locale) {
      sessionParams.locale = locale as Stripe.BillingPortal.SessionCreateParams.Locale;
    }

    // Add flow data if specified
    if (flowData) {
      sessionParams.flow_data = {
        type: flowData.type,
        after_completion: flowData.afterCompletion,
        subscription_cancel: flowData.subscriptionCancel,
        subscription_update: flowData.subscriptionUpdate,
      } as any;
    }

    // Create the portal session
    const session = await this.stripe.billingPortal.sessions.create(sessionParams);

    // Log portal access for analytics
    await this.logPortalAccess(teamId, session.id, flowData?.type);

    return session;
  }

  /**
   * Create or update Customer Portal configuration
   */
  async createOrUpdatePortalConfiguration(
    config: CustomerPortalConfiguration
  ): Promise<Stripe.BillingPortal.Configuration> {
    // Always get available products
    const availableProducts = await this.getAvailableProducts();
    
    const configParams: Stripe.BillingPortal.ConfigurationCreateParams = {
      business_profile: {
        headline: config.businessProfile.headline,
        privacy_policy_url: config.businessProfile.privacyPolicyUrl,
        terms_of_service_url: config.businessProfile.termsOfServiceUrl,
      },
      features: {
        customer_update: {
          enabled: config.features.customerUpdate.enabled,
          allowed_updates: config.features.customerUpdate.allowedUpdates,
        },
        invoice_history: {
          enabled: config.features.invoiceHistory.enabled,
        },
        payment_method_update: {
          enabled: config.features.paymentMethodUpdate.enabled,
        },
        subscription_cancel: {
          enabled: config.features.subscriptionCancel.enabled,
          mode: config.features.subscriptionCancel.mode,
          proration_behavior: config.features.subscriptionCancel.prorationBehavior,
          cancellation_reason: {
            enabled: config.features.subscriptionCancel.cancellationReason.enabled,
            options: config.features.subscriptionCancel.cancellationReason.options,
          },
        },
        subscription_update: {
          enabled: config.features.subscriptionUpdate.enabled,
          default_allowed_updates: config.features.subscriptionUpdate.defaultAllowedUpdates,
          proration_behavior: config.features.subscriptionUpdate.prorationBehavior,
          products: config.features.subscriptionUpdate.products?.length > 0 
            ? config.features.subscriptionUpdate.products 
            : availableProducts,
        },
      },
    };

    return await this.stripe.billingPortal.configurations.create(configParams);
  }

  /**
   * Get existing portal configurations
   */
  async getPortalConfigurations(): Promise<Stripe.BillingPortal.Configuration[]> {
    const configurations = await this.stripe.billingPortal.configurations.list({
      active: true,
      limit: 100,
    });

    return configurations.data;
  }

  /**
   * Update existing portal configuration
   */
  async updatePortalConfiguration(
    configurationId: string,
    updates: Partial<CustomerPortalConfiguration>
  ): Promise<Stripe.BillingPortal.Configuration> {
    const updateParams: Stripe.BillingPortal.ConfigurationUpdateParams = {};

    if (updates.businessProfile) {
      updateParams.business_profile = {
        headline: updates.businessProfile.headline,
        privacy_policy_url: updates.businessProfile.privacyPolicyUrl,
        terms_of_service_url: updates.businessProfile.termsOfServiceUrl,
      };
    }

    if (updates.features) {
      updateParams.features = {};

      if (updates.features.customerUpdate) {
        updateParams.features.customer_update = {
          enabled: updates.features.customerUpdate.enabled,
          allowed_updates: updates.features.customerUpdate.allowedUpdates,
        };
      }

      if (updates.features.invoiceHistory) {
        updateParams.features.invoice_history = {
          enabled: updates.features.invoiceHistory.enabled,
        };
      }

      if (updates.features.paymentMethodUpdate) {
        updateParams.features.payment_method_update = {
          enabled: updates.features.paymentMethodUpdate.enabled,
        };
      }

      if (updates.features.subscriptionCancel) {
        updateParams.features.subscription_cancel = {
          enabled: updates.features.subscriptionCancel.enabled,
          mode: updates.features.subscriptionCancel.mode,
          proration_behavior: updates.features.subscriptionCancel.prorationBehavior,
          cancellation_reason: {
            enabled: updates.features.subscriptionCancel.cancellationReason.enabled,
            options: updates.features.subscriptionCancel.cancellationReason.options,
          },
        };
      }

      if (updates.features.subscriptionPause) {
        updateParams.features.subscription_pause = {
          enabled: updates.features.subscriptionPause.enabled,
        };
      }

      if (updates.features.subscriptionUpdate) {
        updateParams.features.subscription_update = {
          enabled: updates.features.subscriptionUpdate.enabled,
          default_allowed_updates: updates.features.subscriptionUpdate.defaultAllowedUpdates,
          proration_behavior: updates.features.subscriptionUpdate.prorationBehavior,
          products: updates.features.subscriptionUpdate.products,
        };
      }
    }

    return await this.stripe.billingPortal.configurations.update(configurationId, updateParams);
  }

  /**
   * Create a portal session for subscription cancellation with retention offers
   */
  async createCancellationPortalSession(
    teamId: string,
    returnUrl: string,
    options: {
      retentionCouponId?: string;
      locale?: string;
    } = {}
  ): Promise<Stripe.BillingPortal.Session> {
    const { retentionCouponId, locale } = options;

    // Get team subscription
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        subscription: true,
      },
    });

    if (!team?.subscription?.stripeSubscriptionId) {
      throw new Error('No active subscription found');
    }

    const flowData: CustomerPortalSessionOptions['flowData'] = {
      type: 'subscription_cancel',
      afterCompletion: {
        type: 'redirect',
        redirect: {
          return_url: returnUrl,
        },
      },
      subscriptionCancel: {
        subscription: team.subscription.stripeSubscriptionId,
      },
    };

    // Add retention offer if provided
    if (retentionCouponId) {
      flowData.subscriptionCancel!.retention = {
        type: 'coupon',
        coupon: retentionCouponId,
      };
    }

    return await this.createPortalSession({
      teamId,
      returnUrl,
      locale,
      flowData,
    });
  }

  /**
   * Create a portal session for subscription updates
   */
  async createSubscriptionUpdatePortalSession(
    teamId: string,
    returnUrl: string,
    options: {
      locale?: string;
    } = {}
  ): Promise<Stripe.BillingPortal.Session> {
    const { locale } = options;

    // Get team subscription
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        subscription: true,
      },
    });

    if (!team?.subscription?.stripeSubscriptionId) {
      throw new Error('No active subscription found');
    }

    const flowData: CustomerPortalSessionOptions['flowData'] = {
      type: 'subscription_update',
      afterCompletion: {
        type: 'redirect',
        redirect: {
          return_url: returnUrl,
        },
      },
      subscriptionUpdate: {
        subscription: team.subscription.stripeSubscriptionId,
      },
    };

    return await this.createPortalSession({
      teamId,
      returnUrl,
      locale,
      flowData,
    });
  }

  /**
   * Create a portal session for payment method updates
   */
  async createPaymentMethodUpdatePortalSession(
    teamId: string,
    returnUrl: string,
    options: {
      locale?: string;
    } = {}
  ): Promise<Stripe.BillingPortal.Session> {
    const { locale } = options;

    const flowData: CustomerPortalSessionOptions['flowData'] = {
      type: 'payment_method_update',
      afterCompletion: {
        type: 'redirect',
        redirect: {
          return_url: returnUrl,
        },
      },
    };

    return await this.createPortalSession({
      teamId,
      returnUrl,
      locale,
      flowData,
    });
  }

  /**
   * Get default portal configuration for the application
   */
  getDefaultPortalConfiguration(): CustomerPortalConfiguration {
    return {
      businessProfile: {
        headline: 'Manage your subscription and billing',
        privacyPolicyUrl: process.env.NEXT_PUBLIC_PRIVACY_POLICY_URL,
        termsOfServiceUrl: process.env.NEXT_PUBLIC_TERMS_OF_SERVICE_URL,
      },
      features: {
        customerUpdate: {
          enabled: true,
          allowedUpdates: ['email', 'address', 'phone'],
        },
        invoiceHistory: {
          enabled: true,
        },
        paymentMethodUpdate: {
          enabled: true,
        },
        subscriptionCancel: {
          enabled: true,
          mode: 'at_period_end',
          prorationBehavior: 'none',
          cancellationReason: {
            enabled: true,
            options: [
              'too_expensive',
              'missing_features',
              'switched_service',
              'unused',
              'customer_service',
              'too_complex',
              'low_quality',
              'other',
            ],
          },
        },
        subscriptionPause: {
          enabled: false, // Can be enabled later if needed
        },
        subscriptionUpdate: {
          enabled: true,
          defaultAllowedUpdates: ['price', 'quantity', 'promotion_code'],
          prorationBehavior: 'create_prorations',
          products: [], // Will be populated dynamically with getAvailableProducts()
        },
      },
    };
  }

  /**
   * Initialize default portal configuration
   */
  async initializeDefaultPortalConfiguration(): Promise<Stripe.BillingPortal.Configuration> {
    const defaultConfig = this.getDefaultPortalConfiguration();
    return await this.createOrUpdatePortalConfiguration(defaultConfig);
  }

  /**
   * Handle portal session events (for analytics and tracking)
   */
  async handlePortalSessionEvent(
    eventType: string,
    session: Stripe.BillingPortal.Session
  ): Promise<void> {
    // Find team by customer ID
    const team = await prisma.team.findFirst({
      where: { stripeCustomerId: session.customer as string },
    });

    if (!team) {
      console.warn('Portal session event for unknown customer:', session.customer);
      return;
    }

    switch (eventType) {
      case 'customer_portal.session.created':
        await this.onPortalSessionCreated(team.id, session);
        break;
      default:
        console.log(`Unhandled portal session event: ${eventType}`);
    }
  }

  /**
   * Private helper methods
   */
  private async logPortalAccess(
    teamId: string,
    sessionId: string,
    flowType?: string
  ): Promise<void> {
    try {
      // Log to database for analytics
      // This could be expanded to track portal usage patterns
      console.log(`🏛️ Portal session created for team ${teamId}:`, {
        sessionId,
        flowType,
        timestamp: new Date().toISOString(),
      });

      // TODO: Store in analytics table if needed
      // await prisma.portalSession.create({
      //   data: {
      //     teamId,
      //     sessionId,
      //     flowType,
      //     createdAt: new Date(),
      //   },
      // });
    } catch (error) {
      console.error('Failed to log portal access:', error);
    }
  }

  private async onPortalSessionCreated(
    teamId: string,
    session: Stripe.BillingPortal.Session
  ): Promise<void> {
    console.log(`🎉 Customer portal session created for team ${teamId}`);
    
    // TODO: Analytics tracking
    // TODO: User behavior tracking
    // TODO: Send notification if needed
  }

  /**
   * Utility method to validate team access to portal
   */
  async validateTeamPortalAccess(teamId: string, userId: string): Promise<boolean> {
    const membership = await prisma.teamMember.findFirst({
      where: {
        teamId,
        userId,
        role: { in: ['OWNER', 'ADMIN'] },
      },
    });

    return !!membership;
  }

  /**
   * Get available subscription products for portal configuration
   */
  async getAvailableProducts(): Promise<Array<{
    product: string;
    prices: string[];
  }>> {
    try {
      // Get all active products
      const products = await this.stripe.products.list({
        active: true,
        type: 'service',
      });

      const productConfigs: Array<{
        product: string;
        prices: string[];
      }> = [];

      for (const product of products.data) {
        // Get prices for this product
        const prices = await this.stripe.prices.list({
          product: product.id,
          active: true,
          type: 'recurring',
        });

        if (prices.data.length > 0) {
          productConfigs.push({
            product: product.id,
            prices: prices.data.map(price => price.id),
          });
        }
      }

      return productConfigs;
    } catch (error) {
      console.error('Failed to get available products:', error);
      return [];
    }
  }

  /**
   * Get portal session URL with proper validation
   */
  async getPortalSessionUrl(
    teamId: string,
    userId: string,
    returnUrl: string,
    options: {
      flowType?: 'subscription_cancel' | 'subscription_update' | 'payment_method_update';
      locale?: string;
      retentionCouponId?: string;
    } = {}
  ): Promise<string> {
    // Validate access
    const hasAccess = await this.validateTeamPortalAccess(teamId, userId);
    if (!hasAccess) {
      throw new Error('Insufficient permissions to access billing portal');
    }

    // Ensure team has a Stripe customer ID
    const team = await prisma.team.findUnique({
      where: { id: teamId },
    });

    if (!team) {
      throw new Error('Team not found');
    }

    if (!team.stripeCustomerId) {
      // Create a Stripe customer for the team
      const customer = await this.stripe.customers.create({
        name: team.name,
        metadata: {
          teamId: team.id,
        },
      });

      // Update team with Stripe customer ID
      await prisma.team.update({
        where: { id: teamId },
        data: { stripeCustomerId: customer.id },
      });
    }

    const { flowType, locale, retentionCouponId } = options;

    // Create appropriate portal session based on flow type
    let session: Stripe.BillingPortal.Session;

    switch (flowType) {
      case 'subscription_cancel':
        session = await this.createCancellationPortalSession(teamId, returnUrl, {
          locale,
          retentionCouponId,
        });
        break;
      case 'subscription_update':
        session = await this.createSubscriptionUpdatePortalSession(teamId, returnUrl, {
          locale,
        });
        break;
      case 'payment_method_update':
        session = await this.createPaymentMethodUpdatePortalSession(teamId, returnUrl, {
          locale,
        });
        break;
      default:
        session = await this.createPortalSession({
          teamId,
          returnUrl,
          locale,
        });
    }

    return session.url;
  }
}
