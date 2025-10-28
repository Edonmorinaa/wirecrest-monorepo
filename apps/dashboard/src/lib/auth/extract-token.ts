import { SignJWT } from 'jose';
import { Session } from 'next-auth';


export async function getBearerTokenFromSession(session: Session) {
  if (!session?.user?.id) throw new Error('No session user found');

  const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET);
  const now = Math.floor(Date.now() / 1000);

  return await new SignJWT({
    sub: session.user.id,
    email: session.user.email,
    name: session.user.name,
    superRole: session.user.superRole,
    teamId: session.user.teamId,
    team: session.user.team,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt(now)
    .setExpirationTime(now + 60 * 5) // 5 minutes
    .sign(secret);
}
