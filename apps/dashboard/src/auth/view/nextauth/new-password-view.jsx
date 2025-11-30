'use client';

import * as z from 'zod';
import * as React from 'react';
import { useForm } from 'react-hook-form';
import { useBoolean } from 'minimal-shared/hooks';
import { resetPassword } from '@wirecrest/auth-next';
import { zodResolver } from '@hookform/resolvers/zod';

import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';

import { useParams, useRouter } from 'src/routes/hooks';

import { PasswordIcon } from 'src/assets/icons';

import { Iconify } from 'src/components/iconify';
import { Form, Field } from 'src/components/hook-form';

import { FormHead } from '../../components/form-head';
import { FormReturnLink } from '../../components/form-return-link';

// ----------------------------------------------------------------------

export const NewPasswordSchema = z
  .object({
    password: z
      .string()
      .min(1, { message: 'Password is required!' })
      .min(8, { message: 'Password must be at least 8 characters!' }),
    confirmPassword: z.string().min(1, { message: 'Confirm password is required!' }),
  })
  .refine((val) => val.password === val.confirmPassword, {
    message: 'Passwords do not match!',
    path: ['confirmPassword'],
  });

// ----------------------------------------------------------------------

export function NextAuthNewPasswordView() {
  const params = useParams();
  const router = useRouter();
  const showPassword = useBoolean();
  const [error, setError] = React.useState(null);
  const [success, setSuccess] = React.useState(false);

  const token = params?.token || '';

  const defaultValues = {
    password: '',
    confirmPassword: '',
  };

  const methods = useForm({
    resolver: zodResolver(NewPasswordSchema),
    defaultValues,
  });

  const {
    handleSubmit,
    formState: { isSubmitting },
  } = methods;

  React.useEffect(() => {
    if (!token) {
      setError('Invalid reset token. Please request a new password reset link.');
    }
  }, [token]);

  const onSubmit = handleSubmit(async (data) => {
    try {
      setError(null);
      setSuccess(false);

      if (!token) {
        setError('Invalid reset token. Please request a new password reset link.');
        return;
      }

      // Call auth-service API
      await resetPassword({
        token,
        password: data.password,
      });

      setSuccess(true);

      // Redirect to sign in after a delay
      setTimeout(() => {
        router.push('/sign-in');
      }, 2000);
    } catch (err) {
      console.error('Password reset error:', err);
      const errorMessage =
        err?.response?.data?.message ||
        err?.message ||
        'Failed to reset password. The token may be invalid or expired. Please request a new password reset link.';
      setError(errorMessage);
    }
  });

  const renderForm = () => (
    <Box sx={{ gap: 3, display: 'flex', flexDirection: 'column' }}>
      {error && (
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success">
          Password reset successfully! Redirecting to sign in...
        </Alert>
      )}

      <Field.Text
        autoFocus
        name="password"
        label="New password"
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
        disabled={success || !token}
      />

      <Field.Text
        name="confirmPassword"
        label="Confirm new password"
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
        disabled={success || !token}
      />

      <Button
        fullWidth
        size="large"
        type="submit"
        variant="contained"
        loading={isSubmitting}
        loadingIndicator="Resetting password..."
        disabled={success || !token}
      >
        Reset password
      </Button>
    </Box>
  );

  return (
    <>
      <FormHead
        icon={<PasswordIcon />}
        title="Reset your password"
        description={`Enter your new password below. Make sure it's at least 8 characters long.`}
      />

      <Form methods={methods} onSubmit={onSubmit}>
        {renderForm()}
      </Form>

      <FormReturnLink href="/sign-in" />
    </>
  );
}

