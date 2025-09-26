import { auth } from '../config/nextAuth';

/**
 * Server-side session function that uses NextAuth v5 auth function
 * This should be used in API routes and server components
 */
export const getSession = async () => {
  // Only import server-side dependencies when actually called
  if (typeof window !== 'undefined') {
    throw new Error('getSession can only be called on the server side');
  }
  
  try {

    const session = await auth();
    return session;
  } catch (error) {
    console.error('Get session error:', error);
    throw error;
  }
};

/**
 * Server-side user function that extracts user from session using NextAuth v5
 */
export const getUser = async () => {
  // Only import server-side dependencies when actually called
  if (typeof window !== 'undefined') {
    throw new Error('getUser can only be called on the server side');
  }
  
  try {
    const session = await auth();
    return session?.user || null;
  } catch (error) {
    console.error('Get user error:', error);
    throw error;
  }
};
