import app from '@/lib/app';
import {
  Head,
  Html,
  Text,
  Button,
  Heading,
  Preview,
  Container,
} from '@react-email/components';

import EmailLayout from './EmailLayout';

interface VerificationEmailProps {
  subject: string;
  verificationLink: string;
}

const VerificationEmail = ({
  subject,
  verificationLink,
}: VerificationEmailProps) => (
    <Html>
      <Head />
      <Preview>{subject}</Preview>
      <EmailLayout>
        <Heading as="h2">Confirm your account</Heading>
        <Text>
          Thank you for signing up for {app.name}. To confirm your account,
          please click the button below.
        </Text>
        <Container className="text-center">
          <Button
            href={verificationLink}
            className="bg-brand text-white font-medium py-2 px-4 rounded"
          >
            Confirm account
          </Button>
        </Container>
        <Text>
          If you did not create an account, no further action is required.
        </Text>
      </EmailLayout>
    </Html>
  );

export default VerificationEmail;
