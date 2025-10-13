import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components';

import EmailLayout from './EmailLayout';

interface InvoiceEmailProps {
  invoiceNumber: string;
  teamName: string;
  totalAmount: string;
  dueDate: string;
  downloadUrl?: string;
  viewUrl: string;
}

export function InvoiceEmail({
  invoiceNumber,
  teamName,
  totalAmount,
  dueDate,
  downloadUrl,
  viewUrl,
}: InvoiceEmailProps) {
  const previewText = `Invoice ${invoiceNumber} from Wirecrest`;

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <EmailLayout>
        <Container style={container}>
          <Section style={logoSection}>
            <Img
              src="https://wirecrest.com/logo/logo-single.png"
              width="48"
              height="48"
              alt="Wirecrest"
              style={logo}
            />
          </Section>

          <Heading style={h1}>Invoice {invoiceNumber}</Heading>

          <Text style={text}>
            Hello {teamName},
          </Text>

          <Text style={text}>
            We've attached your invoice for your review. Here are the details:
          </Text>

          <Section style={invoiceDetails}>
            <div style={detailRow}>
              <span style={detailLabel}>Invoice Number:</span>
              <span style={detailValue}>{invoiceNumber}</span>
            </div>
            <div style={detailRow}>
              <span style={detailLabel}>Total Amount:</span>
              <span style={detailValue}>{totalAmount}</span>
            </div>
            <div style={detailRow}>
              <span style={detailLabel}>Due Date:</span>
              <span style={detailValue}>{dueDate}</span>
            </div>
          </Section>

          <Section style={buttonContainer}>
            <Button style={button} href={viewUrl}>
              View Invoice
            </Button>
            {downloadUrl && (
              <Button style={secondaryButton} href={downloadUrl}>
                Download PDF
              </Button>
            )}
          </Section>

          <Hr style={hr} />

          <Text style={footerText}>
            If you have any questions about this invoice, please contact our support team.
          </Text>

          <Text style={footerText}>
            Thank you for your business!
            <br />
            The Wirecrest Team
          </Text>

          <Hr style={hr} />

          <Text style={disclaimer}>
            This is an automated email. Please do not reply to this message.
            If you need assistance, please visit our{' '}
            <Link href="https://wirecrest.com/support" style={link}>
              support center
            </Link>
            .
          </Text>
        </Container>
      </EmailLayout>
    </Html>
  );
}

// Styles
const container = {
  margin: '0 auto',
  padding: '20px 0 48px',
  maxWidth: '580px',
};

const logoSection = {
  textAlign: 'center' as const,
  marginBottom: '32px',
};

const logo = {
  margin: '0 auto',
};

const h1 = {
  color: '#333',
  fontSize: '28px',
  fontWeight: 'bold',
  textAlign: 'center' as const,
  margin: '0 0 30px',
};

const text = {
  color: '#555',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '0 0 16px',
};

const invoiceDetails = {
  backgroundColor: '#f8f9fa',
  borderRadius: '8px',
  padding: '24px',
  margin: '32px 0',
};

const detailRow = {
  display: 'flex',
  justifyContent: 'space-between',
  marginBottom: '8px',
};

const detailLabel = {
  color: '#666',
  fontSize: '14px',
  fontWeight: '500',
};

const detailValue = {
  color: '#333',
  fontSize: '14px',
  fontWeight: 'bold',
};

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '32px 0',
};

const button = {
  backgroundColor: '#007c89',
  borderRadius: '6px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '12px 24px',
  margin: '0 8px 16px',
};

const secondaryButton = {
  backgroundColor: '#fff',
  border: '2px solid #007c89',
  borderRadius: '6px',
  color: '#007c89',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '10px 22px',
  margin: '0 8px 16px',
};

const hr = {
  borderColor: '#e6ebf1',
  margin: '32px 0',
};

const footerText = {
  color: '#666',
  fontSize: '14px',
  lineHeight: '20px',
  textAlign: 'center' as const,
  margin: '0 0 16px',
};

const disclaimer = {
  color: '#999',
  fontSize: '12px',
  lineHeight: '18px',
  textAlign: 'center' as const,
  margin: '0',
};

const link = {
  color: '#007c89',
  textDecoration: 'underline',
};

export default InvoiceEmail;
