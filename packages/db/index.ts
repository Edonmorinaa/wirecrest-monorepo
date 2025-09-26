import { PrismaClient } from '@prisma/client';

declare global {
  // allow global `var` declarations
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

export const prisma =
  (typeof global !== 'undefined' ? global.prisma : undefined) ||
  new PrismaClient({
    //log: ["error"],
  });

if (process.env.NODE_ENV !== 'production' && typeof global !== 'undefined') {
  global.prisma = prisma;
}
