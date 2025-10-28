import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Button, Container, Head, Html, Preview, Text, } from '@react-email/components';
import EmailLayout from './EmailLayout';
const TestEmailTemplate = ({ url, name, subject, }) => {
    return (_jsxs(Html, { children: [_jsx(Head, {}), _jsx(Preview, { children: subject }), _jsxs(EmailLayout, { children: [_jsxs(Text, { children: ["Hello ", name, ","] }), _jsx(Text, { children: "This is a test email to verify that our email system is working correctly." }), _jsx(Text, { children: "Click the button below to visit our test page:" }), _jsx(Container, { className: "text-center", children: _jsx(Button, { href: url, className: "bg-brand text-white font-medium py-2 px-4 rounded", children: "Visit Test Page" }) }), _jsx(Text, { children: "If you received this email, our email system is functioning properly." }), _jsx(Text, { children: "This is an automated test email. You can safely ignore it." })] })] }));
};
export default TestEmailTemplate;
//# sourceMappingURL=TestEmail.js.map