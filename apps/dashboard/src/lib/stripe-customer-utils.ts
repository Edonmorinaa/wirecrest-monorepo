/**
 * Stripe Customer Utilities
 * Handles Stripe customer creation and management for teams
*/
import { prisma } from '@wirecrest/db';
import { Role, Team } from '@prisma/client';
import { StripeService } from '@wirecrest/billing';


/**
 * Ensure a team has a Stripe customer ID
 * Creates a Stripe customer if one doesn't exist
 */
export async function ensureTeamStripeCustomer(teamId: string): Promise<string> {
  try {
    // Get team with existing Stripe customer ID
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      select: { id: true, name: true, stripeCustomerId: true },
    });

    if (!team) {
      throw new Error(`Team with ID ${teamId} not found`);
    }

    // If team already has a Stripe customer ID, return it
    if (team.stripeCustomerId) {
      return team.stripeCustomerId;
    }

    // Create Stripe customer for the team
    const stripeService = new StripeService();
    const owner = await prisma.teamMember.findFirst({
      where: { teamId, role: Role.OWNER },
      include: { user: true },
    });

    if (!owner?.user) {
      throw new Error('Team owner not found');
    }

    const stripeCustomer = await stripeService.createOrGetCustomer(
      teamId,
      owner.user.email, // Use team name as email
      team.name
    );

    // Update team with Stripe customer ID
    await prisma.team.update({
      where: { id: teamId },
      data: { stripeCustomerId: stripeCustomer.id },
    });

    return stripeCustomer.id;
  } catch (error) {
    console.error('Failed to ensure team Stripe customer:', error);
    throw error;
  }
}

/**
 * Get or create Stripe customer for a team
 * This is a safe function that can be called multiple times
 */
export async function getOrCreateTeamStripeCustomer(teamId: string): Promise<string> {
  try {
    return await ensureTeamStripeCustomer(teamId);
  } catch (error) {
    console.error('Failed to get or create team Stripe customer:', error);
    throw error;
  }
}

/**
 * Create Stripe customer for a new team
 * Called when a team is created
 */
export async function createTeamStripeCustomer(team: Team): Promise<string> {
  try {
    const stripeService = new StripeService();
    const owner = await prisma.teamMember.findFirst({
      where: { teamId: team.id, role: Role.OWNER },
      include: { user: true },
    });

    if (!owner?.user) {
      throw new Error('Team owner not found');
    }

    const stripeCustomer = await stripeService.createOrGetCustomer(
      team.id,
      owner.user.email,
      team.name
    );

    // Update team with Stripe customer ID
    await prisma.team.update({
      where: { id: team.id },
      data: { stripeCustomerId: stripeCustomer.id },
    });

    return stripeCustomer.id;
  } catch (error) {
    console.error('Failed to create team Stripe customer:', error);
    throw error;
  }
}

/**
 * Get team's Stripe customer ID
 * Returns null if team doesn't have a Stripe customer
 */
export async function getTeamStripeCustomerId(teamId: string): Promise<string | null> {
  try {
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      select: { stripeCustomerId: true },
    });

    return team?.stripeCustomerId || null;
  } catch (error) {
    console.error('Failed to get team Stripe customer ID:', error);
    throw error;
  }
}

/**
 * Update team's Stripe customer information
 */
export async function updateTeamStripeCustomer(teamId: string, customerData: {
  name?: string;
  email?: string;
  description?: string;
}): Promise<void> {
  try {
    const stripeCustomerId = await getTeamStripeCustomerId(teamId);
    
    if (!stripeCustomerId) {
      throw new Error(`Team ${teamId} does not have a Stripe customer ID`);
    }

    // For now, we'll skip updating the Stripe customer as StripeService doesn't expose this method
    // This could be added to StripeService if needed
    console.log('Customer update not implemented yet:', { stripeCustomerId, customerData });
  } catch (error) {
    console.error('Failed to update team Stripe customer:', error);
    throw error;
  }
}
