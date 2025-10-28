import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Button, Container, Head, Heading, Html, Preview, Text, } from '@react-email/components';
import EmailLayout from './EmailLayout';
import { getAppConfig } from '../core/app';
const VerificationEmail = ({ subject, verificationLink, }) => {
    const app = getAppConfig();
    return (_jsxs(Html, { children: [_jsx(Head, {}), _jsx(Preview, { children: subject }), _jsxs(EmailLayout, { children: [_jsxs(Heading, { as: "h2", children: ["Confirm your ", app.name, " account"] }), _jsx(Text, { children: "Thank you for signing up! Please click the button below to verify your email address and activate your account." }), _jsx(Container, { className: "text-center", children: _jsx(Button, { href: verificationLink, className: "bg-brand text-white font-medium py-2 px-4 rounded", children: "Verify Email Address" }) }), _jsxs(Text, { children: ["If you did not create an account with ", app.name, ", you can safely ignore this email."] }), _jsx(Text, { children: "This verification link will expire in 24 hours." })] })] }));
};
export default VerificationEmail;
//# sourceMappingURL=VerificationEmail.js.map