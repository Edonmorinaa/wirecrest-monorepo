// Create token using Web Crypto API (Edge Runtime compatible)
export function generateToken(length = 64) {
  // Use Web Crypto API for Edge Runtime compatibility
  const array = new Uint8Array(Math.ceil(length / 2));
  crypto.getRandomValues(array);
  
  return Array.from(array, byte => byte.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, length);
}

export const validateEmail = (email: string): boolean => {
  const re = /\S+@\S+\.\S+/;
  return re.test(email);
};

export const slugify = (text: string) => text
  .toString()
  .toLowerCase()
  .replace(/\s+/g, '-') // Replace spaces with -
  .replace(/[^\w-]+/g, '') // Remove all non-word chars
  .replace(/--+/g, '-') // Replace multiple - with single -
  .replace(/^-+/, '') // Trim - from start of text
  .replace(/-+$/, ''); // Trim - from end of text
