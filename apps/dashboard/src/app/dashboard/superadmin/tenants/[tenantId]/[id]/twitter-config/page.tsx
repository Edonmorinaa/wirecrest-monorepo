import { Metadata } from 'next';
import { prisma } from '@wirecrest/db';
import { notFound } from 'next/navigation';
import { SuperRole } from '@prisma/client';
import { getSession } from '@wirecrest/auth-next';
import { DashboardContent } from '@/layouts/dashboard';
import TwitterConfigManagement from '@/sections/superadmin/TwitterConfigManagement';

// ----------------------------------------------------------------------

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;

  const tenant = await prisma.team.findUnique({
    where: { id },
    select: { name: true },
  });

  return {
    title: `Twitter Configuration - ${tenant?.name || 'Tenant'} | Super Admin`,
    description: 'Manage Twitter profile configuration for tenant',
  };
}

export default async function SuperAdminTenantTwitterConfigPage({ params }: Props) {
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

  const { id } = await params;

  // Verify tenant exists
  const tenant = await prisma.team.findUnique({
    where: { id },
    select: { id: true, name: true, slug: true },
  });

  if (!tenant) {
    notFound();
  }

  return (
    <DashboardContent
      title="Twitter Profile Configuration"
      subtitle={`Managing configuration for ${tenant.name}`}
    >
      <TwitterConfigManagement tenantId={id} />
    </DashboardContent>
  );
}
