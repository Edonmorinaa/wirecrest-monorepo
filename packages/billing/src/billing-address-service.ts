/**
 * Billing Address Service
 * Manages billing addresses for teams with Stripe integration
 */

import Stripe from 'stripe';
import { prisma } from '@wirecrest/db';
import type { BillingAddressData } from './types';
import { StripeService } from './stripe-service';

export class BillingAddressService {
  private stripe: Stripe;

  constructor() {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY environment variable is required');
    }

    this.stripe = StripeService.getStripeInstance();
  }

  /**
   * Create or update billing address for a team
   */
  async upsertBillingAddress(
    teamId: string,
    addressData: Omit<BillingAddressData, 'id' | 'teamId' | 'createdAt' | 'updatedAt' | 'isDefault'>
  ): Promise<BillingAddressData> {
    // Get team and ensure Stripe customer exists
    const team = await prisma.team.findUnique({
      where: { id: teamId },
    });

    if (!team) {
      throw new Error('Team not found');
    }

    // Create or get Stripe customer
    let stripeCustomerId = team.stripeCustomerId;
    if (!stripeCustomerId) {
      const customer = await this.createStripeCustomer(teamId);
      stripeCustomerId = customer.id;
    }

    // Update Stripe customer with billing address
    await this.stripe.customers.update(stripeCustomerId, {
      address: {
        line1: addressData.line1,
        line2: addressData.line2 || undefined,
        city: addressData.city,
        state: addressData.state || undefined,
        postal_code: addressData.postalCode,
        country: addressData.country,
      },
      name: addressData.name || undefined,
    });

    // Update local database
    // First check if address exists
    const existingAddress = await prisma.billingAddress.findFirst({
      where: { teamId },
    });

    let billingAddress;
    if (existingAddress) {
      // Update existing address
      billingAddress = await prisma.billingAddress.update({
        where: { id: existingAddress.id },
        data: {
          name: addressData.name,
          line1: addressData.line1,
          line2: addressData.line2,
          city: addressData.city,
          state: addressData.state,
          postalCode: addressData.postalCode,
          country: addressData.country,
        },
      });
    } else {
      // Create new address
      billingAddress = await prisma.billingAddress.create({
        data: {
          teamId,
          name: addressData.name,
          line1: addressData.line1,
          line2: addressData.line2,
          city: addressData.city,
          state: addressData.state,
          postalCode: addressData.postalCode,
          country: addressData.country,
          isDefault: true, // First address is always default
        },
      });
    }

    return this.transformBillingAddressForUI(billingAddress);
  }

  /**
   * Get billing address for a team
   */
  async getBillingAddress(teamId: string): Promise<BillingAddressData | null> {
    const billingAddress = await prisma.billingAddress.findFirst({
      where: { teamId },
    });

    if (!billingAddress) {
      return null;
    }

    return this.transformBillingAddressForUI(billingAddress);
  }

  /**
   * Get billing address from Stripe customer
   */
  async getBillingAddressFromStripe(teamId: string): Promise<Stripe.Address | null> {
    const team = await prisma.team.findUnique({
      where: { id: teamId },
    });

    if (!team?.stripeCustomerId) {
      return null;
    }

    try {
      const customer = await this.stripe.customers.retrieve(team.stripeCustomerId);
      
      if (customer.deleted) {
        return null;
      }

      return (customer as Stripe.Customer).address;
    } catch (error) {
      console.error('Failed to retrieve customer from Stripe:', error);
      return null;
    }
  }

  /**
   * Sync billing address from Stripe to local database
   */
  async syncBillingAddressFromStripe(teamId: string): Promise<BillingAddressData | null> {
    const stripeAddress = await this.getBillingAddressFromStripe(teamId);
    
    if (!stripeAddress) {
      return null;
    }

    const team = await prisma.team.findUnique({
      where: { id: teamId },
    });

    if (!team?.stripeCustomerId) {
      return null;
    }

    // Get customer name from Stripe
    const customer = await this.stripe.customers.retrieve(team.stripeCustomerId);
    const customerName = customer.deleted ? null : (customer as Stripe.Customer).name;

    // Update local database with Stripe data
    // First check if address exists
    const existingAddress = await prisma.billingAddress.findFirst({
      where: { teamId },
    });

    let billingAddress;
    if (existingAddress) {
      // Update existing address
      billingAddress = await prisma.billingAddress.update({
        where: { id: existingAddress.id },
        data: {
          name: customerName,
          line1: stripeAddress.line1 || '',
          line2: stripeAddress.line2,
          city: stripeAddress.city || '',
          state: stripeAddress.state,
          postalCode: stripeAddress.postal_code || '',
          country: stripeAddress.country || '',
        },
      });
    } else {
      // Create new address
      billingAddress = await prisma.billingAddress.create({
        data: {
          teamId,
          name: customerName,
          line1: stripeAddress.line1 || '',
          line2: stripeAddress.line2,
          city: stripeAddress.city || '',
          state: stripeAddress.state,
          postalCode: stripeAddress.postal_code || '',
          country: stripeAddress.country || '',
          isDefault: true,
        },
      });
    }

    return this.transformBillingAddressForUI(billingAddress);
  }

  /**
   * Delete billing address
   */
  async deleteBillingAddress(teamId: string): Promise<{ success: boolean }> {
    const team = await prisma.team.findUnique({
      where: { id: teamId },
    });

    if (!team) {
      throw new Error('Team not found');
    }

    // Clear address from Stripe customer
    if (team.stripeCustomerId) {
      try {
        await this.stripe.customers.update(team.stripeCustomerId, {
          address: null,
        });
      } catch (error) {
        console.warn('Failed to clear address from Stripe customer:', error);
      }
    }

    // Delete from local database
    await prisma.billingAddress.deleteMany({
      where: { teamId },
    });

    return { success: true };
  }

  /**
   * Validate billing address format
   */
  validateBillingAddress(addressData: Partial<BillingAddressData>): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!addressData.line1?.trim()) {
      errors.push('Address line 1 is required');
    }

    if (!addressData.city?.trim()) {
      errors.push('City is required');
    }

    if (!addressData.postalCode?.trim()) {
      errors.push('Postal code is required');
    }

    if (!addressData.country?.trim()) {
      errors.push('Country is required');
    }

    // Validate country code (ISO 3166-1 alpha-2)
    if (addressData.country && addressData.country.length !== 2) {
      errors.push('Country must be a valid 2-letter country code');
    }

    // Validate postal code format for specific countries
    if (addressData.country && addressData.postalCode) {
      const postalCodeValidation = this.validatePostalCode(
        addressData.postalCode,
        addressData.country
      );
      if (!postalCodeValidation.isValid) {
        errors.push(postalCodeValidation.error || 'Invalid postal code format');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Get supported countries for billing
   */
  getSupportedCountries(): Array<{ code: string; name: string }> {
    return [
      { code: 'US', name: 'United States' },
      { code: 'CA', name: 'Canada' },
      { code: 'GB', name: 'United Kingdom' },
      { code: 'AU', name: 'Australia' },
      { code: 'DE', name: 'Germany' },
      { code: 'FR', name: 'France' },
      { code: 'IT', name: 'Italy' },
      { code: 'ES', name: 'Spain' },
      { code: 'NL', name: 'Netherlands' },
      { code: 'BE', name: 'Belgium' },
      { code: 'CH', name: 'Switzerland' },
      { code: 'AT', name: 'Austria' },
      { code: 'SE', name: 'Sweden' },
      { code: 'NO', name: 'Norway' },
      { code: 'DK', name: 'Denmark' },
      { code: 'FI', name: 'Finland' },
      { code: 'IE', name: 'Ireland' },
      { code: 'PT', name: 'Portugal' },
      { code: 'LU', name: 'Luxembourg' },
      { code: 'JP', name: 'Japan' },
      { code: 'SG', name: 'Singapore' },
      { code: 'HK', name: 'Hong Kong' },
      { code: 'NZ', name: 'New Zealand' },
    ];
  }

  /**
   * Private helper methods
   */
  private async createStripeCustomer(teamId: string): Promise<Stripe.Customer> {
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

    const owner = team.members[0]?.user;
    const customer = await this.stripe.customers.create({
      email: owner?.email || `team-${teamId}@example.com`,
      name: owner?.name || team.name,
      metadata: {
        teamId,
      },
    });

    // Update team with customer ID
    await prisma.team.update({
      where: { id: teamId },
      data: { stripeCustomerId: customer.id },
    });

    return customer;
  }

  private transformBillingAddressForUI(billingAddress: {
    id: string;
    teamId: string;
    name: string | null;
    line1: string;
    line2: string | null;
    city: string;
    state: string | null;
    postalCode: string;
    country: string;
    isDefault: boolean;
    createdAt: Date;
    updatedAt: Date;
  }): BillingAddressData {
    return {
      id: billingAddress.id,
      teamId: billingAddress.teamId,
      name: billingAddress.name,
      line1: billingAddress.line1,
      line2: billingAddress.line2,
      city: billingAddress.city,
      state: billingAddress.state,
      postalCode: billingAddress.postalCode,
      country: billingAddress.country,
      isDefault: billingAddress.isDefault,
      createdAt: billingAddress.createdAt,
      updatedAt: billingAddress.updatedAt,
    };
  }

  private validatePostalCode(postalCode: string, countryCode: string): {
    isValid: boolean;
    error?: string;
  } {
    const patterns: Record<string, RegExp> = {
      US: /^\d{5}(-\d{4})?$/, // 12345 or 12345-6789
      CA: /^[A-Z]\d[A-Z] \d[A-Z]\d$/, // A1A 1A1
      GB: /^[A-Z]{1,2}\d[A-Z\d]? \d[A-Z]{2}$/, // SW1A 1AA
      DE: /^\d{5}$/, // 12345
      FR: /^\d{5}$/, // 12345
      IT: /^\d{5}$/, // 12345
      ES: /^\d{5}$/, // 12345
      NL: /^\d{4} [A-Z]{2}$/, // 1234 AB
      BE: /^\d{4}$/, // 1234
      CH: /^\d{4}$/, // 1234
      AT: /^\d{4}$/, // 1234
      AU: /^\d{4}$/, // 1234
      JP: /^\d{3}-\d{4}$/, // 123-4567
      SG: /^\d{6}$/, // 123456
      HK: /^[A-Z]{3} \d{3}$/, // ABC 123
    };

    const pattern = patterns[countryCode.toUpperCase()];
    if (!pattern) {
      return { isValid: true }; // Allow unknown countries
    }

    const isValid = pattern.test(postalCode.toUpperCase());
    return {
      isValid,
      error: isValid ? undefined : `Invalid postal code format for ${countryCode}`,
    };
  }
}
