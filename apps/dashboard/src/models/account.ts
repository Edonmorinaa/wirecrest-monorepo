import { prisma } from '@wirecrest/db';

export const getAccount = async (key: { userId: string }) => {
  return await prisma.account.findFirst({
    where: key,
  });
};
