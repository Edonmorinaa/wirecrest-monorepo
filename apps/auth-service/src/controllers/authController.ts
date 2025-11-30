import { Request, Response } from 'express';
import { AuthService } from '../services/authService';

// Define ApiError locally to avoid import issues
class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Authentication controller handling HTTP requests
 * Follows Single Responsibility Principle - handles only HTTP concerns
 */
export class AuthController {
  private authService: AuthService;

  constructor() {
    this.authService = new AuthService();
  }

  /**
   * Handles forgot password requests
   * POST /forgot-password
   */
  async forgotPassword(req: Request, res: Response): Promise<void> {
    try {
      const { email, recaptchaToken } = req.body;
      console.log('email', email);
      if (!email) {
        throw new ApiError(400, 'Email is required');
      }

      // recaptchaToken is optional until reCAPTCHA validation is implemented
      const result = await this.authService.forgotPassword(email, recaptchaToken || '');
      
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  /**
   * Handles password reset requests
   * POST /reset-password
   */
  async resetPassword(req: Request, res: Response): Promise<void> {
    try {
      const { token, password } = req.body;
      
      if (!token || !password) {
        throw new ApiError(400, 'Token and password are required');
      }

      const result = await this.authService.resetPassword(token, password);
      
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  /**
   * Handles password update requests
   * POST /update-password
   * Requires authentication
   */
  async updatePassword(req: Request, res: Response): Promise<void> {
    try {
      const { currentPassword, newPassword } = req.body;
      
      if (!currentPassword || !newPassword) {
        throw new ApiError(400, 'Current password and new password are required');
      }

      if (!req.user?.id) {
        throw new ApiError(401, 'User not authenticated');
      }

      const result = await this.authService.updatePassword(
        req.user.id, 
        currentPassword, 
        newPassword
      );
      
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  /**
   * Handles user registration requests
   * POST /register
   */
  async register(req: Request, res: Response): Promise<void> {
    try {
      const { name, email, password, team, inviteToken, recaptchaToken } = req.body;
      
      if (!name || !email || !password) {
        throw new ApiError(400, 'Name, email, and password are required');
      }

      const result = await this.authService.registerUser({
        name,
        email,
        password,
        team,
        inviteToken,
        recaptchaToken: recaptchaToken || undefined
      });
      
      res.json({
        success: true,
        data: result.data
      });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  /**
   * Handles email verification resend requests
   * POST /resend-verification
   */
  async resendVerification(req: Request, res: Response): Promise<void> {
    try {
      const { email } = req.body;
      
      if (!email) {
        throw new ApiError(400, 'Email is required');
      }

      const result = await this.authService.resendEmailVerification(email);
      
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  /**
   * Handles account unlock requests
   * POST /unlock-account
   */
  async unlockAccount(req: Request, res: Response): Promise<void> {
    try {
      const { email, expiredToken } = req.body;
      
      if (!email || !expiredToken) {
        throw new ApiError(400, 'Email and expired token are required');
      }

      const result = await this.authService.unlockAccountRequest(email, expiredToken);
      
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  /**
   * Handles custom sign out requests
   * POST /sign-out
   * Requires authentication
   */
  async signOut(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user?.id) {
        throw new ApiError(401, 'User not authenticated');
      }

      const result = await this.authService.customSignOut(req.user.id);
      
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  /**
   * Handles user sessions requests
   * GET /sessions
   * Requires authentication
   */
  async getUserSessions(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user?.id) {
        throw new ApiError(401, 'User not authenticated');
      }

      const sessions = await this.authService.getUserSessions(req.user.id);
      
      res.json({
        success: true,
        data: sessions
      });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  /**
   * Handles user session deletion
   * DELETE /sessions/:sessionId
   * Requires authentication
   */
  async deleteUserSession(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user?.id) {
        throw new ApiError(401, 'User not authenticated');
      }

      const { sessionId } = req.params;
      if (!sessionId) {
        throw new ApiError(400, 'Session ID is required');
      }

      const result = await this.authService.deleteUserSession(req.user.id, sessionId);
      
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  /**
   * Handles user profile updates
   * PUT /profile
   * Requires authentication
   */
  async updateUserProfile(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user?.id) {
        throw new ApiError(401, 'User not authenticated');
      }

      const { name, email } = req.body;
      
      if (!name && !email) {
        throw new ApiError(400, 'At least one field (name or email) is required');
      }

      const result = await this.authService.updateUserProfile(req.user.id, { name, email });
      
      res.json({
        success: true,
        data: result.data
      });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  /**
   * Centralized error handling for controller methods
   * @param error - Error object
   * @param res - Express response object
   */
  private handleError(error: any, res: Response): void {
    if (error instanceof ApiError) {
      res.status(error.statusCode).json({
        success: false,
        error: {
          message: error.message,
          statusCode: error.statusCode,
          code: error.code
        }
      });
    } else {
      console.error('Unexpected error in AuthController:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Internal server error',
          statusCode: 500
        }
      });
    }
  }
}
