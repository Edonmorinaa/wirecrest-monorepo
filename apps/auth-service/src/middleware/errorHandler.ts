import { Request, Response, NextFunction } from 'express';

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
 * Centralized error handling middleware
 * Transforms all errors into consistent API response format
 * 
 * @param err - Error object
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 */
export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  console.error('Error in auth-service:', err);

  if (err instanceof ApiError) {
    res.status(err.statusCode).json({
      success: false,
      error: {
        message: err.message,
        statusCode: err.statusCode,
        code: err.code
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
