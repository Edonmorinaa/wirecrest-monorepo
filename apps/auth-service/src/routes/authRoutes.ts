import { Router } from 'express';
import { AuthController } from '../controllers/authController';
import { validateSession } from '../middleware/auth';

/**
 * Authentication routes configuration
 * Follows Open/Closed Principle - open for extension, closed for modification
 */
export function createAuthRoutes(): Router {
  const router = Router();
  const authController = new AuthController();

  // Public routes (no authentication required)
  router.post('/forgot-password', (req, res) => authController.forgotPassword(req, res));
  router.post('/reset-password', (req, res) => authController.resetPassword(req, res));
  router.post('/register', (req, res) => authController.register(req, res));
  router.post('/resend-verification', (req, res) => authController.resendVerification(req, res));
  router.post('/unlock-account', (req, res) => authController.unlockAccount(req, res));

  // Protected routes (authentication required)
  router.post('/update-password', validateSession, (req, res) => authController.updatePassword(req, res));
  router.put('/profile', validateSession, (req, res) => authController.updateUserProfile(req, res));

  return router;
}
