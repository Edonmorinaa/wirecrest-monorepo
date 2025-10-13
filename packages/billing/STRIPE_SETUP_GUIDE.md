# Stripe Setup Guide for Wirecrest Billing

This guide will help you manually set up all the required products and prices in your Stripe Dashboard.

## 📋 Prerequisites

1. **Stripe Account**: You need a Stripe account with API access
2. **Stripe Dashboard Access**: Access to create products and prices
3. **Database Access**: To update your database with Stripe IDs

## 🚀 Step-by-Step Setup

### 1. Create Products in Stripe Dashboard

For each tier in `stripe-products-config.json`, create a product:

#### Free Plan
- **Name**: Free Plan
- **Description**: Perfect for getting started with basic review management
- **Type**: Service
- **Active**: ✅ Yes
- **Metadata**:
  ```
  tier: FREE
  sortOrder: 1
  highlighted: false
  popular: false
  ```

#### Starter Plan
- **Name**: Starter Plan
- **Description**: Ideal for small businesses looking to grow their online presence
- **Type**: Service
- **Active**: ✅ Yes
- **Metadata**:
  ```
  tier: STARTER
  sortOrder: 2
  highlighted: false
  popular: true
  ```

#### Professional Plan
- **Name**: Professional Plan
- **Description**: Advanced features for growing businesses and agencies
- **Type**: Service
- **Active**: ✅ Yes
- **Metadata**:
  ```
  tier: PROFESSIONAL
  sortOrder: 3
  highlighted: false
  popular: false
  ```

#### Enterprise Plan
- **Name**: Enterprise Plan
- **Description**: Complete solution for large organizations with custom needs
- **Type**: Service
- **Active**: ✅ Yes
- **Metadata**:
  ```
  tier: ENTERPRISE
  sortOrder: 4
  highlighted: true
  popular: false
  ```

### 2. Create Prices for Each Product

#### Free Plan Prices
- **Base Price**: $0.00/month
  - Type: Recurring
  - Interval: Month
  - Metadata: `priceType: base, billingInterval: month`

#### Starter Plan Prices
- **Base Price (Monthly)**: $29.00/month
  - Type: Recurring
  - Interval: Month
  - Metadata: `priceType: base, billingInterval: month`

- **Base Price (Yearly)**: $290.00/year
  - Type: Recurring
  - Interval: Year
  - Metadata: `priceType: base, billingInterval: year`

- **Additional Seat**: $10.00/month
  - Type: Recurring
  - Interval: Month
  - Metadata: `priceType: additional_seat, billingInterval: month`

- **Additional Location**: $5.00/month
  - Type: Recurring
  - Interval: Month
  - Metadata: `priceType: additional_location, billingInterval: month`

#### Professional Plan Prices
- **Base Price (Monthly)**: $79.00/month
- **Base Price (Yearly)**: $790.00/year
- **Additional Seat**: $8.00/month
- **Additional Location**: $4.00/month

#### Enterprise Plan Prices
- **Base Price (Monthly)**: $199.00/month
- **Base Price (Yearly)**: $1990.00/year
- **Additional Seat**: $6.00/month
- **Additional Location**: $3.00/month

### 3. Update Your Database

After creating products and prices in Stripe, update your database with the Stripe IDs:

```sql
-- Update tier configurations with Stripe IDs
UPDATE "SubscriptionTierConfig" 
SET 
  "stripeProductId" = 'prod_xxxxx',
  "stripePriceId" = 'price_xxxxx'
WHERE "tier" = 'STARTER';

-- Repeat for each tier
```

### 4. Configure Webhooks

Set up webhooks in your Stripe Dashboard to handle these events:

- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_succeeded`
- `invoice.payment_failed`
- `customer.subscription.trial_will_end`

**Webhook Endpoint**: `https://your-domain.com/api/webhooks/stripe`

### 5. Feature Configuration

Each tier includes specific features. The features are controlled by the subscription metadata in Stripe:

#### Free Plan Features
- Google Reviews
- Facebook Reviews
- Basic Analytics
- Email Notifications

#### Starter Plan Features
- All Free features
- TripAdvisor Reviews
- Advanced Analytics
- Automation
- Real-time Alerts
- API Access
- Multi-location Management

#### Professional Plan Features
- All Starter features
- Booking.com Reviews
- Yelp Reviews
- Instagram Analytics
- TikTok Analytics
- Twitter Automation
- Custom Integrations
- Webhook Support
- Bulk Operations
- Priority Support
- AI Sentiment Analysis
- Advanced Filtering
- Data Export
- Scheduled Reports

#### Enterprise Plan Features
- All Professional features
- Custom Reporting
- White Label Solution
- Dedicated Support
- Team Management
- Billing Management
- User Roles & Permissions
- Audit Logs

## 🔧 Testing Your Setup

1. **Create Test Subscriptions**: Use Stripe's test mode to create test subscriptions
2. **Verify Webhooks**: Check that webhook events are being received
3. **Test Feature Gates**: Ensure features are properly gated based on subscription
4. **Test Upgrades/Downgrades**: Verify subscription changes work correctly

## 📊 Monitoring

- **Stripe Dashboard**: Monitor subscriptions, payments, and customer data
- **Application Logs**: Monitor webhook processing and subscription updates
- **Database**: Track subscription changes and feature access

## 🚨 Important Notes

1. **Metadata is Critical**: The metadata in Stripe products controls feature access
2. **Price IDs Matter**: Your application uses price IDs to create subscriptions
3. **Webhook Security**: Always verify webhook signatures
4. **Test First**: Always test in Stripe's test mode before going live

## 📞 Support

If you encounter issues:
1. Check Stripe Dashboard for subscription status
2. Verify webhook endpoints are working
3. Check application logs for errors
4. Ensure database is properly updated with Stripe IDs
