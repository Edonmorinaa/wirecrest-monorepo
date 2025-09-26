import { prisma } from '@wirecrest/db';

export const getAllServices = async () => {
  return await prisma.service.findMany();
};
