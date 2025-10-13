import { redirect } from 'next/navigation';
import { SuperRole } from '@prisma/client';
import { getAuthUrl } from '@/lib/subdomain';
import { getSession } from '@wirecrest/auth/server';

import { NotFoundView } from 'src/sections/error/not-found-view';

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
