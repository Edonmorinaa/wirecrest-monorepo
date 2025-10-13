/**
 * Tax Service
 * Handles tax calculation, compliance, and reporting using Stripe Tax
 */

import Stripe from 'stripe';
import { prisma } from '@wirecrest/db';

export interface TaxCalculationRequest {
  customerId: string;
  lineItems: Array<{
    amount: number; // in cents
    reference?: string;
    taxBehavior?: 'inclusive' | 'exclusive';
    taxCode?: string;
  }>;
  customerDetails?: {
    address?: Stripe.Address;
    taxIds?: Array<{
      type: Stripe.TaxId.Type;
      value: string;
    }>;
  };
  currency: string;
  expand?: string[];
}

export interface TaxCalculationResult {
  amountTotal: number;
  amountSubtotal: number;
  amountTax: number;
  taxBreakdown: Array<{
    jurisdiction: string;
    rate: number;
    amount: number;
    taxType: string;
  }>;
  lineItems: Array<{
    amount: number;
    amountTax: number;
    reference?: string;
  }>;
}

export interface TaxRegistration {
  country: string;
  state?: string;
  type: 'standard' | 'oss' | 'ioss' | 'simplified';
  status: 'active' | 'pending' | 'inactive';
  registrationNumber?: string;
  effectiveDate?: Date;
  expirationDate?: Date;
}

export interface TaxSettings {
  defaultTaxBehavior: 'inclusive' | 'exclusive';
  automaticTax: boolean;
  taxIdCollection: boolean;
  defaultTaxCode?: string;
  headOfficeLocation?: {
    country: string;
    state?: string;
  };
}

export class TaxService {
  private stripe: Stripe;

  constructor() {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY environment variable is required');
    }

    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2023-10-16',
      typescript: true,
    });
  }

  /**
   * Calculate tax for a transaction
   */
  async calculateTax(request: TaxCalculationRequest): Promise<TaxCalculationResult> {
    const { customerId, lineItems, customerDetails, currency, expand } = request;

    // Prepare line items for Stripe Tax
    const stripeLineItems: Stripe.Tax.CalculationCreateParams.LineItem[] = lineItems.map(item => ({
      amount: item.amount,
      reference: item.reference,
      tax_behavior: item.taxBehavior || 'exclusive',
      tax_code: item.taxCode || 'txcd_10000000', // General - Tangible Goods
    }));

    // Prepare calculation parameters
    const calculationParams: Stripe.Tax.CalculationCreateParams = {
      currency,
      line_items: stripeLineItems,
      customer_details: {
        address: customerDetails?.address,
        address_source: customerDetails?.address ? 'billing' : undefined,
        tax_ids: customerDetails?.taxIds?.map(taxId => ({
          type: taxId.type as any,
          value: taxId.value,
        })),
      },
      expand: expand || ['line_items'],
    };

    // If customer ID is provided, get customer details from Stripe
    if (customerId) {
      try {
        const customer = await this.stripe.customers.retrieve(customerId);
        if (!customer.deleted) {
          calculationParams.customer = customerId;
          // Use customer's address if not provided in request
          if (!customerDetails?.address && (customer as Stripe.Customer).address) {
            calculationParams.customer_details!.address = (customer as Stripe.Customer).address;
          }
        }
      } catch (error) {
        console.warn('Failed to retrieve customer for tax calculation:', error);
      }
    }

    // Calculate tax
    const calculation = await this.stripe.tax.calculations.create(calculationParams);

    // Transform result
    const taxBreakdown = calculation.tax_breakdown?.map(breakdown => ({
      jurisdiction: `${(breakdown as any).jurisdiction?.country || 'unknown'}${(breakdown as any).jurisdiction?.state ? `-${(breakdown as any).jurisdiction.state}` : ''}`,
      rate: Number((breakdown as any).tax_rate_details?.percentage_decimal) || 0,
      amount: (breakdown as any).tax_amount || 0,
      taxType: (breakdown as any).tax_rate_details?.tax_type || 'unknown',
    })) || [];

    const lineItemsResult = calculation.line_items?.data.map(item => ({
      amount: item.amount,
      amountTax: item.amount_tax,
      reference: item.reference,
    })) || [];

    return {
      amountTotal: calculation.amount_total,
      amountSubtotal: calculation.amount_total - ((calculation as any).amount_tax || 0), // Calculate subtotal
      amountTax: (calculation as any).amount_tax || 0,
      taxBreakdown,
      lineItems: lineItemsResult,
    };
  }

  /**
   * Create a tax transaction for reporting
   */
  async createTaxTransaction(
    calculationId: string,
    reference: string,
    metadata?: Record<string, string>
  ): Promise<Stripe.Tax.Transaction> {
    return await this.stripe.tax.transactions.createFromCalculation({
      calculation: calculationId,
      reference,
      metadata,
    });
  }

  /**
   * Reverse a tax transaction
   */
  async reverseTaxTransaction(
    transactionId: string,
    options: {
      mode: 'full' | 'partial';
      reference: string;
      lineItems?: Array<{
        originalLineItem: string;
        quantity?: number;
        amount?: number;
      }>;
      metadata?: Record<string, string>;
    }
  ): Promise<Stripe.Tax.Transaction> {
    const { mode, reference, lineItems, metadata } = options;

    const reverseParams: Stripe.Tax.TransactionCreateReversalParams = {
      original_transaction: transactionId,
      mode,
      reference,
      metadata,
    };

    if (mode === 'partial' && lineItems) {
      reverseParams.line_items = lineItems.map(item => ({
        original_line_item: item.originalLineItem,
        quantity: item.quantity,
        amount: item.amount,
        amount_tax: 0, // Required field
        reference: item.originalLineItem, // Required field
      }));
    }

    return await this.stripe.tax.transactions.createReversal(reverseParams);
  }

  /**
   * Get tax registrations
   */
  async getTaxRegistrations(): Promise<TaxRegistration[]> {
    const registrations = await this.stripe.tax.registrations.list({
      limit: 100,
    });

    return registrations.data.map(reg => ({
      country: reg.country,
      state: (reg.country_options as any)?.us?.state || (reg.country_options as any)?.ca?.province,
      type: 'standard', // Simplified for now
      status: reg.active_from && new Date(reg.active_from * 1000) <= new Date() ? 'active' : 'pending',
      registrationNumber: (reg.country_options as any)?.us?.state_tax_id || 
                         (reg.country_options as any)?.ca?.province_tax_id ||
                         (reg.country_options as any)?.gb?.vat_id,
      effectiveDate: reg.active_from ? new Date(reg.active_from * 1000) : undefined,
      expirationDate: reg.expires_at ? new Date(reg.expires_at * 1000) : undefined,
    }));
  }

  /**
   * Create a tax registration
   */
  async createTaxRegistration(
    country: string,
    options: {
      state?: string;
      type?: 'standard' | 'oss' | 'ioss' | 'simplified';
      activeFrom?: Date;
      expiresAt?: Date;
    } = {}
  ): Promise<Stripe.Tax.Registration> {
    const { state, activeFrom, expiresAt } = options;

    const registrationParams: Stripe.Tax.RegistrationCreateParams = {
      country: country.toUpperCase() as any,
      active_from: activeFrom ? Math.floor(activeFrom.getTime() / 1000) : 'now',
      country_options: {}, // Required field
    };

    // Add country-specific options (simplified)
    if (country.toUpperCase() === 'US' && state) {
      registrationParams.country_options = {
        us: {
          type: 'state_sales_tax' as any,
          state: state.toUpperCase() as any,
        },
      };
    } else if (country.toUpperCase() === 'CA' && state) {
      registrationParams.country_options = {
        ca: {
          type: 'provincial_sales_tax' as any,
        },
      };
    } else if (country.toUpperCase() === 'GB') {
      registrationParams.country_options = {
        gb: {
          type: 'vat' as any,
        },
      };
    }

    if (expiresAt) {
      registrationParams.expires_at = Math.floor(expiresAt.getTime() / 1000);
    }

    return await this.stripe.tax.registrations.create(registrationParams);
  }

  /**
   * Update tax registration
   */
  async updateTaxRegistration(
    registrationId: string,
    updates: {
      activeFrom?: Date;
      expiresAt?: Date;
    }
  ): Promise<Stripe.Tax.Registration> {
    const updateParams: Stripe.Tax.RegistrationUpdateParams = {};

    if (updates.activeFrom) {
      updateParams.active_from = Math.floor(updates.activeFrom.getTime() / 1000);
    }

    if (updates.expiresAt) {
      updateParams.expires_at = Math.floor(updates.expiresAt.getTime() / 1000);
    }

    return await this.stripe.tax.registrations.update(registrationId, updateParams);
  }

  /**
   * Get tax settings for the account
   */
  async getTaxSettings(): Promise<TaxSettings> {
    // Note: Stripe doesn't have a direct API for tax settings
    // This would typically be configured in the Stripe Dashboard
    // We return default settings here
    return {
      defaultTaxBehavior: 'exclusive',
      automaticTax: true,
      taxIdCollection: true,
      defaultTaxCode: 'txcd_10000000', // General - Tangible Goods
      headOfficeLocation: {
        country: 'US',
        state: 'CA',
      },
    };
  }

  /**
   * Validate tax ID
   */
  async validateTaxId(
    type: Stripe.TaxId.Type,
    value: string,
    country?: string
  ): Promise<{
    valid: boolean;
    error?: string;
    details?: {
      country: string;
      type: string;
      value: string;
    };
  }> {
    try {
      // Create a temporary customer to validate the tax ID
      const tempCustomer = await this.stripe.customers.create({
        email: 'temp@example.com',
      });

      try {
        const taxId = await this.stripe.customers.createTaxId(tempCustomer.id, {
          type: type as any,
          value,
        });

        // Clean up
        await this.stripe.customers.del(tempCustomer.id);

        return {
          valid: true,
          details: {
            country: taxId.country || country || 'unknown',
            type: taxId.type,
            value: taxId.value,
          },
        };
      } catch (taxIdError: any) {
        // Clean up
        await this.stripe.customers.del(tempCustomer.id);

        return {
          valid: false,
          error: taxIdError.message || 'Invalid tax ID',
        };
      }
    } catch (error: any) {
      return {
        valid: false,
        error: error.message || 'Failed to validate tax ID',
      };
    }
  }

  /**
   * Add tax ID to customer
   */
  async addCustomerTaxId(
    customerId: string,
    type: string,
    value: string
  ): Promise<Stripe.TaxId> {
    return await this.stripe.customers.createTaxId(customerId, {
      type: type as any,
      value,
    });
  }

  /**
   * Remove tax ID from customer
   */
  async removeCustomerTaxId(customerId: string, taxIdId: string): Promise<any> {
    return await this.stripe.customers.deleteTaxId(customerId, taxIdId);
  }

  /**
   * Get customer tax IDs
   */
  async getCustomerTaxIds(customerId: string): Promise<Stripe.TaxId[]> {
    const taxIds = await this.stripe.customers.listTaxIds(customerId, {
      limit: 100,
    });

    return taxIds.data;
  }

  /**
   * Calculate tax for subscription creation
   */
  async calculateSubscriptionTax(
    customerId: string,
    priceId: string,
    quantity: number = 1,
    customerAddress?: Stripe.Address
  ): Promise<TaxCalculationResult> {
    // Get price details
    const price = await this.stripe.prices.retrieve(priceId);
    const amount = (price.unit_amount || 0) * quantity;

    return await this.calculateTax({
      customerId,
      lineItems: [
        {
          amount,
          reference: `subscription_${priceId}`,
          taxBehavior: 'exclusive',
          taxCode: 'txcd_10103001', // Software as a Service
        },
      ],
      customerDetails: {
        address: customerAddress,
      },
      currency: price.currency,
    });
  }

  /**
   * Get tax rates for a location
   */
  async getTaxRatesForLocation(
    country: string,
    state?: string,
    city?: string,
    postalCode?: string
  ): Promise<Array<{
    jurisdiction: string;
    rate: number;
    type: string;
  }>> {
    // Create a minimal calculation to get tax rates
    const calculation = await this.stripe.tax.calculations.create({
      currency: 'usd',
      line_items: [
        {
          amount: 1000, // $10.00
          tax_behavior: 'exclusive',
          tax_code: 'txcd_10000000',
        },
      ],
      customer_details: {
        address: {
          country,
          state,
          city,
          postal_code: postalCode,
          line1: '123 Main St', // Required for calculation
        },
        address_source: 'billing',
      },
    });

    return calculation.tax_breakdown?.map(breakdown => ({
      jurisdiction: `${(breakdown as any).jurisdiction?.country || 'unknown'}${(breakdown as any).jurisdiction?.state ? `-${(breakdown as any).jurisdiction.state}` : ''}`,
      rate: Number((breakdown as any).tax_rate_details?.percentage_decimal) || 0,
      type: (breakdown as any).tax_rate_details?.tax_type || 'unknown',
    })) || [];
  }

  /**
   * Handle tax-related webhook events
   */
  async handleTaxWebhookEvent(
    eventType: string,
    eventData: any
  ): Promise<void> {
    switch (eventType) {
      case 'tax.registration.created':
        await this.onTaxRegistrationCreated(eventData);
        break;
      case 'tax.registration.updated':
        await this.onTaxRegistrationUpdated(eventData);
        break;
      default:
        console.log(`Unhandled tax webhook event: ${eventType}`);
    }
  }

  /**
   * Private webhook handlers
   */
  private async onTaxRegistrationCreated(registration: Stripe.Tax.Registration): Promise<void> {
    console.log(`🏛️ Tax registration created for ${registration.country}`);
    
    // TODO: Send notification to admin
    // TODO: Update internal compliance tracking
    // TODO: Analytics tracking
  }

  private async onTaxRegistrationUpdated(registration: Stripe.Tax.Registration): Promise<void> {
    console.log(`🔄 Tax registration updated for ${registration.country}`);
    
    // TODO: Send notification if status changed
    // TODO: Update internal compliance tracking
  }

  /**
   * Get tax compliance summary
   */
  async getTaxComplianceSummary(): Promise<{
    registrations: TaxRegistration[];
    totalTransactions: number;
    totalTaxCollected: number;
    complianceStatus: 'compliant' | 'needs_attention' | 'non_compliant';
    recommendations: string[];
  }> {
    const registrations = await this.getTaxRegistrations();
    
    // This would typically query your transaction history
    // For now, we'll return a basic summary
    const totalTransactions = 0; // TODO: Implement transaction counting
    const totalTaxCollected = 0; // TODO: Implement tax collection tracking

    const activeRegistrations = registrations.filter(reg => reg.status === 'active');
    const complianceStatus = activeRegistrations.length > 0 ? 'compliant' : 'needs_attention';

    const recommendations: string[] = [];
    if (activeRegistrations.length === 0) {
      recommendations.push('Consider registering for tax collection in your primary markets');
    }
    if (!registrations.some(reg => reg.country === 'US')) {
      recommendations.push('Consider US tax registration if you have US customers');
    }
    if (!registrations.some(reg => reg.country === 'GB' || reg.type === 'oss')) {
      recommendations.push('Consider EU tax registration if you have European customers');
    }

    return {
      registrations,
      totalTransactions,
      totalTaxCollected,
      complianceStatus,
      recommendations,
    };
  }

  /**
   * Generate tax report for a period
   */
  async generateTaxReport(
    startDate: Date,
    endDate: Date,
    options: {
      country?: string;
      state?: string;
      format?: 'summary' | 'detailed';
    } = {}
  ): Promise<{
    period: { start: Date; end: Date };
    summary: {
      totalSales: number;
      totalTax: number;
      transactionCount: number;
    };
    breakdown: Array<{
      jurisdiction: string;
      sales: number;
      tax: number;
      rate: number;
      transactionCount: number;
    }>;
  }> {
    // This would typically query your transaction history
    // For now, we'll return a basic structure
    return {
      period: { start: startDate, end: endDate },
      summary: {
        totalSales: 0,
        totalTax: 0,
        transactionCount: 0,
      },
      breakdown: [],
    };
  }
}
