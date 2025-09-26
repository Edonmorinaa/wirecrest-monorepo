import React, { ReactNode } from 'react';
import {
  Body,
  Container,
  Hr,
  Img,
  Section,
  Tailwind,
  Text,
} from '@react-email/components';
import { getAppConfig } from '../core/app';

interface EmailLayoutProps {
  children: ReactNode;
}

const EmailLayout = ({ children }: EmailLayoutProps) => {
  const app = getAppConfig();

  return (
    <Tailwind>
      <Body className="bg-white my-auto mx-auto font-sans">
        <Container className="border border-solid border-[#eaeaea] rounded my-[40px] mx-auto p-[20px] max-w-[465px]">
          <Section className="mt-[32px]">
            <Img
              src={app.logoUrl}
              width="40"
              height="37"
              alt={app.name}
              className="my-0 mx-auto"
            />
          </Section>
          {children}
          <Hr className="border border-solid border-[#eaeaea] my-[26px] mx-0 w-full" />
          <Text className="text-[#666666] text-xs leading-[24px]">
            This email was sent from {app.name}. If you have any questions,
            please contact us at{' '}
            <a href={`mailto:support@${app.url.replace('https://', '')}`}>
              support@{app.url.replace('https://', '')}
            </a>
            .
          </Text>
        </Container>
      </Body>
    </Tailwind>
  );
};

export default EmailLayout;
