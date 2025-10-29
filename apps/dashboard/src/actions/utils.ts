'use server';

// import jackson from 'src/lib/jackson';

import { prisma } from '@wirecrest/db';
import { auth } from '@wirecrest/auth-next';
import { getInvitation, isInvitationExpired } from '@/models/invitation';

import { validateWithSchema, getInvitationSchema } from 'src/lib/zod';

import { ApiError, recordMetric } from './lib';

// Hello World Utility
export async function getHelloMessage() {
  return { message: 'Hello World!' };
}

// Import Hack Utility (for keeping certain libraries in node_modules)
// Temporarily disabled due to missing dependencies
// export async function importHack() {
//   // Leave the openid-client import to get nextjs to leave the library in node_modules after build
//   const dummy = await import('openid-client');
//   const jose = await import('jose');

//   // Return empty response but imports are preserved
//   return {};
// }

// Invitation by Token
export async function getInvitationByToken(token: string) {
  const { token: validatedToken } = validateWithSchema(getInvitationSchema, { token });

  const invitation = await getInvitation({ token: validatedToken });

  if (!invitation) {
    throw new ApiError(404, 'Invitation not found');
  }

  if (await isInvitationExpired(invitation.expires)) {
    throw new ApiError(400, 'Invitation expired. Please request a new one.');
  }

  recordMetric('invitation.fetched');

  return invitation;
}

// Review AI Suggestions
export async function getReviewAISuggestions(teamSlug: string) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new ApiError(401, 'Unauthorized');
  }

  if (!teamSlug) {
    throw new ApiError(400, 'Team slug is required');
  }

  // Check team access
  const team = await prisma.team.findUnique({
    where: { slug: teamSlug },
    include: {
      members: {
        where: { userId: session.user.id },
      },
    },
  });

  if (!team || team.members.length === 0) {
    throw new ApiError(403, 'Access denied');
  }

  // Simulate some processing time for a more realistic API
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Return mock suggestions data
  // TODO: Implement actual AI suggestions logic
  return {
    suggestions: [
      {
        id: 'mock-review-1',
        reason: 'Contains keyword "service" with negative sentiment',
      },
      {
        id: 'mock-review-2',
        reason: 'Recent 1-star review that needs attention',
      },
      {
        id: 'mock-review-3',
        reason: 'Trending keyword mention of "price" in multiple reviews',
      },
    ],
  };
}

// Update Review Status - Moved to reviews.ts to avoid duplicate export

// Well-known SAML Certificate
export async function getSAMLCertificate() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new ApiError(401, 'Unauthorized');
  }

  // Get SAML certificate from Jackson
  // const { directorySync } = await jackson();

  // This would typically return the public certificate
  // Implementation depends on your Jackson configuration
  throw new ApiError(501, 'SAML certificate endpoint not implemented');
}

// Workflow Retry
export async function retryWorkflow(workflowId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new ApiError(401, 'Unauthorized');
  }

  if (!workflowId) {
    throw new ApiError(400, 'Workflow ID is required');
  }

  // TODO: Implement workflow retry logic
  // This would depend on your workflow system implementation
  throw new ApiError(501, 'Workflow retry not implemented');
}
