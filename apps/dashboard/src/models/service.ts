import { prisma } from '@wirecrest/db';

export const getAllServices = async () => await prisma.service.findMany();
