import { useCallback } from 'react';
import { signOut } from '@wirecrest/auth-next';
import { getAuthUrl } from '@/lib/subdomain';

import Button from '@mui/material/Button';

import { toast } from 'src/components/snackbar';

export function SignOutButton({ onClose, sx, ...other }) {

  const handleLogout = useCallback(async () => {
    try {
      // Get the auth URL and log it for debugging
      const authUrl = getAuthUrl('/auth/sign-in');
      console.log('Logout redirect URL:', authUrl);
      
      // Sign out and redirect to auth subdomain sign-in page
      await signOut({ redirect: true, redirectTo: authUrl });

      onClose?.();
    } catch (error) {
      console.error(error);
      toast.error('Unable to logout!');
    }
  }, [onClose]);

  return (
    <Button
      fullWidth
      variant="soft"
      size="large"
      color="error"
      onClick={handleLogout}
      sx={sx}
      {...other}
    >
      Logout
    </Button>
  );
}
