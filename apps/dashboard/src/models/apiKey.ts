import { prisma } from '@wirecrest/db';

interface CreateApiKeyParams {
  name: string;
  teamId: string;
}

// Hash function using Web Crypto API (Edge Runtime compatible)
const hashApiKey = async (apiKey: string) => {
  const encoder = new TextEncoder();
  const data = encoder.encode(apiKey);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

// Generate unique API key using Web Crypto API (Edge Runtime compatible)
const generateUniqueApiKey = async () => {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  const apiKey = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');

  return [await hashApiKey(apiKey), apiKey];
};

export const createApiKey = async (params: CreateApiKeyParams) => {
  const { name, teamId } = params;

  const [hashedKey, apiKey] = await generateUniqueApiKey();

  await prisma.apiKey.create({
    data: {
      name,
      hashedKey,
      team: { connect: { id: teamId } },
    },
  });

  return apiKey;
};

export const fetchApiKeys = async (teamId: string) => prisma.apiKey.findMany({
  where: {
    teamId,
  },
  select: {
    id: true,
    name: true,
    createdAt: true,
  },
});

export const deleteApiKey = async (id: string) => prisma.apiKey.delete({
  where: {
    id,
  },
});

export const getApiKey = async (apiKey: string) => prisma.apiKey.findUnique({
  where: {
    hashedKey: await hashApiKey(apiKey),
  },
  select: {
    id: true,
    teamId: true,
  },
});

export const getApiKeyById = async (id: string) => prisma.apiKey.findUnique({
  where: {
    id,
  },
  select: {
    id: true,
    teamId: true,
  },
});
