import {
  Button,
  Container,
  Head,
  Html,
  Preview,
  Text,
} from '@react-email/components';
import EmailLayout from './EmailLayout';
import { TestEmailProps } from '../types/email';

const TestEmailTemplate = ({
  url,
  name,
  subject,
}: TestEmailProps) => {
  return (
    <Html>
      <Head />
      <Preview>{subject}</Preview>
      <EmailLayout>
        <Text>Hello {name},</Text>
        <Text>
          This is a test email to verify that our email system is working
          correctly.
        </Text>
        <Text>
          Click the button below to visit our test page:
        </Text>
        <Container className="text-center">
          <Button
            href={url}
            className="bg-brand text-white font-medium py-2 px-4 rounded"
          >
            Visit Test Page
          </Button>
        </Container>
        <Text>
          If you received this email, our email system is functioning properly.
        </Text>
        <Text>
          This is an automated test email. You can safely ignore it.
        </Text>
      </EmailLayout>
    </Html>
  );
};

export default TestEmailTemplate;
