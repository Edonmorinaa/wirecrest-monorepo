/**
 * Mock Prisma client for testing
 */

export const prisma = {
  googleBusinessProfile: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    upsert: jest.fn(),
  },
  googleReview: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
  googleOverview: {
    findUnique: jest.fn(),
    upsert: jest.fn(),
  },
  periodicalMetric: {
    upsert: jest.fn(),
  },
  facebookBusinessProfile: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  facebookReview: {
    findMany: jest.fn(),
    count: jest.fn(),
  },
  tripAdvisorBusinessProfile: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
  },
  tripAdvisorReview: {
    findMany: jest.fn(),
  },
  bookingBusinessProfile: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
  },
  bookingReview: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
  },
  reviewMetadata: {
    create: jest.fn(),
    update: jest.fn(),
  },
  $transaction: jest.fn((fn) => {
    if (typeof fn === 'function') {
      return fn(prisma);
    }
    return Promise.resolve(fn);
  }),
};

// Mock sendNotification utility
export const sendNotification = jest.fn().mockResolvedValue(undefined);

