import { prisma } from '@wirecrest/db';

export const createPasswordReset = async ({ data }) => await prisma.passwordReset.create({
    data,
  });

export const getPasswordReset = async (token: string) => await prisma.passwordReset.findUnique({
    where: {
      token,
    },
  });

export const deletePasswordReset = async (token: string) => await prisma.passwordReset.delete({
    where: {
      token,
    },
  });
