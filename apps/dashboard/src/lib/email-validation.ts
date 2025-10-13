/**
 * Email Validation Utilities
 * Handles email validation and fallback strategies for Stripe customer creation
 */

/**
 * Validates if an email address is valid
 */
export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== 'string') {
    return false;
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

/**
 * Gets the best available email for a customer
 * Tries multiple fallback strategies
 */
export function getCustomerEmail(options: {
  teamOwnerEmail?: string | null;
  invoiceToEmail?: string | null;
  sessionUserEmail?: string | null;
}): string | null {
  const { teamOwnerEmail, invoiceToEmail, sessionUserEmail } = options;
  
  // Priority order: invoiceTo > teamOwner > sessionUser
  const candidates = [
    invoiceToEmail,
    teamOwnerEmail,
    sessionUserEmail,
  ];
  
  for (const email of candidates) {
    if (isValidEmail(email)) {
      return email.trim();
    }
  }
  
  return null;
}

/**
 * Validates customer email and provides helpful error messages
 */
export function validateCustomerEmail(email: string | null | undefined): {
  isValid: boolean;
  error?: string;
} {
  if (!email) {
    return {
      isValid: false,
      error: 'Email address is required to create invoices that are sent to customers.'
    };
  }
  
  if (!isValidEmail(email)) {
    return {
      isValid: false,
      error: 'Please provide a valid email address for the customer.'
    };
  }
  
  return { isValid: true };
}
