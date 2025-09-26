import { Request, Response, NextFunction } from 'express';
import { getToken } from 'next-auth/jwt';

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
 * JWT validation middleware for NextAuth session tokens
 * Validates the session token and extracts user information
 * 
 * @param req - Express request object
 * @param res - Express response object  
 * @param next - Express next function
 * @throws {ApiError} 401 if token is invalid or expired
 */
export async function validateSession(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const token = await getToken({ 
      req: req as any, 
      secret: process.env.NEXTAUTH_SECRET 
    });
    
    if (!token?.user || !(token.user as { id?: string }).id) {
      throw new ApiError(401, 'Unauthorized - Invalid or expired session');
    }
    
    // Attach user information to request object
    req.user = {
      id: (token.user as { id: string }).id,
      email: (token.user as { email: string }).email,
      name: (token.user as { name?: string }).name,
      role: (token.user as { role?: string }).role,
      superRole: (token.user as { superRole?: string }).superRole,
      teamId: (token.user as { teamId?: string }).teamId
    };
    
    next();
  } catch (error: any) {
    if (error instanceof ApiError) {
      res.status(error.statusCode).json({
        success: false,
        error: {
          message: error.message,
          statusCode: error.statusCode
        }
      });
    } else {
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

// Extend Express Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        name?: string;
        role?: string;
        superRole?: string;
        teamId?: string;
      };
    }
  }
}
