/**
 * Security and validation policies
 * Based on dashboard implementation
 */
export const maxLengthPolicies = {
  name: 104,
  nameShortDisplay: 20,
  email: 254,
  password: 70,
  team: 50,
  slug: 50,
  domain: 1000,
  domains: 1024,
  apiKeyName: 64,
  memberId: 64,
  eventType: 50,
  inviteToken: 64,
  expiredToken: 64,
  invitationId: 64,
  sendViaEmail: 10,
};

export const passwordPolicies = {
  minLength: 8,
};
