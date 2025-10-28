import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Button, Container, Head, Html, Preview, Text, } from '@react-email/components';
import EmailLayout from './EmailLayout';
import { getAppConfig } from '../core/app';
const WelcomeEmail = ({ name, team, subject }) => {
    const app = getAppConfig();
    return (_jsxs(Html, { children: [_jsx(Head, {}), _jsx(Preview, { children: subject }), _jsxs(EmailLayout, { children: [_jsxs(Text, { children: ["Hello ", name, ","] }), _jsxs(Text, { children: ["Welcome to ", app.name, "! You have successfully joined the ", team, " team."] }), _jsxs(Text, { children: ["We're excited to have you on board. You can now access all the features and benefits of your ", app.name, " account."] }), _jsx(Container, { className: "text-center", children: _jsx(Button, { href: app.url, className: "bg-brand text-white font-medium py-2 px-4 rounded", children: "Get Started" }) }), _jsx(Text, { children: "If you have any questions or need assistance, please don't hesitate to contact our support team." }), _jsxs(Text, { children: ["Best regards,", _jsx("br", {}), "The ", app.name, " Team"] })] })] }));
};
export default WelcomeEmail;
//# sourceMappingURL=WelcomeEmail.js.map