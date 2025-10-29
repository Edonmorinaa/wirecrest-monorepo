import Stripe from 'stripe';
import { prisma } from '@wirecrest/db';
import { NextRequest, NextResponse } from 'next/server';
import { StripeFeatureLookupKeys } from '@wirecrest/billing';

interface CustomPlanRequest {
  planName: string;
  description?: string;
  priceCents: number;
  currency: string;
  recurringInterval: 'month' | 'year';
  features: string[]; // Stripe feature lookup keys
}

/**
 * POST /api/admin/tenants/:tenantId/custom-plan
 * 
 * Admin-only endpoint to create custom plans with specific Stripe features
 * Creates tenant-specific Stripe products with selected features attached
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id: tenantId } = params;
    const body: CustomPlanRequest = await request.json();

    // Validate request
    const validation = validateCustomPlanRequest(body);
    if (!validation.valid) {
      return NextResponse.json({
        success: false,
        error: `Invalid request: ${validation.errors.join(', ')}`
      }, { status: 400 });
    }

    // Check if tenant exists
    const tenant = await prisma.team.findUnique({
      where: { id: tenantId }
    });

    if (!tenant) {
      return NextResponse.json({
        success: false,
        error: 'Tenant not found'
      }, { status: 404 });
    }

    const stripe = getStripeInstance();

    // Create Stripe product
    const product = await stripe.products.create({
      name: body.planName,
      description: body.description || `Custom plan for ${tenant.name}`,
      metadata: {
        tenantId,
        customPlan: 'true',
      },
    });

    // Attach features to product
    const featureIds = await getFeatureIds(stripe, body.features);
    if (featureIds.length > 0) {
      await stripe.products.update(product.id, {
        features: featureIds.map(id => ({ name: `Feature ${id}`, entitlement_feature: id })),
      });
    }

    // Create price
    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: body.priceCents,
      currency: body.currency.toLowerCase(),
      recurring: {
        interval: body.recurringInterval,
      },
      metadata: {
        tenantId,
        customPrice: 'true',
      },
    });

    // Log the creation
    await logCustomPlanCreation(tenantId, {
      planName: body.planName,
      priceCents: body.priceCents,
      currency: body.currency,
      recurringInterval: body.recurringInterval,
      features: body.features,
      productId: product.id,
      priceId: price.id,
    });

    return NextResponse.json({
      success: true,
      message: 'Custom plan created successfully',
      data: {
        productId: product.id,
        priceId: price.id,
      },
    });

  } catch (error) {
    console.error('Error creating custom plan:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    }, { status: 500 });
  }
}

/**
 * GET /api/admin/tenants/:tenantId/custom-plan
 * 
 * Get custom plans for a tenant
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id: tenantId } = params;

    // Check if tenant exists
    const tenant = await prisma.team.findUnique({
      where: { id: tenantId }
    });

    if (!tenant) {
      return NextResponse.json({
        success: false,
        error: 'Tenant not found'
      }, { status: 404 });
    }

    // Get custom products for tenant from Stripe
    const stripe = getStripeInstance();
    const products = await stripe.products.list({
      limit: 100,
    });

    const customPlans = products.data
      .filter(p => p.metadata?.tenantId === tenantId && p.metadata?.customPlan === 'true')
      .map(product => ({
        productId: product.id,
        name: product.name,
        description: product.description,
        active: product.active,
        metadata: product.metadata,
      }));

    return NextResponse.json({
      success: true,
      customPlans
    });

  } catch (error) {
    console.error('Error getting custom plans:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/tenants/:tenantId/custom-plan
 * 
 * Archive a custom plan (Stripe doesn't delete products, it archives them)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id: tenantId } = params;
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('productId');

    if (!productId) {
      return NextResponse.json({
        success: false,
        error: 'productId is required'
      }, { status: 400 });
    }

    // Check if tenant exists
    const tenant = await prisma.team.findUnique({
      where: { id: tenantId }
    });

    if (!tenant) {
      return NextResponse.json({
        success: false,
        error: 'Tenant not found'
      }, { status: 404 });
    }

    // Archive the product in Stripe
    const stripe = getStripeInstance();
    await stripe.products.update(productId, {
      active: false,
    });

    // Log the deletion
    await logCustomPlanDeletion(tenantId, {
      productId,
      archivedAt: new Date().toISOString()
    });

    return NextResponse.json({
      success: true,
      message: 'Custom plan archived successfully'
    });

  } catch (error) {
    console.error('Error archiving custom plan:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}

/**
 * Validate custom plan request
 */
function validateCustomPlanRequest(request: CustomPlanRequest): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!request.planName || request.planName.trim().length === 0) {
    errors.push('planName is required');
  }

  if (!request.priceCents || request.priceCents <= 0) {
    errors.push('priceCents must be greater than 0');
  }

  if (!['usd', 'eur', 'gbp'].includes(request.currency.toLowerCase())) {
    errors.push('currency must be usd, eur, or gbp');
  }

  if (!['month', 'year'].includes(request.recurringInterval)) {
    errors.push('recurringInterval must be month or year');
  }

  if (!request.features || !Array.isArray(request.features) || request.features.length === 0) {
    errors.push('features array is required and must contain at least one feature');
  }

  // Validate that features are valid Stripe feature lookup keys
  if (request.features) {
    const validLookupKeys = Object.values(StripeFeatureLookupKeys);
    const invalidFeatures = request.features.filter(f => !validLookupKeys.includes(f as any));
    if (invalidFeatures.length > 0) {
      errors.push(`Invalid features: ${invalidFeatures.join(', ')}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Get Stripe feature IDs from lookup keys
 */
async function getFeatureIds(stripe: Stripe, lookupKeys: string[]): Promise<string[]> {
  const featureIds: string[] = [];

  // Get all features and filter by lookup key
  try {
    const allFeatures = await stripe.entitlements.features.list({
      limit: 100,
    });
    
    for (const lookupKey of lookupKeys) {
      const feature = allFeatures.data.find((f) => f.lookup_key === lookupKey);
      if (feature) {
        featureIds.push(feature.id);
      } else {
        console.warn(`Feature not found for lookup key: ${lookupKey}`);
      }
    }
  } catch (error) {
    console.error('Error getting feature IDs:', error);
  }

  return featureIds;
}

/**
 * Get Stripe instance
 */
function getStripeInstance(): Stripe {
  const { StripeService } = require('@wirecrest/billing');
  return StripeService.getStripeInstance();
}

/**
 * Log custom plan creation
 */
async function logCustomPlanCreation(
  tenantId: string,
  metadata: Record<string, any>
): Promise<void> {
  console.log(`Custom plan created for tenant ${tenantId}:`, metadata);
  
  // Implement audit logging
  // await prisma.auditLog.create({
  //   data: {
  //     tenantId,
  //     eventType: 'custom_plan_created',
  //     metadata,
  //     timestamp: new Date()
  //   }
  // });
}

/**
 * Log custom plan deletion
 */
async function logCustomPlanDeletion(
  tenantId: string,
  metadata: Record<string, any>
): Promise<void> {
  console.log(`Custom plan deleted for tenant ${tenantId}:`, metadata);
  
  // Implement audit logging
  // await prisma.auditLog.create({
  //   data: {
  //     tenantId,
  //     eventType: 'custom_plan_deleted',
  //     metadata,
  //     timestamp: new Date()
  //   }
  // });
}
