import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Button, Container, Head, Html, Preview, Text, } from '@react-email/components';
import EmailLayout from './EmailLayout';
const ResetPasswordEmail = ({ url, subject, email, }) => {
    return (_jsxs(Html, { children: [_jsx(Head, {}), _jsx(Preview, { children: subject }), _jsxs(EmailLayout, { children: [_jsx(Text, { children: "Hello," }), _jsxs(Text, { children: ["You requested a password reset for your account (", email, "). Click the button below to reset your password:"] }), _jsx(Container, { className: "text-center", children: _jsx(Button, { href: url, className: "bg-brand text-white font-medium py-2 px-4 rounded", children: "Reset Password" }) }), _jsx(Text, { children: "If you did not request this password reset, you can safely ignore this email." }), _jsx(Text, { children: "This link will expire in 1 hour for security reasons." })] })] }));
};
export default ResetPasswordEmail;
//# sourceMappingURL=ResetPassword.js.map