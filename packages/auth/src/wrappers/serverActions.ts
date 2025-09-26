/**
 * Server action wrappers that abstract away NextAuth and auth-service complexity
 * These can be used in server components and API routes
 */

import { 
  forgotPassword, 
  resetPassword, 
  updatePassword, 
  joinUser, 
  resendEmailVerification, 
  unlockAccountRequest,
  getUserSessions,
  deleteUserSession,
  updateUserProfile,
  customSignOut
} from '../actions/authActions';

/**
 * Password management server actions
 */
export const serverForgotPassword = async (data: { email: string; recaptchaToken: string }) => {
  return await forgotPassword(data);
};

export const serverResetPassword = async (data: { token: string; password: string }) => {
  return await resetPassword(data);
};

export const serverUpdatePassword = async (data: { currentPassword: string; newPassword: string }) => {
  return await updatePassword(data);
};

/**
 * User management server actions
 */
export const serverRegisterUser = async (data: {
  name: string;
  email: string;
  password: string;
  team?: string;
  inviteToken?: string;
  recaptchaToken: string;
}) => {
  return await joinUser(data);
};

export const serverResendEmailVerification = async (data: { email: string }) => {
  return await resendEmailVerification(data);
};

export const serverUnlockAccount = async (data: { email: string; expiredToken: string }) => {
  return await unlockAccountRequest(data);
};

/**
 * Profile management server actions
 */
export const serverUpdateProfile = async (data: { name?: string; email?: string }) => {
  return await updateUserProfile(data);
};

/**
 * Session management server actions
 */
export const serverGetUserSessions = async () => {
  return await getUserSessions();
};

export const serverDeleteUserSession = async (sessionId: string) => {
  return await deleteUserSession(sessionId);
};

export const serverSignOut = async () => {
  return await customSignOut();
};
