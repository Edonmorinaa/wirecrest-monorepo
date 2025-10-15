import NextAuth, { type Account, type Profile, type User } from 'next-auth';
import type { NextAuthConfig } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { PrismaAdapter } from '@auth/prisma-adapter';
import type { Provider } from 'next-auth/providers';
import { Role } from '@prisma/client';
import { prisma } from '@wirecrest/db';
import { validateRecaptcha } from '../utils/recaptcha';
import { isEmailAllowed } from '../utils/email';
import { 
  exceededLoginAttemptsThreshold, 
  incrementLoginAttempts, 
  clearLoginAttempts 
} from '../utils/accountLock';
import { maxLengthPolicies } from '../utils/policies';
import * as bcrypt from 'bcryptjs';

// Helper functions (these need to be implemented)
const getAccount = async (params: { userId: string }) => {
  return await prisma.account.findFirst({ where: { userId: params.userId } });
};

const addTeamMember = async (teamId: string, userId: string, role: Role) => {
  return await prisma.teamMember.create({
    data: { teamId, userId, role }
  });
};

const getTeam = async (params: { id: string }) => {
  return await prisma.team.findUnique({ where: { id: params.id } });
};

const createUser = async (data: { name: string; email: string }) => {
  return await prisma.user.create({ data });
};

const getUser = async (params: { email: string }) => {
  return await prisma.user.findUnique({ where: { email: params.email } });
};

const verifyPassword = async (password: string, hashedPassword: string) => {
  return await bcrypt.compare(password, hashedPassword);
};

const sendMagicLink = async (email: string, url: string) => {
  // Implement email sending logic
  console.log(`Magic link for ${email}: ${url}`);
};

const slackNotify = () => {
  // Implement Slack notification
  return {
    alert: (data: any) => console.log('Slack notification:', data)
  };
};

const forceConsume = (response: Response) => {
  // Implement response consumption
};

const adapter = PrismaAdapter(prisma);
const providers: Provider[] = [];
const sessionMaxAge = 14 * 24 * 60 * 60; // 14 days
const useSecureCookie = process.env.NEXTAUTH_URL?.startsWith('https://') || false;
const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'wirecrest.local:3032';
const rootDomainFormatted = rootDomain.split(':')[0];
const cookieDomain = process.env.NODE_ENV === 'production' ? `.${rootDomainFormatted}` : '.wirecrest.local'; // Use '.wirecrest.local' for local subdomain testing
const cookiePrefix = useSecureCookie ? '__Secure-' : '';

export const sessionTokenCookieName =
  (useSecureCookie ? '__Secure-' : '') + 'next-auth.session-token';

  providers.push(
    CredentialsProvider({
      id: 'credentials',
      credentials: {
        email: { type: 'email' },
        password: { type: 'password' },
        recaptchaToken: { type: 'text' },
      },
      async authorize(credentials, req) {
        if (!credentials) {
          throw new Error('no-credentials');
        }

        const { email, password, recaptchaToken } = credentials;

        await validateRecaptcha(recaptchaToken as string);

        if (!email || !password) {
          return null;
        }

        const user = await getUser({ email: email as string });

        if (!user) {
          throw new Error('invalid-credentials');
        }

        if (exceededLoginAttemptsThreshold(user)) {
          throw new Error('exceeded-login-attempts');
        }

        if (process.env.CONFIRM_EMAIL === 'true' && !user.emailVerified) {
          throw new Error('confirm-your-email');
        }

        const hasValidPassword = await verifyPassword(password as string, user?.password as string);

        if (!hasValidPassword) {
          if (exceededLoginAttemptsThreshold(await incrementLoginAttempts(user))) {
            throw new Error('exceeded-login-attempts');
          }

          throw new Error('invalid-credentials');
        }

        await clearLoginAttempts(user);

        return user;
      },
    })
  );


const authConfig: NextAuthConfig = {
  debug: process.env.NODE_ENV === 'development',
  adapter,
  providers,
  pages: {
    signIn: '/sign-in',
    verifyRequest: '/verify',
  },
  session: {
    strategy: (process.env.NEXTAUTH_SESSION_STRATEGY as 'jwt' | 'database') || 'jwt',
    maxAge: sessionMaxAge,
  },
  secret: process.env.NEXTAUTH_SECRET,
  cookies: {
    sessionToken: {
      name: sessionTokenCookieName,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: useSecureCookie,
        ...(cookieDomain && { domain: cookieDomain }),
      },
    },
    callbackUrl: {
      name: cookiePrefix + 'next-auth.callback-url',
      options: {
        sameSite: 'lax',
        path: '/',
        secure: useSecureCookie,
        ...(cookieDomain && { domain: cookieDomain }),
      },
    },
    csrfToken: {
      // Use __Secure- prefix instead of __Host- to allow domain-wide sharing
      name: cookiePrefix + 'next-auth.csrf-token',
      options: {
        httpOnly: true, 
        sameSite: 'lax',
        path: '/',
        secure: useSecureCookie,
        ...(cookieDomain && { domain: cookieDomain }),
      },
    },
    pkceCodeVerifier: {
      name: cookiePrefix + 'next-auth.pkce.code_verifier',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: useSecureCookie,
        maxAge: 60 * 15,
        ...(cookieDomain && { domain: cookieDomain }),
      },
    },
    state: {
      name: cookiePrefix + 'next-auth.state',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: useSecureCookie,
        maxAge: 60 * 15,
        ...(cookieDomain && { domain: cookieDomain }),
      },
    },
    nonce: {
      // Use __Secure- prefix instead of __Host- to allow domain-wide sharing
      name: cookiePrefix + 'next-auth.nonce',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: useSecureCookie,
        ...(cookieDomain && { domain: cookieDomain }),
      },
    },
  },
  callbacks: {
    async signIn({ user, account, profile }: { user: User; account: Account | null; profile?: Profile }) {
      if (!user || !user.email || !account) {
        return false;
      }

      if (!isEmailAllowed(user.email)) {
        return '/auth/login?error=allow-only-work-email';
      }

      const existingUser = await getUser({ email: user.email });
      const isIdpLogin = account.provider === 'boxyhq-idp';

      if (account?.provider === 'credentials') {
        return true;
      }

      // Login via email (Magic Link)
      if (account?.provider === 'email') {
        return Boolean(existingUser);
      }

      // First time users
      if (!existingUser) {
        const newUser = await createUser({
          name: `${user.name}`,
          email: `${user.email}`,
        });

        await linkAccount(newUser, account);

        if (isIdpLogin && user) {
          await linkToTeam(user as unknown as Profile, newUser.id);
        }

        if (account.provider === 'boxyhq-saml' && profile) {
          await linkToTeam(profile, newUser.id);
        }

        slackNotify()?.alert({
          text: 'New user signed up',
          fields: {
            Name: user.name || '',
            Email: user.email,
          },
        });

        return true;
      }

      const linkedAccount = await getAccount({ userId: existingUser.id });

      if (!linkedAccount) {
        await linkAccount(existingUser, account);
      }

      return true;
    },

    async session({ session, token, user }: { session: any; token: any; user?: User }) {
      // When using JWT for sessions, the JWT payload (token) is provided.
      // When using database sessions, the User (user) object is provided.
      if (session && (token || user)) {
        session.user.id = token?.sub || user?.id;

        // Get superRole from token (for JWT) or user (for database sessions)
        if (token?.superRole) {
          session.user.superRole = token.superRole as any;
        } else if (user && 'superRole' in user) {
          session.user.superRole = (user as any).superRole;
        }
        session.user.teamId = token?.teamId || (user as any)?.teamId;
        session.user.team = token?.team || (user as any)?.team;
      }

      if (user?.name) {
        user.name = user.name.substring(0, maxLengthPolicies.name);
      }
      if (session?.user?.name) {
        session.user.name = session.user.name.substring(0, maxLengthPolicies.name);
      }

      return session;
    },

    async jwt({ token, user, account, trigger, session }: { token: any; user?: User; account?: Account | null; trigger?: string; session?: any }) {
      if (trigger === 'signIn' && account?.provider === 'boxyhq-idp') {
        const userByAccount = await adapter.getUserByAccount!({
          providerAccountId: account.providerAccountId,
          provider: account.provider,
        });

        return { ...token, sub: userByAccount?.id };
      }

      if (trigger === 'update' && 'name' in session && session.name) {
        return { ...token, name: session.name };
      }

      // Add superRole, teamId, and team to JWT token on sign in or if missing
      if (token.sub && (!token.superRole || !token.teamId)) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.sub },
          select: { 
            superRole: true,
            teamMembers: {
              include: {
                team: {
                  select: {
                    id: true,
                    name: true,
                    slug: true
                  }
                }
              },
              take: 1,
              orderBy: {
                createdAt: 'asc' // Get the first team the user joined
              }
            }
          },
        });

        if (dbUser?.superRole) {
          token.superRole = dbUser.superRole;
        }
        
        // Get the user's primary team (first team they joined)
        const primaryTeamMember = dbUser?.teamMembers?.[0];
        if (primaryTeamMember) {
          token.teamId = primaryTeamMember.teamId;
          token.team = primaryTeamMember.team;
        }
      }

      return token;
    },
  },
};

const linkAccount = async (user: User, account: Account) => {
  if (adapter.linkAccount) {
    return await adapter.linkAccount({
      providerAccountId: account.providerAccountId,
      userId: user.id || '',
      provider: account.provider || 'unknown',
      type: 'oauth',
      scope: account.scope,
      token_type: account.token_type,
      access_token: account.access_token,
    });
  }
};

const linkToTeam = async (profile: Profile, userId: string) => {
  const team = await getTeam({
    id: (profile as any).requested?.tenant,
  });

  if (!team) return;

  // Sort out roles
  const roles = (profile as any).roles || (profile as any).groups || [];
  let userRole: Role = team.defaultRole || Role.MEMBER;

  for (let role of roles) {
    if (process.env.GROUP_PREFIX) {
      role = role.replace(process.env.GROUP_PREFIX, '');
    }

    // Owner > Admin > Member
    if (role.toUpperCase() === Role.ADMIN && userRole.toUpperCase() !== Role.OWNER.toUpperCase()) {
      userRole = Role.ADMIN;
      continue;
    }

    if (role.toUpperCase() === Role.OWNER) {
      userRole = Role.OWNER;
      break;
    }
  }

  await addTeamMember(team.id, userId, userRole);
};

// Export NextAuth v5 configuration
export const { handlers, signIn, signOut, auth } = NextAuth(authConfig);

// Legacy export for backward compatibility during migration
export const getAuthOptions = () => authConfig;

// Export the configuration for NextAuth v4 compatibility
export const authOptions = authConfig;