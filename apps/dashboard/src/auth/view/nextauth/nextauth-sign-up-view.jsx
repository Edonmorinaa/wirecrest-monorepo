'use client';

import * as z from 'zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { joinUser } from '@wirecrest/auth-next';
import { useBoolean } from 'minimal-shared/hooks';
import { zodResolver } from '@hookform/resolvers/zod';

import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';
import { RouterLink } from 'src/routes/components';

import { Iconify } from 'src/components/iconify';
import { Form, Field, schemaUtils } from 'src/components/hook-form';

import { FormHead } from '../../components/form-head';

// ----------------------------------------------------------------------

export const SignUpSchema = z.object({
  name: z.string().min(1, { message: 'Full name is required!' }),
  email: schemaUtils.email(),
  password: z
    .string()
    .min(1, { message: 'Password is required!' })
    .min(8, { message: 'Password must be at least 8 characters!' }),
  team: z.string().min(1, { message: 'Team name is required!' }),
});

// ----------------------------------------------------------------------

export function NextAuthSignUpView() {
  const router = useRouter();
  const showPassword = useBoolean();

  const [errorMessage, setErrorMessage] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  const defaultValues = {
    name: '',
    email: '',
    password: '',
    team: '',
  };

  const methods = useForm({
    resolver: zodResolver(SignUpSchema),
    defaultValues,
  });

  const {
    handleSubmit,
    formState: { isSubmitting },
  } = methods;

  const onSubmit = handleSubmit(async (data) => {
    try {
      setErrorMessage(null);

      console.log('onSubmit', data);
      const result = await joinUser({
        name: data.name,
        email: data.email,
        password: data.password,
        team: data.team,
        recaptchaToken: '', // Empty string as recaptcha is optional
      });

      if (result.data.confirmEmail) {
        setSuccessMessage(
          'Account created successfully! Please check your email to verify your account before signing in.'
        );
      } else {
        setSuccessMessage('Account created successfully! You can now sign in.');
        setTimeout(() => {
          router.push(paths.auth.nextauth.signIn);
        }, 2000);
      }
    } catch (error) {
      console.error('Sign up error:', error);
      const message = error.message || 'Failed to create account. Please try again.';
      setErrorMessage(message);
    }
  });

  const renderForm = () => (
    <Box sx={{ gap: 3, display: 'flex', flexDirection: 'column' }}>
      <Field.Text
        name="name"
        label="Full name"
        slotProps={{ inputLabel: { shrink: true } }}
        placeholder="Enter your full name"
      />

      <Field.Text
        name="email"
        label="Email address"
        slotProps={{ inputLabel: { shrink: true } }}
        placeholder="Enter your work email"
      />

      <Field.Text
        name="team"
        label="Team name"
        slotProps={{ inputLabel: { shrink: true } }}
        placeholder="Enter your team or company name"
      />

      <Field.Text
        name="password"
        label="Password"
        placeholder="8+ characters"
        type={showPassword.value ? 'text' : 'password'}
        slotProps={{
          inputLabel: { shrink: true },
          input: {
            endAdornment: (
              <InputAdornment position="end">
                <IconButton onClick={showPassword.onToggle} edge="end">
                  <Iconify icon={showPassword.value ? 'solar:eye-bold' : 'solar:eye-closed-bold'} />
                </IconButton>
              </InputAdornment>
            ),
          },
        }}
      />

      <Button
        fullWidth
        color="inherit"
        size="large"
        type="submit"
        variant="contained"
        loading={isSubmitting}
        loadingIndicator="Creating account..."
      >
        Create account
      </Button>
    </Box>
  );

  return (
    <>
      <FormHead
        title="Get started absolutely free"
        description={
          <>
            {`Already have an account? `}
            <Link component={RouterLink} href={paths.auth.nextauth.signIn} variant="subtitle2">
              Sign in
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
