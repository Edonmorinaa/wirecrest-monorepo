import { authApiClient } from '../services/authApiClient';

/**
 * Auth actions that internally call the auth-service API
 * These provide the same interface as the original dashboard actions
 * but delegate to the auth-service behind the scenes
 */

export const forgotPassword = async (data: { email: string; recaptchaToken: string }) => {
  return await authApiClient.forgotPassword(data.email, data.recaptchaToken);
};

export const resetPassword = async (data: { token: string; password: string }) => {
  return await authApiClient.resetPassword(data.token, data.password);
};

export const updatePassword = async (data: { currentPassword: string; newPassword: string }) => {
  return await authApiClient.updatePassword(data.currentPassword, data.newPassword);
};

export const joinUser = async (data: {
  name: string;
  email: string;
  password: string;
  team?: string;
  inviteToken?: string;
  recaptchaToken: string;
}) => {
  console.log('joinUser', data);
  return await authApiClient.registerUser(data);
};

export const resendEmailVerification = async (data: { email: string }) => {
  return await authApiClient.resendEmailVerification(data.email);
};

export const unlockAccountRequest = async (data: { email: string; expiredToken: string }) => {
  return await authApiClient.unlockAccountRequest(data.email, data.expiredToken);
};

export const updateUserProfile = async (data: { name?: string; email?: string }) => {
  return await authApiClient.updateUserProfile(data);
};

