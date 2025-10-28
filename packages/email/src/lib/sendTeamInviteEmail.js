import { render } from '@react-email/render';
import { sendEmail, getAppConfig } from '../core';
import TeamInviteEmail from '../templates/TeamInvite';
/**
 * Send team invitation email
 */
export const sendTeamInviteEmail = async (team, invitation) => {
    if (!invitation.email) {
        return;
    }
    const app = getAppConfig();
    const subject = `You've been invited to join ${team.name} on ${app.name}`;
    const invitationLink = `${app.url}/invitations/${invitation.token}`;
    const html = await render(TeamInviteEmail({ invitationLink, team, subject }));
    await sendEmail({
        to: invitation.email,
        subject,
        html,
    });
};
//# sourceMappingURL=sendTeamInviteEmail.js.map