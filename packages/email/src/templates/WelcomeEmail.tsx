import {
  Button,
  Container,
  Head,
  Html,
  Preview,
  Text,
} from '@react-email/components';
import EmailLayout from './EmailLayout';
import { getAppConfig } from '../core/app';
import { WelcomeEmailProps } from '../types/email';

const WelcomeEmail = ({ name, team, subject }: WelcomeEmailProps) => {
  const app = getAppConfig();

  return (
    <Html>
      <Head />
      <Preview>{subject}</Preview>
      <EmailLayout>
        <Text>Hello {name},</Text>
        <Text>
          Welcome to {app.name}! You have successfully joined the {team} team.
        </Text>
        <Text>
          We're excited to have you on board. You can now access all the
          features and benefits of your {app.name} account.
        </Text>
        <Container className="text-center">
          <Button
            href={app.url}
            className="bg-brand text-white font-medium py-2 px-4 rounded"
          >
            Get Started
          </Button>
        </Container>
        <Text>
          If you have any questions or need assistance, please don't hesitate to
          contact our support team.
        </Text>
        <Text>Best regards,<br />The {app.name} Team</Text>
      </EmailLayout>
    </Html>
  );
};

export default WelcomeEmail;
