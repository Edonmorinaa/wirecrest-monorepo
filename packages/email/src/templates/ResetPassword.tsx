import {
  Button,
  Container,
  Head,
  Html,
  Preview,
  Text,
} from '@react-email/components';
import EmailLayout from './EmailLayout';
import { ResetPasswordProps } from '../types/email';

const ResetPasswordEmail = ({
  url,
  subject,
  email,
}: ResetPasswordProps) => {
  return (
    <Html>
      <Head />
      <Preview>{subject}</Preview>
      <EmailLayout>
        <Text>Hello,</Text>
        <Text>
          You requested a password reset for your account ({email}). Click the
          button below to reset your password:
        </Text>
        <Container className="text-center">
          <Button
            href={url}
            className="bg-brand text-white font-medium py-2 px-4 rounded"
          >
            Reset Password
          </Button>
        </Container>
        <Text>
          If you did not request this password reset, you can safely ignore this
          email.
        </Text>
        <Text>
          This link will expire in 1 hour for security reasons.
        </Text>
      </EmailLayout>
    </Html>
  );
};

export default ResetPasswordEmail;
