import { prisma } from '@wirecrest/db';

export const deleteManySessions = async ({ where }) => await prisma.session.deleteMany({
    where,
  });

export const findFirstSessionOrThrown = async ({ where }) => await prisma.session.findFirstOrThrow({
    where,
  });

export const findManySessions = async ({ where }) => await prisma.session.findMany({
    where,
  });

export const deleteSession = async ({ where }) => await prisma.session.delete({
    where,
  });
