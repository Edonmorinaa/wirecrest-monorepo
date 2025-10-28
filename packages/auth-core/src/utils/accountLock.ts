/**
 * Account lockout utilities
 * Based on dashboard implementation
 */
import { prisma } from '@wirecrest/db';

export const exceededLoginAttemptsThreshold = (user: any): boolean => {
  const maxLoginAttempts = Number(process.env.MAX_LOGIN_ATTEMPTS) || 5;
  return user.invalid_login_attempts >= maxLoginAttempts;
};

export const incrementLoginAttempts = async (user: any) => {
  const updatedUser = await prisma.user.update({
    where: { id: user.id },
    data: {
      invalid_login_attempts: {
        increment: 1,
      },
    },
  });

  if (exceededLoginAttemptsThreshold(updatedUser)) {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        lockedAt: new Date(),
      },
    });

    // TODO: Send lockout email
    // await sendLockoutEmail(user);
  }

  return updatedUser;
};

export const clearLoginAttempts = async (user: any) => {
  await prisma.user.update({
    where: { id: user.id },
    data: {
      invalid_login_attempts: 0,
    },
  });
};

export const unlockAccount = async (user: any) => {
  await prisma.user.update({
    where: { id: user.id },
    data: {
      invalid_login_attempts: 0,
      lockedAt: null,
    },
  });
};

export const isAccountLocked = (user: any): boolean => {
  return !!user.lockedAt && exceededLoginAttemptsThreshold(user);
};
