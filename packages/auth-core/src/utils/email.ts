/**
 * Email validation utilities
 * Based on dashboard implementation
 */

// Import blocked domains (you'll need to create this file or import from dashboard)
const blockedDomains: Record<string, boolean> = {
  'gmail.com': true,
  'yahoo.com': true,
  'hotmail.com': true,
  'outlook.com': true,
  // Add more blocked domains as needed
};

const isBusinessEmail = (email: string): boolean => {
  if (email.indexOf('@') > 0 && email.indexOf('@') < email.length - 3) {
    const emailDomain = email.split('@')[1];
    return !blockedDomains[emailDomain];
  }
  return false;
};

export const isEmailAllowed = (email: string): boolean => {
  const disableNonBusinessEmailSignup = process.env.DISABLE_NON_BUSINESS_EMAIL_SIGNUP === 'true';
  
  if (!disableNonBusinessEmailSignup) {
    return true;
  }

  return isBusinessEmail(email);
};

export function extractEmailDomain(email: string): string {
  return email.split('@')[1];
}
