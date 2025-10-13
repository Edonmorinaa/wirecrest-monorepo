import Stripe from 'stripe';
import { updateTeam } from '@/models/team';
import { StripeService } from '@wirecrest/billing';

import env from 'src/lib/env';

export const stripe = StripeService.getStripeInstance();

export async function getStripeCustomerId(teamMember, session?: any) {
  let customerId = '';
  if (!teamMember.team.billingId) {
    const customerData: {
      metadata: { teamId: string };
      email?: string;
    } = {
      metadata: {
        teamId: teamMember.teamId,
      },
    };
    if (session?.user?.email) {
      customerData.email = session?.user?.email;
    }
    const customer = await stripe.customers.create({
      ...customerData,
      name: session?.user?.name as string,
    });
    await updateTeam(teamMember.team.slug, {
      billingId: customer.id,
      billingProvider: 'stripe',
    });
    customerId = customer.id;
  } else {
    customerId = teamMember.team.billingId;
  }
  return customerId;
}
