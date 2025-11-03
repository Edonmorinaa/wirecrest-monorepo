import { redirect } from 'next/navigation';
import { SuperRole } from '@prisma/client';
import { auth } from '@wirecrest/auth-next';
import { getAuthDomainUrl } from '@/lib/subdomain-config';

import { NotFoundView } from 'src/sections/error/not-found-view';

export default async function SuperAdminLayout({ children }) {
  const session = await auth();
  
  // If not authenticated, redirect to auth subdomain
  if (!session?.user?.id) {
    redirect(getAuthDomainUrl());
  }
  
  // If not super admin, show 404 component
  if (session.user.superRole !== SuperRole.ADMIN) {
    return <NotFoundView />;
  }
  
  return <>{children}</>;
}
