import { prisma } from '@wirecrest/db';
import { Subscription } from '@prisma/client';

export const createStripeSubscription = async ({
  customerId,
  id,
  active,
  startDate,
  endDate,
  priceId,
}: {
  customerId: string;
  id: string;
  active: boolean;
  startDate: Date;
  endDate: Date;
  priceId: string;
}) => await prisma.subscription.create({
    data: {
      customerId,
      id,
      active,
      startDate,
      endDate,
      priceId,
    },
  });

export const deleteStripeSubscription = async (id: string) => await prisma.subscription.deleteMany({
    where: {
      id,
    },
  });

export const updateStripeSubscription = async (id: string, data: any) => await prisma.subscription.update({
    where: {
      id,
    },
    data,
  });

export const getByCustomerId = async (customerId: string) => await prisma.subscription.findMany({
    where: {
      customerId,
    },
  });

export const getBySubscriptionId = async (subscriptionId: string): Promise<Subscription | null> => await prisma.subscription.findUnique({
    where: {
      id: subscriptionId,
    },
  });
