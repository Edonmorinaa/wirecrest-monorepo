import { prisma } from '@wirecrest/db';

export const countTeamMembers = async ({ where }) => await prisma.teamMember.count({
    where,
  });

export const updateTeamMember = async ({ where, data }) => await prisma.teamMember.update({
    where,
    data,
  });
