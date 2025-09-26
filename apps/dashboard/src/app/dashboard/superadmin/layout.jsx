import { redirect } from 'next/navigation';
import { getSession } from '@wirecrest/auth/server';
import { SuperRole } from '@prisma/client';
import { NotFoundView } from 'src/sections/error/not-found-view';
import { getAuthUrl } from '@/lib/subdomain';

export default async function SuperAdminLayout({ children }) {
  const session = await getSession();
  
  // If not authenticated, redirect to auth subdomain
  if (!session?.user?.id) {
    redirect(getAuthUrl('/sign-in'));
  }
  
  // If not super admin, show 404 component
  if (session.user.superRole !== SuperRole.ADMIN) {
    return <NotFoundView />;
  }
  
  return <>{children}</>;
}
