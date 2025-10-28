'use client';

import { ReactNode } from 'react';
import { NextAuthProvider } from '../providers/NextAuthProvider';

/**
 * Main auth wrapper that handles all authentication logic
 * This is the only component apps need to wrap their app with
 */
interface AuthWrapperProps {
  children: ReactNode;
}

export function AuthWrapper({ children }: AuthWrapperProps) {
  return (
    <NextAuthProvider>
      {children}
    </NextAuthProvider>
  );
}
