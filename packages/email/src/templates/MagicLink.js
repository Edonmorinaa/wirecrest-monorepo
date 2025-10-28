import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Button, Container, Head, Heading, Html, Preview, Text, } from '@react-email/components';
import EmailLayout from './EmailLayout';
import { getAppConfig } from '../core/app';
const MagicLink = ({ subject, url }) => {
    const app = getAppConfig();
    return (_jsxs(Html, { children: [_jsx(Head, {}), _jsx(Preview, { children: subject }), _jsxs(EmailLayout, { children: [_jsxs(Heading, { as: "h2", children: ["Log in to ", app.name] }), _jsxs(Text, { children: ["Click the button below to log in to your ", app.name, " account. This button will expire in 60 minutes."] }), _jsx(Container, { className: "text-center", children: _jsxs(Button, { href: url, className: "bg-brand text-white font-medium py-2 px-4 rounded", children: ["Log in to ", app.name] }) }), _jsx(Text, { children: "If you did not request this email, you can safely ignore it." })] })] }));
};
export default MagicLink;
//# sourceMappingURL=MagicLink.js.map