'use client';

import * as z from 'zod';
import { useState } from 'react';
import { signIn } from '@wirecrest/auth-next';
import { useForm } from 'react-hook-form';
import { useSearchParams } from 'next/navigation';
import { useBoolean } from 'minimal-shared/hooks';
import { zodResolver } from '@hookform/resolvers/zod';

import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { Iconify } from 'src/components/iconify';
import { Form, Field, schemaUtils } from 'src/components/hook-form';

import { FormHead } from '../../components/form-head';

// ----------------------------------------------------------------------

export const SignInSchema = z.object({
  email: schemaUtils.email(),
  password: z
    .string()
    .min(1, { message: 'Password is required!' })
    .min(6, { message: 'Password must be at least 6 characters!' }),
});

// ----------------------------------------------------------------------

export function NextAuthSignInView() {
  const searchParams = useSearchParams();
  const showPassword = useBoolean();

  const [errorMessage, setErrorMessage] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Check for URL parameters
  const error = searchParams.get('error');
  const verified = searchParams.get('verified');

  // Set messages based on URL params
  useState(() => {
    if (error === 'allow-only-work-email') {
      setErrorMessage('Please use a work email address to sign in.');
    } else if (error) {
      setErrorMessage('Sign in failed. Please check your credentials.');
    }

    if (verified === 'true') {
      setSuccessMessage('Email verified successfully! You can now sign in.');
    }
  }, [error, verified]);

  const defaultValues = {
    email: '',
    password: '',
  };

  const methods = useForm({
    resolver: zodResolver(SignInSchema),
    defaultValues,
  });

  const {
    handleSubmit,
    formState: { isSubmitting },
  } = methods;

  const onSubmit = handleSubmit(async (data) => {
    try {
      setErrorMessage(null);

      const result = await signIn('credentials', {
        email: data.email,
        password: data.password,
        redirect: false, // Don't redirect automatically, handle it ourselves
      });

      if (result?.error) {
        if (result.error === 'CredentialsSignin' || result.error === 'invalid-credentials') {
          setErrorMessage('Invalid email or password.');
        } else if (result.error === 'Please verify your email before signing in') {
          setErrorMessage(
            'Please verify your email before signing in. Check your inbox for a verification link.'
          );
        } else {
          setErrorMessage('Sign in failed. Please try again.');
        }
      } else if (result?.ok) {
        // Sign in successful, redirect to our redirect page
        window.location.href = '/redirect';
      }
    } catch (err) {
      console.error('Sign in error:', err);
      setErrorMessage('An unexpected error occurred. Please try again.');
    }
  });

  const renderForm = () => (
    <Box sx={{ gap: 3, display: 'flex', flexDirection: 'column' }}>
      <Field.Text
        name="email"
        label="Email address"
        slotProps={{ inputLabel: { shrink: true } }}
        placeholder="Enter your work email"
      />

      <Box sx={{ gap: 1.5, display: 'flex', flexDirection: 'column' }}>
        <Link
          component={RouterLink}
          href="/forgot-password"
          variant="body2"
          color="inherit"
          sx={{ alignSelf: 'flex-end' }}
        >
          Forgot password?
        </Link>

        <Field.Text
          name="password"
          label="Password"
          placeholder="6+ characters"
          type={showPassword.value ? 'text' : 'password'}
          slotProps={{
            inputLabel: { shrink: true },
            input: {
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton onClick={showPassword.onToggle} edge="end">
                    <Iconify
                      icon={showPassword.value ? 'solar:eye-bold' : 'solar:eye-closed-bold'}
                    />
                  </IconButton>
                </InputAdornment>
              ),
            },
          }}
        />
      </Box>

      <Button
        fullWidth
        color="inherit"
        size="large"
        type="submit"
        variant="contained"
        loading={isSubmitting}
        loadingIndicator="Signing in..."
      >
        Sign in
      </Button>
    </Box>
  );

  return (
    <>
      <FormHead
        title="Sign in to your account"
        description={
          <>
            {`Don't have an account? `}
            <Link component={RouterLink} href={paths.auth.jwt.signUp} variant="subtitle2">
              Get started
            </Link>
          </>
        }
        sx={{ textAlign: { xs: 'center', md: 'left' } }}
      />

      {!!successMessage && (
        <Alert severity="success" sx={{ mb: 3 }}>
          {successMessage}
        </Alert>
      )}

      {!!errorMessage && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {errorMessage}
        </Alert>
      )}

      <Form methods={methods} onSubmit={onSubmit}>
        {renderForm()}
      </Form>
    </>
  );
}
