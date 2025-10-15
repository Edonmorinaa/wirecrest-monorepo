/**
 * Invoice Service
 * Handles invoice-related operations using Stripe's native invoice system
 */

import Stripe from 'stripe';
import { StripeServiceOption } from './types';
import { StripeService } from './stripe-service';

// Use Stripe types directly - no custom interfaces needed

export class InvoiceService {
  private stripe: Stripe;

  constructor() {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY environment variable is required');
    }

    this.stripe = StripeService.getStripeInstance();
  }

  /**
   * Fetch all active products from Stripe
   */
  async getProducts(): Promise<Stripe.Product[]> {
    const products = await this.stripe.products.list({
      active: true,
      limit: 100,
      expand: ['data.default_price'],
    });

    return products.data;
  }

  /**
   * Fetch all active prices from Stripe
   */
  async getPrices(): Promise<Stripe.Price[]> {
    const prices = await this.stripe.prices.list({
      active: true,
      limit: 100,
      expand: ['data.product'],
    });

    return prices.data;
  }

  /**
   * Fetch all active tax rates from Stripe
   */
  async getTaxRates(): Promise<Stripe.TaxRate[]> {
    const taxRates = await this.stripe.taxRates.list({
      active: true,
      limit: 100,
    });

    return taxRates.data;
  }

  /**
   * Get service options for invoice forms
   */
  async getServiceOptions(): Promise<Array<StripeServiceOption>> {
    const [products, prices] = await Promise.all([
      this.getProducts(),
      this.getPrices(),
    ]);

    console.log('🔍 InvoiceService - Products found:', products.length);
    console.log('🔍 InvoiceService - Prices found:', prices.length);

    const serviceOptions: Array<StripeServiceOption> = [];

    for (const product of products) {
      // Find the default price for this product, or fall back to any price for this product
      let selectedPrice: Stripe.Price | undefined;
      
      if (product.default_price) {
        // Use the default price if it exists and is not recurring
        const defaultPriceId = typeof product.default_price === 'string' 
          ? product.default_price 
          : product.default_price.id;
        
        selectedPrice = prices.find(price => 
          price.id === defaultPriceId && 
          !price.recurring // Exclude recurring/subscription prices
        );
      } else {
        // If no default price, find any active one-time price for this product
        selectedPrice = prices.find(price => 
          price.product === product.id && 
          price.active && 
          price.unit_amount &&
          !price.recurring // Exclude recurring/subscription prices
        );
      }
      
      if (selectedPrice && selectedPrice.unit_amount) {
        const serviceOption: StripeServiceOption = {
          product,
          price: selectedPrice,
        };
        serviceOptions.push(serviceOption);
      }
    }

    console.log('🔍 InvoiceService - Final service options:', serviceOptions.length);
    return serviceOptions;
  }

  /**
   * Get all invoice-related data from Stripe
   */
  async getAllInvoiceData() {
    const [products, prices, taxRates, serviceOptions] = await Promise.all([
      this.getProducts(),
      this.getPrices(),
      this.getTaxRates(),
      this.getServiceOptions(),
    ]);

    return {
      products,
      prices,
      taxRates,
      serviceOptions,
    };
  }

  /**
   * Create a Stripe invoice
   */
  public async createInvoice(data: Stripe.InvoiceCreateParams, items: Stripe.InvoiceItemCreateParams[]): Promise<Stripe.Invoice> {
    try {
      // Create the invoice
      const invoice = await this.stripe.invoices.create(data);

      // Add line items
      for (const item of items) {
        await this.stripe.invoiceItems.create(item);
      }

      return invoice;
    } catch (error) {
      console.error('Failed to create Stripe invoice:', error);
      throw error;
    }
  }

  /**
   * Update a Stripe invoice
   */
  async updateInvoice(invoiceId: string, data: Stripe.InvoiceUpdateParams): Promise<Stripe.Invoice> {
    try {
      return await this.stripe.invoices.update(invoiceId, data);
    } catch (error) {
      console.error('Failed to update Stripe invoice:', error);
      throw error;
    }
  }

  /**
   * Retrieve a Stripe invoice
   */
  async getInvoice(invoiceId: string): Promise<Stripe.Invoice> {
    try {
      return await this.stripe.invoices.retrieve(invoiceId, {
        expand: ['customer', 'payment_intent', 'subscription'],
      });
    } catch (error) {
      console.error('Failed to retrieve Stripe invoice:', error);
      throw error;
    }
  }

  /**
   * List Stripe invoices
   */
  async listInvoices(params?: Stripe.InvoiceListParams): Promise<Stripe.ApiList<Stripe.Invoice>> {
    try {
      return await this.stripe.invoices.list({
        ...params,
        expand: ['data.customer', 'data.payment_intent', 'data.subscription'],
      });
    } catch (error) {
      console.error('Failed to list Stripe invoices:', error);
      throw error;
    }
  }

  /**
   * Finalize a Stripe invoice
   */
  async finalizeInvoice(invoiceId: string): Promise<Stripe.Invoice> {
    try {
      return await this.stripe.invoices.finalizeInvoice(invoiceId);
    } catch (error) {
      console.error('Failed to finalize Stripe invoice:', error);
      throw error;
    }
  }

  /**
   * Send a Stripe invoice
   */
  async sendInvoice(invoiceId: string): Promise<Stripe.Invoice> {
    try {
      return await this.stripe.invoices.sendInvoice(invoiceId);
    } catch (error) {
      console.error('Failed to send Stripe invoice:', error);
      throw error;
    }
  }

  /**
   * Pay a Stripe invoice
   */
  async payInvoice(invoiceId: string, paymentMethod?: string): Promise<Stripe.Invoice> {
    try {
      const params: Stripe.InvoicePayParams = {};
      if (paymentMethod) {
        params.payment_method = paymentMethod;
      }
      return await this.stripe.invoices.pay(invoiceId, params);
    } catch (error) {
      console.error('Failed to pay Stripe invoice:', error);
      throw error;
    }
  }

  /**
   * Void a Stripe invoice
   */
  async voidInvoice(invoiceId: string): Promise<Stripe.Invoice> {
    try {
      return await this.stripe.invoices.voidInvoice(invoiceId);
    } catch (error) {
      console.error('Failed to void Stripe invoice:', error);
      throw error;
    }
  }

  /**
   * Delete a draft Stripe invoice
   */
  async deleteInvoice(invoiceId: string): Promise<Stripe.DeletedInvoice> {
    try {
      return await this.stripe.invoices.del(invoiceId);
    } catch (error) {
      console.error('Failed to delete Stripe invoice:', error);
      throw error;
    }
  }

  /**
   * Mark an invoice as uncollectible
   */
  async markUncollectible(invoiceId: string): Promise<Stripe.Invoice> {
    try {
      return await this.stripe.invoices.markUncollectible(invoiceId);
    } catch (error) {
      console.error('Failed to mark invoice as uncollectible:', error);
      throw error;
    }
  }

  /**
   * Search Stripe invoices
   */
  async searchInvoices(params: Stripe.InvoiceSearchParams): Promise<Stripe.Invoice[]> {
    try {
      const result = await this.stripe.invoices.search({
        ...params,
        expand: ['data.customer', 'data.payment_intent', 'data.subscription'],
      });
      return result.data;
    } catch (error) {
      console.error('Failed to search Stripe invoices:', error);
      throw error;
    }
  }

  /**
   * Return Stripe invoice data as-is without transformation
   */
  transformInvoiceForUI(stripeInvoice: Stripe.Invoice) {
    return stripeInvoice;
  }
}