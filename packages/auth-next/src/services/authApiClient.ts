import axios, { AxiosInstance, AxiosResponse } from 'axios';

/**
 * API Error class for structured error handling
 */
export class ApiError extends Error {
  constructor(public statusCode: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Authentication API client for communicating with auth-service
 * Follows Dependency Inversion Principle - depends on abstractions, not concretions
 */
export class AuthApiClient {
  private client: AxiosInstance;
  private baseURL: string;

  constructor(baseURL: string = process.env.AUTH_SERVICE_URL || 'http://localhost:3000') {
    this.baseURL = baseURL;
    this.client = axios.create({
      baseURL,
      timeout: 10000,
      withCredentials: true, // This ensures cookies are sent with requests
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  /**
   * Sets up request/response interceptors for error handling
   */
  private setupInterceptors(): void {
    // Request interceptor to add cookies
    this.client.interceptors.request.use(
      (config) => {
        // In browser environment, cookies are automatically sent with withCredentials: true
        // In server environment, we need to manually pass cookies
        if (typeof window === 'undefined') {
          // Server-side: try to get session token and add as cookie
          const sessionToken = this.getSessionToken();
          if (sessionToken) {
            config.headers.Cookie = `next-auth.session-token=${sessionToken}`;
          }
        }
        // Client-side: cookies are automatically included with withCredentials: true
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        console.log('API Error Details:', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          message: error.message,
          code: error.code
        });
        
        // Handle structured error response
        if (error.response?.data?.error) {
          const errorData = error.response.data.error;
          throw new ApiError(
            errorData.statusCode || error.response.status || 500,
            errorData.message || 'API request failed'
          );
        }
        
        // Handle simple error message
        if (error.response?.data?.message) {
          throw new ApiError(
            error.response.status || 500,
            error.response.data.message
          );
        }
        
        // Handle HTTP status codes
        if (error.response?.status) {
          const message = error.response.data?.message || 
                         error.response.statusText || 
                         `HTTP ${error.response.status} error`;
          throw new ApiError(error.response.status, message);
        }
        
        // Handle network errors (no response)
        if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
          throw new ApiError(500, `Cannot connect to auth service at ${this.baseURL}`);
        }
        
        if (error.code === 'ETIMEDOUT') {
          throw new ApiError(500, 'Request timeout - auth service is not responding');
        }
        
        // Fallback for unknown errors
        throw new ApiError(500, `Network error: ${error.message}`);
      }
    );
  }

  /**
   * Gets session token from NextAuth cookies
   * This extracts the session token from NextAuth cookies
   */
  private getSessionToken(): string | null {
    // In browser environment, get from NextAuth session token cookie
    if (typeof window !== 'undefined') {
      // Try to get from document.cookie
      const cookies = document.cookie.split(';');
      for (const cookie of cookies) {
        const [name, value] = cookie.trim().split('=');
        if (name === 'next-auth.session-token' || name === '__Secure-next-auth.session-token') {
          return decodeURIComponent(value);
        }
      }
    }
    
    // In server environment, this should be passed from the server action
    return null;
  }

  /**
   * Sets the session token for API calls
   * @param token - NextAuth session token
   */
  setSessionToken(token: string): void {
    if (typeof window !== 'undefined') {
      (window as any).__NEXTAUTH_SESSION_TOKEN__ = token;
    }
  }

  /**
   * Initiates password reset process
   * @param email - User's email address
   * @param recaptchaToken - reCAPTCHA validation token
   */
  async forgotPassword(email: string, recaptchaToken: string): Promise<{ success: boolean }> {
    const response: AxiosResponse = await this.client.post('/forgot-password', {
      email,
      recaptchaToken,
    });
    return response.data;
  }

  /**
   * Resets user password using reset token
   * @param token - Password reset token
   * @param password - New password
   */
  async resetPassword(token: string, password: string): Promise<{ success: boolean; message: string }> {
    const response: AxiosResponse = await this.client.post('/reset-password', {
      token,
      password,
    });
    return response.data;
  }

  /**
   * Updates user password
   * @param currentPassword - User's current password
   * @param newPassword - New password
   */
  async updatePassword(currentPassword: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    const response: AxiosResponse = await this.client.post('/update-password', {
      currentPassword,
      newPassword,
    });
    return response.data;
  }

  /**
   * Registers a new user
   * @param userData - User registration data
   */
  async registerUser(userData: {
    name: string;
    email: string;
    password: string;
    team?: string;
    inviteToken?: string;
    recaptchaToken: string;
  }): Promise<{ success: boolean; data: any }> {
    console.log('registerUser', userData);
    const response: AxiosResponse = await this.client.post('/register', userData);
    return response.data;
  }

  /**
   * Resends email verification
   * @param email - User's email address
   */
  async resendEmailVerification(email: string): Promise<{ success: boolean }> {
    const response: AxiosResponse = await this.client.post('/resend-verification', {
      email,
    });
    return response.data;
  }

  /**
   * Handles account unlock request
   * @param email - User's email address
   * @param expiredToken - Expired verification token
   */
  async unlockAccountRequest(email: string, expiredToken: string): Promise<{ success: boolean }> {
    const response: AxiosResponse = await this.client.post('/unlock-account', {
      email,
      expiredToken,
    });
    return response.data;
  }

  /**
   * Custom sign out with cleanup - Not needed for JWT-based auth
   * NextAuth handles sign-out automatically
   */
  async customSignOut(): Promise<{ success: boolean; message: string }> {
    return { success: true, message: 'Sign out handled by NextAuth' };
  }

  /**
   * Gets user sessions - Not needed for JWT-based auth
   * NextAuth manages sessions automatically
   */
  async getUserSessions(): Promise<{ success: boolean; data: any[] }> {
    return { success: true, data: [] };
  }

  /**
   * Deletes a user session - Not needed for JWT-based auth
   * NextAuth manages session deletion automatically
   */
  async deleteUserSession(sessionId: string): Promise<{ success: boolean }> {
    return { success: true };
  }

  /**
   * Updates user profile
   * @param profileData - Profile data to update
   */
  async updateUserProfile(profileData: { name?: string; email?: string }): Promise<{ success: boolean; data: any }> {
    const response: AxiosResponse = await this.client.put('/profile', profileData);
    return response.data;
  }
}

// Singleton instance for global use
export const authApiClient = new AuthApiClient();
