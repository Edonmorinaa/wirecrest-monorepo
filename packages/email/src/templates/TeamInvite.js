import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Button, Container, Head, Html, Preview, Text, } from '@react-email/components';
import EmailLayout from './EmailLayout';
import { getAppConfig } from '../core/app';
const TeamInviteEmail = ({ team, invitationLink, subject, }) => {
    const app = getAppConfig();
    return (_jsxs(Html, { children: [_jsx(Head, {}), _jsx(Preview, { children: subject }), _jsxs(EmailLayout, { children: [_jsxs(Text, { children: ["You have been invited to join the ", team.name, " team on ", app.name, "."] }), _jsx(Text, { children: "Click the button below to accept the invitation and join the team." }), _jsx(Container, { className: "text-center", children: _jsx(Button, { href: invitationLink, className: "bg-brand text-white font-medium py-2 px-4 rounded", children: "Join the team" }) }), _jsx(Text, { children: "You have 7 days to accept this invitation before it expires." }), _jsx(Text, { children: "If you did not expect this invitation, you can safely ignore this email." })] })] }));
};
export default TeamInviteEmail;
//# sourceMappingURL=TeamInvite.js.map