/**
 * Recaptcha validation utility
 * Based on dashboard implementation
 */
export const validateRecaptcha = async (token?: string) => {
  const siteKey = process.env.RECAPTCHA_SITE_KEY;
  const secretKey = process.env.RECAPTCHA_SECRET_KEY;
  
  if (!siteKey || !secretKey) {
    return;
  }

  if (!token) {
    throw new Error('Invalid captcha. Please try again.');
  }

  const params = new URLSearchParams({
    secret: secretKey,
    response: token,
  });

  const response = await fetch(
    `https://www.google.com/recaptcha/api/siteverify?${params}`,
    {
      method: 'POST',
    }
  );

  const { success } = await response.json() as { success: boolean };

  if (!success) {
    throw new Error('Invalid captcha. Please try again.');
  }
};
