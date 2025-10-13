import { prisma } from '@wirecrest/db';
import { VerificationToken } from '@prisma/client';

import { generateToken } from 'src/lib/server-common';

export const createVerificationToken = async ({
  identifier,
  expires,
}: Pick<VerificationToken, 'identifier' | 'expires'>) => await prisma.verificationToken.create({
    data: {
      identifier,
      expires,
      token: generateToken(),
    },
  });

export const getVerificationToken = async (token: string) => await prisma.verificationToken.findUnique({
    where: {
      token: decodeURIComponent(token),
    },
  });

export const deleteVerificationToken = async (token: string) => await prisma.verificationToken.delete({
    where: {
      token,
    },
  });

export const isVerificationTokenExpired = (verificationToken: VerificationToken) => verificationToken.expires < new Date();
