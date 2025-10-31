'use server';


import { prisma } from '@wirecrest/db';
import { auth } from '@wirecrest/auth-next';
import { EndpointIn, EndpointOut } from 'svix';
import { getTeam, getByCustomerId } from '@/models/team';
import {
  getBySubscriptionId,
  createStripeSubscription,
  deleteStripeSubscription,
  updateStripeSubscription,
} from '@/models/subscription';

import env from 'src/lib/env';
import { stripe } from 'src/lib/stripe';
import { createWebhook } from 'src/lib/svix';

import { ApiError, recordMetric } from './lib';

// Webhook Management Actions
// export async function getTeamWebhooks(slug: string): Promise<EndpointOut[]> {
//   const session = await auth();
//   if (!session?.user?.id) {
//     throw new ApiError(401, 'Unauthorized');
//   }

//   const team = await getTeam({ slug });
//   if (!team) {
//     throw new ApiError(404, 'Team not found');
//   }

//   // Check if user is a member of this team
//   const membership = await prisma.teamMember.findFirst({
//     where: {
//       teamId: team.id,
//       userId: session.user.id,
//     },
//   });

//   if (!membership) {
//     throw new ApiError(403, 'Access denied. You must be a member of this team.');
//   }

//   const webhooksResponse = await listWebhooks(team.id);

//   recordMetric('webhook.fetched');

//   return webhooksResponse?.data || [];
// }

export async function createTeamWebhook(slug: string, data: EndpointIn): Promise<EndpointOut> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new ApiError(401, 'Unauthorized');
  }

  const team = await getTeam({ slug });
  if (!team) {
    throw new ApiError(404, 'Team not found');
  }

  // Check if user is owner of this team
  const membership = await prisma.teamMember.findFirst({
    where: {
      teamId: team.id,
      userId: session.user.id,
      role: 'OWNER',
    },
  });

  if (!membership) {
    throw new ApiError(403, 'Access denied. Only team owners can create webhooks.');
  }

  const webhook = await createWebhook(team.id, data);

  recordMetric('webhook.created');

  return webhook;
}

// export async function getTeamWebhook(slug: string, endpointId: string): Promise<EndpointOut> {
//   const session = await auth();
//   if (!session?.user?.id) {
//     throw new ApiError(401, 'Unauthorized');
//   }

//   const team = await getTeam({ slug });
//   if (!team) {
//     throw new ApiError(404, 'Team not found');
//   }

//   // Check if user is a member of this team
//   const membership = await prisma.teamMember.findFirst({
//     where: {
//       teamId: team.id,
//       userId: session.user.id,
//     },
//   });

//   if (!membership) {
//     throw new ApiError(403, 'Access denied. You must be a member of this team.');
//   }

//   // Get webhook directly from Svix
//   const endpointData = await findWebhook(team.id, endpointId);

//   if (!endpointData) {
//     throw new ApiError(404, 'Webhook not found');
//   }

//   recordMetric('webhook.retrieved');

//   return endpointData;
// }

// export async function updateTeamWebhook(
//   slug: string,
//   endpointId: string,
//   data: EndpointIn
// ): Promise<EndpointOut> {
//   const session = await auth();
//   if (!session?.user?.id) {
//     throw new ApiError(401, 'Unauthorized');
//   }

//   const team = await getTeam({ slug });
//   if (!team) {
//     throw new ApiError(404, 'Team not found');
//   }

//   // Check if user is owner of this team
//   const membership = await prisma.teamMember.findFirst({
//     where: {
//       teamId: team.id,
//       userId: session.user.id,
//       role: 'OWNER',
//     },
//   });

//   if (!membership) {
//     throw new ApiError(403, 'Access denied. Only team owners can update webhooks.');
//   }

//   // Verify webhook exists for this team
//   const webhook = await prisma.webhook.findFirst({
//     where: {
//       endpointId,
//       teamId: team.id,
//     },
//   });

//   if (!webhook) {
//     throw new ApiError(404, 'Webhook not found');
//   }

//   const updatedWebhook = await updateWebhook(team.id, endpointId, data);

//   recordMetric('webhook.updated');

//   return updatedWebhook;
// }

// export async function deleteTeamWebhook(slug: string, endpointId: string): Promise<void> {
//   const session = await auth();
//   if (!session?.user?.id) {
//     throw new ApiError(401, 'Unauthorized');
//   }

//   const team = await getTeam({ slug });
//   if (!team) {
//     throw new ApiError(404, 'Team not found');
//   }

//   // Check if user is owner of this team
//   const membership = await prisma.teamMember.findFirst({
//     where: {
//       teamId: team.id,
//       userId: session.user.id,
//       role: 'OWNER',
//     },
//   });

//   if (!membership) {
//     throw new ApiError(403, 'Access denied. Only team owners can delete webhooks.');
//   }

//   // Verify webhook exists for this team
//   const webhook = await prisma.webhook.findFirst({
//     where: {
//       endpointId,
//       teamId: team.id,
//     },
//   });

//   if (!webhook) {
//     throw new ApiError(404, 'Webhook not found');
//   }

//   await deleteWebhook(team.id, endpointId);

//   // Also delete from our database
//   await prisma.webhook.delete({
//     where: { id: webhook.id },
//   });

//   recordMetric('webhook.deleted');
// }

// export async function deleteAllTeamWebhooks(slug: string): Promise<void> {
//   const session = await auth();
//   if (!session?.user?.id) {
//     throw new ApiError(401, 'Unauthorized');
//   }

//   const team = await getTeam({ slug });
//   if (!team) {
//     throw new ApiError(404, 'Team not found');
//   }

//   // Check if user is owner of this team
//   const membership = await prisma.teamMember.findFirst({
//     where: {
//       teamId: team.id,
//       userId: session.user.id,
//       role: 'OWNER',
//     },
//   });

//   if (!membership) {
//     throw new ApiError(403, 'Access denied. Only team owners can delete webhooks.');
//   }

//   // Get all webhooks for this team
//   const webhooks = await prisma.webhook.findMany({
//     where: { teamId: team.id },
//   });

//   // Delete each webhook from Svix
//   for (const webhook of webhooks) {
//     try {
//       await deleteWebhook(team.id, webhook.endpointId);
//     } catch (error) {
//       console.error(`Failed to delete webhook ${webhook.endpointId}:`, error);
//       // Continue with other webhooks even if one fails
//     }
//   }

//   // Delete all webhooks from our database
//   await prisma.webhook.deleteMany({
//     where: { teamId: team.id },
//   });

//   recordMetric('webhook.bulk-deleted');
// }

// // Webhook Events Processing
// export async function processWebhookEvent(data: { headers: Record<string, string>; body: string }) {
//   const { headers, body } = data;

//   // Verify webhook signature
//   const svixId = headers['svix-id'];
//   const svixTimestamp = headers['svix-timestamp'];
//   const svixSignature = headers['svix-signature'];

//   if (!svixId || !svixTimestamp || !svixSignature) {
//     throw new ApiError(400, 'Missing Svix headers');
//   }

//   // Parse the webhook payload
//   let event;
//   try {
//     event = JSON.parse(body);
//   } catch (error) {
//     throw new ApiError(400, 'Invalid JSON payload');
//   }

//   // Process the event based on type
//   switch (event.type) {
//     case 'endpoint.created':
//       await handleEndpointCreated(event.data);
//       break;
//     case 'endpoint.updated':
//       await handleEndpointUpdated(event.data);
//       break;
//     case 'endpoint.deleted':
//       await handleEndpointDeleted(event.data);
//       break;
//     case 'message.attempt.exhausted':
//       await handleMessageAttemptExhausted(event.data);
//       break;
//     default:
//       console.log(`Unhandled webhook event type: ${event.type}`);
//   }

//   return { success: true };
// }

// Webhook event handlers
async function handleEndpointCreated(data: any) {
  console.log('Endpoint created:', data);
  // Add any specific logic for when an endpoint is created
}

async function handleEndpointUpdated(data: any) {
  console.log('Endpoint updated:', data);
  // Add any specific logic for when an endpoint is updated
}

async function handleEndpointDeleted(data: any) {
  console.log('Endpoint deleted:', data);
  // Add any specific logic for when an endpoint is deleted
}

async function handleMessageAttemptExhausted(data: any) {
  console.log('Message attempt exhausted:', data);
  // Add any specific logic for when message delivery fails
  // This could include notifying the team or logging the failure
}

// Directory Sync (SCIM) Actions
export async function getDirectorySync(slug: string) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new ApiError(401, 'Unauthorized');
  }

  const team = await getTeam({ slug });
  if (!team) {
    throw new ApiError(404, 'Team not found');
  }

  // Check if user is owner of this team
  const membership = await prisma.teamMember.findFirst({
    where: {
      teamId: team.id,
      userId: session.user.id,
      role: 'OWNER',
    },
  });

  if (!membership) {
    throw new ApiError(403, 'Access denied. Only team owners can access directory sync.');
  }

  // Get directory sync connections for this team
  // const jackson = await import('src/lib/jackson');
  // const { directorySync } = await jackson.default();

  // const connections = await directorySync.directories.getByTenantAndProduct({
  //   tenant: team.id,
  //   product: process.env.JACKSON_PRODUCT_ID || 'default',
  // });

  // return connections;
  throw new ApiError(501, 'Directory Sync feature temporarily disabled');
}

export async function createDirectorySync(
  slug: string,
  data: {
    name: string;
    provider: string;
    webhook_url?: string;
    webhook_secret?: string;
  }
) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new ApiError(401, 'Unauthorized');
  }

  const team = await getTeam({ slug });
  if (!team) {
    throw new ApiError(404, 'Team not found');
  }

  // Check if user is owner of this team
  const membership = await prisma.teamMember.findFirst({
    where: {
      teamId: team.id,
      userId: session.user.id,
      role: 'OWNER',
    },
  });

  if (!membership) {
    throw new ApiError(403, 'Access denied. Only team owners can create directory sync.');
  }

  // const jackson = await import('src/lib/jackson');
  // const { directorySync } = await jackson.default();

  // const directory = await directorySync.directories.create({
  //   tenant: team.id,
  //   product: process.env.JACKSON_PRODUCT_ID || 'default',
  //   name: data.name,
  //   provider: data.provider,
  //   webhook_url: data.webhook_url,
  //   webhook_secret: data.webhook_secret,
  // });

  // recordMetric('directory-sync.created');

  // return directory;
  throw new ApiError(501, 'Directory Sync feature temporarily disabled');
}

export async function updateDirectorySync(
  slug: string,
  directoryId: string,
  data: {
    name?: string;
    webhook_url?: string;
    webhook_secret?: string;
  }
) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new ApiError(401, 'Unauthorized');
  }

  const team = await getTeam({ slug });
  if (!team) {
    throw new ApiError(404, 'Team not found');
  }

  // Check if user is owner of this team
  const membership = await prisma.teamMember.findFirst({
    where: {
      teamId: team.id,
      userId: session.user.id,
      role: 'OWNER',
    },
  });

  if (!membership) {
    throw new ApiError(403, 'Access denied. Only team owners can update directory sync.');
  }

  // const jackson = await import('src/lib/jackson');
  // const { directorySync } = await jackson.default();

  // const directory = await directorySync.directories.update(directoryId, data);

  // recordMetric('directory-sync.updated');

  // return directory;
  throw new ApiError(501, 'Directory Sync feature temporarily disabled');
}

export async function deleteDirectorySync(slug: string, directoryId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new ApiError(401, 'Unauthorized');
  }

  const team = await getTeam({ slug });
  if (!team) {
    throw new ApiError(404, 'Team not found');
  }

  // Check if user is owner of this team
  const membership = await prisma.teamMember.findFirst({
    where: {
      teamId: team.id,
      userId: session.user.id,
      role: 'OWNER',
    },
  });

  if (!membership) {
    throw new ApiError(403, 'Access denied. Only team owners can delete directory sync.');
  }

  // const jackson = await import('src/lib/jackson');
  // const { directorySync } = await jackson.default();

  // await directorySync.directories.delete(directoryId);

  // recordMetric('directory-sync.deleted');

  // return { success: true };
  throw new ApiError(501, 'Directory Sync feature temporarily disabled');
}

// Stripe Webhook Handler
export async function handleStripeWebhook(data: { body: string | Buffer; signature: string }) {
  const { body, signature } = data;

  const { webhookSecret } = env.stripe;
  let event: any;

  try {
    if (!signature || !webhookSecret) {
      throw new ApiError(400, 'Missing signature or webhook secret');
    }

    const rawBody = typeof body === 'string' ? Buffer.from(body) : body;
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err: any) {
    throw new ApiError(400, `Webhook signature verification failed: ${err.message}`);
  }

  const relevantEvents = [
    'customer.subscription.created',
    'customer.subscription.updated',
    'customer.subscription.deleted',
  ];

  if (relevantEvents.includes(event.type)) {
    try {
      switch (event.type) {
        case 'customer.subscription.created':
          await handleSubscriptionCreated(event);
          break;
        case 'customer.subscription.updated':
          await handleSubscriptionUpdated(event);
          break;
        case 'customer.subscription.deleted':
          await deleteStripeSubscription(event.data.object.id);
          break;
        default:
          throw new Error('Unhandled relevant event!');
      }
    } catch (error) {
      console.error('Stripe webhook handler error:', error);
      throw new ApiError(400, 'Webhook handler failed');
    }
  }

  return { received: true };

  // Helper functions
  async function handleSubscriptionUpdated(subscriptionEvent: any) {
    const { cancel_at, id, status, current_period_end, current_period_start, customer, items } =
      subscriptionEvent.data.object;

    const subscription = await getBySubscriptionId(id);
    if (!subscription) {
      const teamExists = await getByCustomerId(customer);
      if (!teamExists) {
        return;
      } else {
        await handleSubscriptionCreated(subscriptionEvent);
      }
    } else {
      const priceId = items.data.length > 0 ? items.data[0].plan?.id : '';
      await updateStripeSubscription(id, {
        active: status === 'active',
        endDate: current_period_end ? new Date(current_period_end * 1000) : undefined,
        startDate: current_period_start ? new Date(current_period_start * 1000) : undefined,
        cancelAt: cancel_at ? new Date(cancel_at * 1000) : undefined,
        priceId,
      });
    }
  }

  async function handleSubscriptionCreated(subscriptionEvent: any) {
    const { customer, id, current_period_start, current_period_end, items } = subscriptionEvent.data.object;

    await createStripeSubscription({
      customerId: customer,
      id,
      active: true,
      startDate: new Date(current_period_start * 1000),
      endDate: new Date(current_period_end * 1000),
      priceId: items.data.length > 0 ? items.data[0].plan?.id : '',
    });
  }
}
