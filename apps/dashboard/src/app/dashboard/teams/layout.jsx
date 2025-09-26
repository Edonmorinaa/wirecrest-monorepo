import { redirect } from 'next/navigation';
import { getSession } from '@wirecrest/auth/server';

export default async function TeamsLayout({ children }) {
  const session = await getSession();
  
  // If not authenticated, redirect to login
  if (!session?.user?.id) {
    redirect('/auth/sign-in');
  }
  
  // Teams pages are accessible to all authenticated users
  return <>{children}</>;
}
