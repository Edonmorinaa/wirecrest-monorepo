import {
  Button,
  Container,
  Head,
  Html,
  Preview,
  Text,
} from '@react-email/components';
import EmailLayout from './EmailLayout';

interface TestEmailTemplateProps {
  url: string;
  name: string;
  subject: string;
}

const TestEmailTemplate = ({
  url,
  name,
  subject
}: TestEmailTemplateProps) => {
  return (
    <Html>
      <Head />
      <Preview>{subject}</Preview>
      <EmailLayout>
        <Text>
          You've gotten a review from {name}.
        </Text>
        <Container className="text-center">
          <Button
            href={url}
            className="bg-brand text-white font-medium py-2 px-4 rounded"
          >
            Click here to check the review!
          </Button>
        </Container>
      </EmailLayout>
    </Html>
  );
};

export default TestEmailTemplate;
