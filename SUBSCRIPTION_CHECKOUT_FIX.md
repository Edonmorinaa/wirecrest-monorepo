# Subscription Checkout Fix

## Problem
When creating a new subscription for the first time on the billing page, the page was reloading and creating an invoice instead of redirecting to a payment portal. The subscription was not being properly activated with payment.

## Root Cause
The `AccountBillingPlan` component was calling `createTeamSubscription` which created an incomplete subscription with `payment_behavior: 'default_incomplete'`, but then tried to redirect to a Customer Portal with `flowType: 'payment_method_update'`. This flow is incorrect for new subscription creation that requires immediate payment.

## Solution
Implemented Stripe Checkout integration for new subscription creation:

### 1. Updated AccountBillingPlan Component
**File**: `apps/dashboard/src/sections/account/account-billing-plan.jsx`

- Changed the flow for Free tier teams creating a new subscription
- Instead of using Customer Portal, now creates a Stripe Checkout session
- Redirects user to Stripe Checkout for secure payment
- Falls back to Customer Portal if checkout creation fails

**Key Changes**:
```javascript
if (isFreeTier) {
  // For Free tier teams, create a new subscription
  const result = await createTeamSubscription(teamId, {
    priceId: planConfig.stripePriceId,
    paymentMethodId: selectedCard?.stripePaymentMethodId,
  });

  if (result.requiresPaymentConfirmation && result.subscription) {
    // Create a checkout session for payment
    const response = await fetch('/api/billing/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        teamId,
        priceId: planConfig.stripePriceId,
        successUrl: `${window.location.origin}/user/account/billing?success=true`,
        cancelUrl: `${window.location.origin}/user/account/billing?canceled=true`,
      }),
    });

    const { url } = await response.json();
    if (url) {
      window.location.href = url;
      return;
    }
  }
  
  onRefresh?.();
}
```

### 2. Created Checkout API Route
**File**: `apps/dashboard/src/app/api/billing/checkout/route.ts` (NEW)

- New API endpoint: `POST /api/billing/checkout`
- Creates Stripe Checkout sessions for subscription payments
- Handles customer creation if needed
- Includes 14-day trial period for new subscriptions
- Properly sets metadata for webhook processing

**Features**:
- Validates user permissions (OWNER or ADMIN)
- Creates or retrieves Stripe customer
- Creates checkout session with proper configuration
- Returns checkout URL for redirection

### 3. Enhanced Webhook Handler
**File**: `packages/billing/src/product-webhook.ts`

- Added support for `checkout.session.completed` event
- Ensures feature cache is invalidated immediately after checkout
- Properly handles subscription creation from checkout

**Key Addition**:
```typescript
case 'checkout.session.completed':
  await this.handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
  break;
```

### 4. Added Success/Error Messaging
**File**: `apps/dashboard/src/sections/account/view/account-billing-view.jsx`

- Checks for `success=true` or `canceled=true` query parameters
- Displays appropriate success or warning messages
- Clears URL parameters after showing message
- Provides clear feedback to users

**User Experience**:
- Success message: "Subscription Activated! Your subscription has been successfully activated. Welcome aboard!"
- Cancel message: "Checkout Canceled. You canceled the checkout process. No charges were made."

## Flow Diagram

```
User clicks "Upgrade Plan"
    ↓
createTeamSubscription (creates incomplete subscription)
    ↓
requires payment? → Yes
    ↓
Fetch /api/billing/checkout
    ↓
Create Stripe Checkout Session
    ↓
Redirect to Stripe Checkout
    ↓
User enters payment details
    ↓
Payment successful? → Yes
    ↓
Stripe sends webhook: checkout.session.completed
    ↓
Stripe sends webhook: customer.subscription.created
    ↓
Database synced & cache invalidated
    ↓
Redirect to /user/account/billing?success=true
    ↓
Show success message & refresh billing data
```

## Benefits

1. **Secure Payment**: Uses Stripe Checkout's secure, PCI-compliant payment form
2. **Better UX**: Clear payment flow with hosted checkout page
3. **Immediate Activation**: Subscription is activated immediately after payment
4. **Trial Support**: Includes 14-day trial for new subscriptions
5. **Clear Feedback**: Success and error messages inform users of status
6. **Proper Error Handling**: Fallback mechanisms if checkout creation fails

## Testing Checklist

- [ ] Create new subscription from Free tier
- [ ] Verify redirect to Stripe Checkout
- [ ] Complete payment successfully
- [ ] Verify redirect back with success message
- [ ] Verify subscription is active immediately
- [ ] Test canceling checkout (verify no charges)
- [ ] Test with existing payment method
- [ ] Test without payment method
- [ ] Verify webhook processing
- [ ] Verify feature access after activation

## Configuration Required

### Stripe Webhook Events
Ensure your Stripe webhook is configured to send these events:
- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `invoice.payment_succeeded`

### Environment Variables
- `STRIPE_SECRET_KEY`: Required for API calls
- `STRIPE_WEBHOOK_SECRET`: Required for webhook signature verification

## Notes

- The checkout includes a 14-day trial period by default
- Metadata (teamId) is properly set for webhook processing
- The solution maintains backward compatibility with existing subscription management
- Customer Portal is still used for managing existing subscriptions

