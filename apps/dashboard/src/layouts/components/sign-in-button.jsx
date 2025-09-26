import Button from '@mui/material/Button';

import { RouterLink } from 'src/routes/components';
import { getSubdomainUrl } from 'src/lib/subdomain-config';

// ----------------------------------------------------------------------

export function SignInButton({ sx, ...other }) {
  // Get the auth subdomain URL for sign-in
  const authUrl = getSubdomainUrl('auth', '/sign-in');
  
  return (
    <Button
      component={RouterLink}
      href={authUrl}
      variant="outlined"
      sx={sx}
      {...other}
    >
      Sign in
    </Button>
  );
}
