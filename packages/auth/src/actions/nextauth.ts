import { signOut as nextAuthSignOut } from 'next-auth/react';

/** **************************************
 * Sign out with custom logic using server action
 *************************************** */
export const signOut = async (customSignOut?: () => Promise<void>) => {
  try {
    // Call our custom signout server action to handle server-side cleanup
    if (customSignOut) {
      await customSignOut();
    }

    // Use NextAuth's signOut to ensure complete cleanup
    await nextAuthSignOut({
      redirect: false, // Don't let NextAuth handle redirect automatically
    });

    return true;
  } catch (error) {
    console.error('Error during sign out:', error);
    // Even if custom signout fails, try NextAuth signout as fallback
    try {
      await nextAuthSignOut({
        redirect: false,
      });
    } catch (fallbackError) {
      console.error('Fallback NextAuth signout also failed:', fallbackError);
    }
    throw error;
  }
};
