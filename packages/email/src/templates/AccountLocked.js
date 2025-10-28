import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Button, Container, Head, Heading, Html, Preview, Text, } from '@react-email/components';
import EmailLayout from './EmailLayout';
import { getAppConfig } from '../core/app';
const AccountLocked = ({ subject, url }) => {
    const app = getAppConfig();
    return (_jsxs(Html, { children: [_jsx(Head, {}), _jsx(Preview, { children: subject }), _jsxs(EmailLayout, { children: [_jsx(Heading, { as: "h2", children: "Account Locked" }), _jsxs(Text, { children: ["Your ", app.name, " account has been locked due to too many failed login attempts."] }), _jsx(Text, { children: "Please click the button below to unlock your account." }), _jsx(Container, { className: "text-center", children: _jsx(Button, { href: url, className: "bg-brand text-white font-medium py-2 px-4 rounded", children: "Unlock account" }) }), _jsx(Text, { children: "Please contact us if you need any assistance with unlocking your account." }), _jsx(Text, { children: "If you did not attempt to log in, please contact our support team immediately." })] })] }));
};
export default AccountLocked;
//# sourceMappingURL=AccountLocked.js.map