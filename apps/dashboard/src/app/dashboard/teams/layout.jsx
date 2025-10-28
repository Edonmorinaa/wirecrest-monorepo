import { redirect } from 'next/navigation';
import { auth } from '@wirecrest/auth-next';

export default async function TeamsLayout({ children }) {
  const session = await auth();
  
  // If not authenticated, redirect to login
  if (!session?.user?.id) {
    redirect('/auth/sign-in');
  }
  
  // Teams pages are accessible to all authenticated users
  return <>{children}</>;
}
