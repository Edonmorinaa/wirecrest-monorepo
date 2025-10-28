import { Metadata } from 'next';
import { prisma } from '@wirecrest/db';
import { notFound } from 'next/navigation';
import { SuperRole } from '@prisma/client';
import { getSession } from '@wirecrest/auth-next';
import { DashboardContent } from '@/layouts/dashboard';
import TwitterConfigList from '@/sections/superadmin/TwitterConfigList';

export const metadata: Metadata = {
  title: 'Twitter Configurations | Super Admin',
  description: 'Manage Twitter profile configurations for all tenants',
};

export default async function SuperAdminTwitterConfigsPage() {
  const session = await getSession();

  if (!session?.user?.id) {
    notFound();
  }

  // Check if user is super admin
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { superRole: true },
  });

  if (!user || user.superRole !== SuperRole.ADMIN) {
    notFound();
  }

  return (
    <DashboardContent
      title="Twitter Profile Configurations"
      subtitle="Manage Twitter profile settings for all tenants"
    >
      <TwitterConfigList />
    </DashboardContent>
  );
}
