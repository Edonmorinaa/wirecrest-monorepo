import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Button, Container, Head, Heading, Hr, Html, Img, Link, Preview, Section, Text, } from '@react-email/components';
import EmailLayout from './EmailLayout';
export function InvoiceEmail({ invoiceNumber, teamName, totalAmount, dueDate, downloadUrl, viewUrl, }) {
    const previewText = `Invoice ${invoiceNumber} from Wirecrest`;
    return (_jsxs(Html, { children: [_jsx(Head, {}), _jsx(Preview, { children: previewText }), _jsx(EmailLayout, { children: _jsxs(Container, { style: container, children: [_jsx(Section, { style: logoSection, children: _jsx(Img, { src: "https://wirecrest.com/logo/logo-single.png", width: "48", height: "48", alt: "Wirecrest", style: logo }) }), _jsxs(Heading, { style: h1, children: ["Invoice ", invoiceNumber] }), _jsxs(Text, { style: text, children: ["Hello ", teamName, ","] }), _jsx(Text, { style: text, children: "We've attached your invoice for your review. Here are the details:" }), _jsxs(Section, { style: invoiceDetails, children: [_jsxs("div", { style: detailRow, children: [_jsx("span", { style: detailLabel, children: "Invoice Number:" }), _jsx("span", { style: detailValue, children: invoiceNumber })] }), _jsxs("div", { style: detailRow, children: [_jsx("span", { style: detailLabel, children: "Total Amount:" }), _jsx("span", { style: detailValue, children: totalAmount })] }), _jsxs("div", { style: detailRow, children: [_jsx("span", { style: detailLabel, children: "Due Date:" }), _jsx("span", { style: detailValue, children: dueDate })] })] }), _jsxs(Section, { style: buttonContainer, children: [_jsx(Button, { style: button, href: viewUrl, children: "View Invoice" }), downloadUrl && (_jsx(Button, { style: secondaryButton, href: downloadUrl, children: "Download PDF" }))] }), _jsx(Hr, { style: hr }), _jsx(Text, { style: footerText, children: "If you have any questions about this invoice, please contact our support team." }), _jsxs(Text, { style: footerText, children: ["Thank you for your business!", _jsx("br", {}), "The Wirecrest Team"] }), _jsx(Hr, { style: hr }), _jsxs(Text, { style: disclaimer, children: ["This is an automated email. Please do not reply to this message. If you need assistance, please visit our", ' ', _jsx(Link, { href: "https://wirecrest.com/support", style: link, children: "support center" }), "."] })] }) })] }));
}
// Styles
const container = {
    margin: '0 auto',
    padding: '20px 0 48px',
    maxWidth: '580px',
};
const logoSection = {
    textAlign: 'center',
    marginBottom: '32px',
};
const logo = {
    margin: '0 auto',
};
const h1 = {
    color: '#333',
    fontSize: '28px',
    fontWeight: 'bold',
    textAlign: 'center',
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
    textAlign: 'center',
    margin: '32px 0',
};
const button = {
    backgroundColor: '#007c89',
    borderRadius: '6px',
    color: '#fff',
    fontSize: '16px',
    fontWeight: 'bold',
    textDecoration: 'none',
    textAlign: 'center',
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
    textAlign: 'center',
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
    textAlign: 'center',
    margin: '0 0 16px',
};
const disclaimer = {
    color: '#999',
    fontSize: '12px',
    lineHeight: '18px',
    textAlign: 'center',
    margin: '0',
};
const link = {
    color: '#007c89',
    textDecoration: 'underline',
};
export default InvoiceEmail;
//# sourceMappingURL=InvoiceEmail.js.map