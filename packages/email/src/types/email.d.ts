export interface EmailData {
    to: string;
    subject: string;
    html: string;
    text?: string;
}
export interface SMTPConfig {
    host: string;
    port: number;
    user: string;
    password: string;
    from: string;
}
export interface AppConfig {
    name: string;
    logoUrl: string;
    url: string;
}
export interface User {
    id: string;
    name: string;
    email: string;
}
export interface Team {
    id: string;
    name: string;
    slug: string;
}
export interface Invitation {
    id: string;
    email: string;
    token: string;
    expires: Date;
}
export interface VerificationToken {
    id: string;
    token: string;
    expires: Date;
}
export interface EmailTemplateProps {
    subject: string;
}
export interface MagicLinkProps extends EmailTemplateProps {
    url: string;
}
export interface ResetPasswordProps extends EmailTemplateProps {
    url: string;
    email: string;
}
export interface VerificationEmailProps extends EmailTemplateProps {
    verificationLink: string;
}
export interface WelcomeEmailProps extends EmailTemplateProps {
    name: string;
    team: string;
}
export interface TeamInviteProps extends EmailTemplateProps {
    team: Team;
    invitationLink: string;
}
export interface AccountLockedProps extends EmailTemplateProps {
    url: string;
}
export interface TestEmailProps extends EmailTemplateProps {
    url: string;
    name: string;
}
//# sourceMappingURL=email.d.ts.map