import { prisma } from '@wirecrest/db';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';

// Define utilities locally to avoid import issues
async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

function generateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

function recordMetric(metric: string): void {
  console.log(`Metric: ${metric}`);
}

function isEmailAllowed(email: string): boolean {
  // TODO: Implement proper email allowlist logic
  // For now, allow all emails
  return true;
}

/**
 * Authentication service containing all business logic
 * Follows Single Responsibility Principle - handles only auth operations
 */
export class AuthService {
  /**
   * Initiates password reset process
   * @param email - User's email address
   * @param recaptchaToken - reCAPTCHA validation token
   * @returns Promise with success status
   */
  async forgotPassword(email: string, recaptchaToken: string): Promise<{ success: boolean }> {
    // TODO: Implement reCAPTCHA validation
    // await validateRecaptcha(recaptchaToken);

    if (!email || !validateEmail(email)) {
      throw new ApiError(422, 'The e-mail address you entered is invalid');
    }

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      throw new ApiError(422, `We can't find a user with that e-mail address`);
    }

    const resetToken = generateToken();

    await prisma.passwordReset.create({
      data: {
        email,
        token: resetToken,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // Expires in 1 hour
      },
    });

    // TODO: Implement email sending
    // await sendPasswordResetEmail(user, encodeURIComponent(resetToken));
    console.log(`Password reset token for ${email}: ${resetToken}`);

    recordMetric('user.password.request');

    return { success: true };
  }

  /**
   * Resets user password using reset token
   * @param token - Password reset token
   * @param password - New password
   * @returns Promise with success status and message
   */
  async resetPassword(token: string, password: string): Promise<{ success: boolean; message: string }> {
    if (!token) {
      throw new ApiError(422, 'Password reset token is required');
    }

    const passwordReset = await prisma.passwordReset.findUnique({
      where: { token },
    });

    if (!passwordReset) {
      throw new ApiError(422, 'Invalid password reset token. Please request a new one.');
    }

    if (passwordReset.expiresAt < new Date()) {
      throw new ApiError(422, 'Password reset token has expired. Please request a new one.');
    }

    const hashedPassword = await hashPassword(password);

    const updatedUser = await prisma.user.update({
      where: { email: passwordReset.email },
      data: { password: hashedPassword },
    });

    if (!updatedUser) {
      throw new ApiError(500, 'Error updating password. Please try again.');
    }

    // Remove all active sessions for the user
    await prisma.session.deleteMany({
      where: { userId: updatedUser.id },
    });

    await prisma.passwordReset.delete({
      where: { token },
    });

    recordMetric('user.password.reset');

    return { success: true, message: 'Password reset successfully' };
  }

  /**
   * Updates user password with current password verification
   * @param userId - User ID from authenticated session
   * @param currentPassword - User's current password
   * @param newPassword - New password
   * @returns Promise with success status and message
   */
  async updatePassword(
    userId: string, 
    currentPassword: string, 
    newPassword: string
  ): Promise<{ success: boolean; message: string }> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    if (!(await verifyPassword(currentPassword, user.password as string))) {
      throw new ApiError(400, 'Your current password is incorrect');
    }

    await prisma.user.update({
      where: { id: userId },
      data: { password: await hashPassword(newPassword) },
    });

    // Remove all sessions other than the current one
    await prisma.session.deleteMany({
      where: { userId },
    });

    recordMetric('user.password.updated');

    return { success: true, message: 'Password updated successfully' };
  }

  /**
   * Registers a new user
   * @param userData - User registration data
   * @returns Promise with success status and user data
   */
  async registerUser(userData: {
    name: string;
    email: string;
    password: string;
    team?: string;
    inviteToken?: string;
    recaptchaToken?: string;
  }): Promise<{ success: boolean; data: { user: any; team: any; confirmEmail: boolean } }> {
    const { name, password, team, inviteToken, recaptchaToken } = userData;

    // TODO: Implement reCAPTCHA validation
    // await validateRecaptcha(recaptchaToken);

    const invitation = inviteToken 
      ? await prisma.invitation.findUnique({ where: { token: inviteToken } })
      : null;

    let email: string = userData.email;

    // When join via invitation
    if (invitation) {
      if (invitation.expires < new Date()) {
        throw new ApiError(400, 'Invitation expired. Please request a new one.');
      }

      if (invitation.sentViaEmail) {
        email = invitation.email!;
      }
    }

    if (!validateEmail(email)) {
      throw new ApiError(400, 'Invalid email address');
    }

    if (!isEmailAllowed(email)) {
      throw new ApiError(400, 'We currently only accept work email addresses for sign-up. Please use your work email to create an account.');
    }

    if (await prisma.user.findUnique({ where: { email } })) {
      throw new ApiError(400, 'A user with this email already exists.');
    }

    // Check if team name is available (only if team is provided)
    if (!invitation && team) {
      const slug = slugify(team);
      const existingTeam = await prisma.team.findUnique({ where: { slug } });

      if (existingTeam) {
        throw new ApiError(400, 'A team with this name already exists.');
      }
    }

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: await hashPassword(password),
        emailVerified: invitation ? new Date() : null,
      },
    });

    let userTeam;

    // Create team if user is not invited
    if (!invitation && team) {
      userTeam = await prisma.team.create({
        data: {
          name: team,
          slug: slugify(team),
        },
      });

      // Add user as team member
      await prisma.teamMember.create({
        data: {
          userId: user.id,
          teamId: userTeam.id,
          role: 'OWNER',
        },
      });
    } else if (invitation) {
      userTeam = await prisma.team.findUnique({ 
        where: { slug: invitation.teamId } 
      });
      
      if (userTeam) {
        await prisma.teamMember.create({
          data: {
            userId: user.id,
            teamId: userTeam.id,
            role: 'MEMBER',
          },
        });
      }
    }

    recordMetric('user.signup');

    return {
      success: true,
      data: {
        user,
        team: userTeam,
        confirmEmail: !user.emailVerified,
      },
    };
  }

  /**
   * Resends email verification
   * @param email - User's email address
   * @returns Promise with success status
   */
  async resendEmailVerification(email: string): Promise<{ success: boolean }> {
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      throw new ApiError(422, `We can't find a user with that e-mail address`);
    }

    const verificationToken = await prisma.verificationToken.create({
      data: {
        identifier: email,
        token: generateToken(),
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000), // Expires in 24 hours
      },
    });

    // TODO: Implement email sending
    // await sendVerificationEmail({ user, verificationToken });
    console.log(`Verification token for ${email}: ${verificationToken.token}`);

    return { success: true };
  }

  /**
   * Handles account unlock request
   * @param email - User's email address
   * @param expiredToken - Expired verification token
   * @returns Promise with success status
   */
  async unlockAccountRequest(email: string, expiredToken: string): Promise<{ success: boolean }> {
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      throw new ApiError(400, 'User not found');
    }

    // TODO: Check if account is locked
    // if (!isAccountLocked(user)) {
    //   throw new ApiError(400, 'Your account is already active. Please try logging in.');
    // }

    await prisma.verificationToken.deleteMany({
      where: { token: expiredToken },
    });

    // TODO: Implement email sending
    // await sendLockoutEmail(user, true);

    return { success: true };
  }

  /**
   * Custom sign out with cleanup
   * @param userId - User ID from authenticated session
   * @returns Promise with success status
   */
  async customSignOut(userId: string): Promise<{ success: boolean; message: string }> {
    // Get the user's team to clear their business profile cache
    const teamMember = await prisma.teamMember.findFirst({
      where: { userId },
      include: { team: true },
    });

    if (teamMember?.team) {
      // Clear the business profile cache for this team if you have caching
      console.log(`Clearing cache for team: ${teamMember.team.id}`);
    }

    recordMetric('user.signout');

    return { success: true, message: 'Signed out successfully' };
  }

  /**
   * Gets user sessions for multi-tenant context
   * @param userId - User ID from authenticated session
   * @returns Promise with user sessions
   */
  async getUserSessions(userId: string): Promise<any[]> {
    const sessions = await prisma.session.findMany({
      where: { userId },
      orderBy: { expires: 'desc' },
    });

    return sessions;
  }

  /**
   * Deletes a specific user session
   * @param userId - User ID from authenticated session
   * @param sessionId - Session ID to delete
   * @returns Promise with success status
   */
  async deleteUserSession(userId: string, sessionId: string): Promise<{ success: boolean }> {
    await prisma.session.deleteMany({
      where: {
        id: sessionId,
        userId, // Ensure user can only delete their own sessions
      },
    });

    return { success: true };
  }

  /**
   * Updates user profile with team context
   * @param userId - User ID from authenticated session
   * @param profileData - Profile data to update
   * @returns Promise with updated user
   */
  async updateUserProfile(
    userId: string, 
    profileData: { name?: string; email?: string }
  ): Promise<{ success: boolean; data: any }> {
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: profileData,
      include: {
        teamMembers: {
          include: {
            team: true,
          },
        },
      },
    });

    return { success: true, data: updatedUser };
  }
}
