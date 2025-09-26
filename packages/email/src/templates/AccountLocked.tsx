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
import { AccountLockedProps } from '../types/email';

const AccountLocked = ({ subject, url }: AccountLockedProps) => {
  const app = getAppConfig();

  return (
    <Html>
      <Head />
      <Preview>{subject}</Preview>
      <EmailLayout>
        <Heading as="h2">Account Locked</Heading>
        <Text>
          Your {app.name} account has been locked due to too many failed login
          attempts.
        </Text>
        <Text>Please click the button below to unlock your account.</Text>
        <Container className="text-center">
          <Button
            href={url}
            className="bg-brand text-white font-medium py-2 px-4 rounded"
          >
            Unlock account
          </Button>
        </Container>
        <Text>
          Please contact us if you need any assistance with unlocking your
          account.
        </Text>
        <Text>
          If you did not attempt to log in, please contact our support team
          immediately.
        </Text>
      </EmailLayout>
    </Html>
  );
};

export default AccountLocked;
