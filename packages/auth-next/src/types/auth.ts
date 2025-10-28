import { User } from '@wirecrest/auth-core';

export interface AuthState {
  user: User | null;
  loading: boolean;
  authenticated: boolean;
  unauthenticated: boolean;
}

export interface AuthContextValue extends AuthState {
  checkUserSession: () => Promise<void>;
  signIn: (options?: any) => Promise<any>;
  signOut: () => Promise<void>;
  session?: any;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  email: string;
  password: string;
  displayName?: string;
}
