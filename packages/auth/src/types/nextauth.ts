import { User as PrismaUser, SuperRole, Team } from '@prisma/client';

// Extend NextAuth types with our Prisma types
declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      image?: string | null;
      role?: string;
      superRole?: SuperRole;
      teamId?: string;
      team?: Team;
    };
    accessToken?: string;
  }

  interface User extends PrismaUser {}
}

declare module 'next-auth/jwt' {
  interface JWT {
    role?: string;
    superRole?: SuperRole;
    teamId?: string;
    team?: Team;
  }
}
