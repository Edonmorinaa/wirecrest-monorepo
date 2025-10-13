import { render } from '@react-email/components';
import { Team, Invitation } from '@prisma/client';
import { TeamInviteEmail } from '@/components/emailTemplates';

import env from '../env';
import app from '../app';
import { sendEmail } from './sendEmail';

export const sendTeamInviteEmail = async (
  team: Team,
  invitation: Invitation
) => {
  if (!invitation.email) {
    return;
  }

  const subject = `You've been invited to join ${team.name} on ${app.name}`;
  const invitationLink = `${env.appUrl}/invitations/${invitation.token}`;

  const html = await render(TeamInviteEmail({ invitationLink, team, subject }));

  await sendEmail({
    to: invitation.email,
    subject,
    html,
  });
};
