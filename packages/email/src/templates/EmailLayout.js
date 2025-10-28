import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Body, Container, Hr, Img, Section, Tailwind, Text, } from '@react-email/components';
import { getAppConfig } from '../core/app';
const EmailLayout = ({ children }) => {
    const app = getAppConfig();
    return (_jsx(Tailwind, { children: _jsx(Body, { className: "bg-white my-auto mx-auto font-sans", children: _jsxs(Container, { className: "border border-solid border-[#eaeaea] rounded my-[40px] mx-auto p-[20px] max-w-[465px]", children: [_jsx(Section, { className: "mt-[32px]", children: _jsx(Img, { src: app.logoUrl, width: "40", height: "37", alt: app.name, className: "my-0 mx-auto" }) }), children, _jsx(Hr, { className: "border border-solid border-[#eaeaea] my-[26px] mx-0 w-full" }), _jsxs(Text, { className: "text-[#666666] text-xs leading-[24px]", children: ["This email was sent from ", app.name, ". If you have any questions, please contact us at", ' ', _jsxs("a", { href: `mailto:support@${app.url.replace('https://', '')}`, children: ["support@", app.url.replace('https://', '')] }), "."] })] }) }) }));
};
export default EmailLayout;
//# sourceMappingURL=EmailLayout.js.map