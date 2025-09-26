'use client';

import { useSession } from 'next-auth/react';

import { useMemo } from 'react';
import { 
  forgotPassword, 
  resetPassword, 
  updatePassword, 
  joinUser, 
  resendEmailVerification, 
  unlockAccountRequest,
  getUserSessions,
  deleteUserSession,
  updateUserProfile
} from '../actions/authActions';
import { SuperResource, SuperAction, getUserSuperRoleConfig, userHasPermission } from '../lib/rbac';
import { SuperRole, Team } from '@prisma/client';

/**
 * Complete authentication hook that abstracts away NextAuth
 * Provides a clean interface for all auth operations - NO UI
 */
export const useAuth = () => {
  const { data: session, status } = useSession();

  // Session state
  const user = useMemo(() => {
    if (!session?.user) return null;
    
    return {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
      image: session.user.image,
      role: (session.user as { role?: string }).role,
      superRole: (session.user as { superRole?: SuperRole }).superRole,
      teamId: (session.user as { teamId?: string }).teamId,
      team: (session.user as { team?: Team }).team,
    };
  }, [session?.user]);

  const loading = status === 'loading';
  const authenticated = status === 'authenticated';
  const unauthenticated = status === 'unauthenticated';

  // Auth operations
  const authOperations = useMemo(() => ({
    // Password management
    forgotPassword: async (data: { email: string; recaptchaToken: string }) => {
      return await forgotPassword(data);
    },
    
    resetPassword: async (data: { token: string; password: string }) => {
      return await resetPassword(data);
    },
    
    updatePassword: async (data: { currentPassword: string; newPassword: string }) => {
      return await updatePassword(data);
    },
    
    // User management
    registerUser: async (data: {
      name: string;
      email: string;
      password: string;
      team?: string;
      inviteToken?: string;
      recaptchaToken: string;
    }) => {
      return await joinUser(data);
    },
    
    resendEmailVerification: async (data: { email: string }) => {
      return await resendEmailVerification(data);
    },
    
    unlockAccount: async (data: { email: string; expiredToken: string }) => {
      return await unlockAccountRequest(data);
    },
    
    // Profile management
    updateProfile: async (data: { name?: string; email?: string }) => {
      return await updateUserProfile(data);
    },
    
    // Session management
    getUserSessions: async () => {
      return await getUserSessions();
    },
    
    deleteSession: async (sessionId: string) => {
      return await deleteUserSession(sessionId);
    },
  }), []);

  // Role-based access control
  const rbac = useMemo(() => {
    const superRole = user?.superRole as SuperRole;
    const config = getUserSuperRoleConfig(superRole);
    
    return {
      superRole,
      config,
      isSuperAdmin: superRole === SuperRole.ADMIN,
      isSupport: superRole === SuperRole.SUPPORT,
      isTenant: superRole === SuperRole.TENANT,
      
      hasPermission: (resource: SuperResource, action: SuperAction) => {
        return userHasPermission(superRole, resource, action);
      },
      
      canManage: (resource: SuperResource) => {
        return userHasPermission(superRole, resource, SuperAction.MANAGE);
      },
      
      canRead: (resource: SuperResource) => {
        return userHasPermission(superRole, resource, SuperAction.READ);
      },
      
      canCreate: (resource: SuperResource) => {
        return userHasPermission(superRole, resource, SuperAction.CREATE);
      },
      
      canUpdate: (resource: SuperResource) => {
        return userHasPermission(superRole, resource, SuperAction.UPDATE);
      },
      
      canDelete: (resource: SuperResource) => {
        return userHasPermission(superRole, resource, SuperAction.DELETE);
      },
    };
  }, [user?.superRole]);

  return {
    // Session state
    user,
    session,
    loading,
    authenticated,
    unauthenticated,
    
    // Auth operations
    ...authOperations,
    
    // Role-based access control
    ...rbac,
  };
};
