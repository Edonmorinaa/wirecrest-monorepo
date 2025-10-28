import { render } from '@react-email/render';
import { sendEmail, getAppConfig } from '../core';
import VerificationEmail from '../templates/VerificationEmail';
/**
 * Send email verification email
 */
export const sendVerificationEmail = async (user, verificationToken) => {
    const app = getAppConfig();
    const subject = `Confirm your ${app.name} account`;
    const verificationLink = `${app.url}/auth/verify-email-token?token=${encodeURIComponent(verificationToken.token)}`;
    const html = await render(VerificationEmail({ subject, verificationLink }));
    await sendEmail({
        to: user.email,
        subject,
        html,
    });
};
//# sourceMappingURL=sendVerificationEmail.js.map