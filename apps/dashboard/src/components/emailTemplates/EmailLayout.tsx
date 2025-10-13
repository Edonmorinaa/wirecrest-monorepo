import app from '@/lib/app';
import React, { ReactNode } from 'react';
import {
  Hr,
  Img,
  Body,
  Text,
  Section,
  Tailwind,
  Container,
} from '@react-email/components';

interface EmailLayoutProps {
  children: ReactNode;
}

const EmailLayout = ({ children }: EmailLayoutProps) => (
    <Tailwind
      config={{
        theme: {
          extend: {
            colors: {
              brand: '#FB8138',
            },
          },
        },
      }}
    >
      <Body className="bg-white my-auto mx-auto font-sans">
        <Container className="border border-solid bg-white border-[#f0f0f0] rounded my-[40px] mx-auto p-[20px] w-[465px]">
          <Img
            src={app.logoUrl}
            width="50"
            height="50"
            alt={app.name}
            className="my-8 mx-auto"
          />
          <Section>{children as React.ReactNode}</Section>
          <Section>
            <Hr className="border border-solid border-[#eaeaea] my-[20px] mx-0 w-full" />
            <Text className="my-0 text-center text-xs text-[#666666]">
              <span className="block">{app.name}</span>
            </Text>
          </Section>
        </Container>
      </Body>
    </Tailwind>
  );

export default EmailLayout;
