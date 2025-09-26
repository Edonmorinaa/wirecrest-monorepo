import {
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
} from '@react-email/components';
import EmailLayout from './EmailLayout';
import { getAppConfig } from '../core/app';
import { VerificationEmailProps } from '../types/email';

const VerificationEmail = ({
  subject,
  verificationLink,
}: VerificationEmailProps) => {
  const app = getAppConfig();

  return (
    <Html>
      <Head />
      <Preview>{subject}</Preview>
      <EmailLayout>
        <Heading as="h2">Confirm your {app.name} account</Heading>
        <Text>
          Thank you for signing up! Please click the button below to verify your
          email address and activate your account.
        </Text>
        <Container className="text-center">
          <Button
            href={verificationLink}
            className="bg-brand text-white font-medium py-2 px-4 rounded"
          >
            Verify Email Address
          </Button>
        </Container>
        <Text>
          If you did not create an account with {app.name}, you can safely
          ignore this email.
        </Text>
        <Text>
          This verification link will expire in 24 hours.
        </Text>
      </EmailLayout>
    </Html>
  );
};

export default VerificationEmail;
