import { prisma } from '@wirecrest/db';

export const getAccount = async (key: { userId: string }) => await prisma.account.findFirst({
    where: key,
  });
