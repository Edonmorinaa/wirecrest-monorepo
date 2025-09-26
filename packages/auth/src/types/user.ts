import { User as PrismaUser, Team } from '@prisma/client';

// Re-export Prisma types
export type { User as PrismaUser, Team } from '@prisma/client';

// Extended User interface for frontend use
export interface User extends PrismaUser {
  team?: Team;
}

export interface UseUserReturn {
  user: User | null;
  loading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  refresh: () => Promise<any>;
}
