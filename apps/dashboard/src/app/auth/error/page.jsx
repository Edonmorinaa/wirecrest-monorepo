'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { SplashScreen } from 'src/components/loading-screen';

// ----------------------------------------------------------------------

function ErrorContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');

  const getErrorMessage = (error) => {
    switch (error) {
      case 'Configuration':
        return 'There is a problem with the server configuration.';
      case 'AccessDenied':
        return 'You do not have permission to sign in.';
      case 'Verification':
        return 'The verification token has expired or has already been used.';
      case 'Default':
        return 'An error occurred during sign in.';
      case 'invalid-credentials':
        return 'Invalid email or password.';
      case 'allow-only-work-email':
        return 'Only work email addresses are allowed.';
      default:
        return 'An error occurred during sign in.';
    }
  };

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center', 
      minHeight: '100vh',
      padding: '20px',
      textAlign: 'center'
    }}>
      <h1 style={{ color: '#d32f2f', marginBottom: '16px' }}>
        Sign In Error
      </h1>
      
      <p style={{ marginBottom: '24px', fontSize: '16px' }}>
        {getErrorMessage(error)}
      </p>
      
      <RouterLink 
        href={paths.auth.signIn}
        style={{
          padding: '12px 24px',
          backgroundColor: '#1976d2',
          color: 'white',
          textDecoration: 'none',
          borderRadius: '4px',
          fontWeight: '500'
        }}
      >
        Try Again
      </RouterLink>
    </div>
  );
}

// ----------------------------------------------------------------------

export default function AuthErrorPage() {
  return (
    <Suspense fallback={<SplashScreen slots={{}} slotProps={{}} sx={{}} />}>
      <ErrorContent />
    </Suspense>
  );
}
