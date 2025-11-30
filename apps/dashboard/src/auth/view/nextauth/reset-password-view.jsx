'use client';

import * as z from 'zod';
import * as React from 'react';
import { useForm } from 'react-hook-form';
import { forgotPassword } from '@wirecrest/auth-next';
import { zodResolver } from '@hookform/resolvers/zod';

import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';

import { useRouter } from 'src/routes/hooks/use-router';

import { PasswordIcon } from 'src/assets/icons';

import { Form, Field, schemaUtils } from 'src/components/hook-form';

import { FormHead } from '../../components/form-head';
import { FormReturnLink } from '../../components/form-return-link';

// ----------------------------------------------------------------------

export const ResetPasswordSchema = z.object({
  email: schemaUtils.email(),
});

// ----------------------------------------------------------------------

export function NextAuthResetPasswordView() {
  const router = useRouter();
  const [error, setError] = React.useState(null);
  const [success, setSuccess] = React.useState(false);

  const defaultValues = {
    email: '',
  };

  const methods = useForm({
    resolver: zodResolver(ResetPasswordSchema),
    defaultValues,
  });

  const {
    handleSubmit,
    formState: { isSubmitting },
  } = methods;

  const onSubmit = handleSubmit(async (data) => {
    try {
      setError(null);
      setSuccess(false);
      
      // Call auth-service API
      await forgotPassword({
        email: data.email.toLowerCase(),
        // recaptchaToken is optional until reCAPTCHA is implemented
      });

      setSuccess(true);
      
      // Optionally redirect after a delay
      setTimeout(() => {
        router.push('/sign-in');
      }, 3000);
    } catch (err) {
      console.error('Password reset error:', err);
      const errorMessage =
        err?.response?.data?.message ||
        err?.message ||
        'Failed to send password reset email. Please try again.';
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
          Password reset email sent! Please check your inbox. Redirecting to sign in...
        </Alert>
      )}

      <Field.Text
        autoFocus
        name="email"
        label="Email address"
        placeholder="example@gmail.com"
        slotProps={{ inputLabel: { shrink: true } }}
        disabled={success}
      />

      <Button
        fullWidth
        size="large"
        type="submit"
        variant="contained"
        loading={isSubmitting}
        loadingIndicator="Send request..."
        disabled={success}
      >
        Send request
      </Button>
    </Box>
  );

  return (
    <>
      <FormHead
        icon={<PasswordIcon />}
        title="Forgot your password?"
        description={`Please enter the email address associated with your account and we'll email you a link to reset your password.`}
      />

      <Form methods={methods} onSubmit={onSubmit}>
        {renderForm()}
      </Form>

      <FormReturnLink href="/sign-in" />
    </>
  );
}
