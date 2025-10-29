/**
 * External API Client Interface
 * Follows Dependency Inversion Principle (DIP)
 * Abstracts external API integrations
 */

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  statusCode?: number;
  rateLimit?: {
    remaining: number;
    reset: Date;
  };
}

export interface ApiRequestConfig {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  endpoint: string;
  params?: Record<string, any>;
  body?: any;
  headers?: Record<string, string>;
  timeout?: number;
}

export interface IExternalApiClient {
  /**
   * Make API request
   */
  request<T = any>(config: ApiRequestConfig): Promise<ApiResponse<T>>;

  /**
   * Get API client name/identifier
   */
  getClientName(): string;

  /**
   * Check if API is available
   */
  healthCheck(): Promise<boolean>;
}

export interface IFacebookGraphApiClient extends IExternalApiClient {
  /**
   * Get page information
   */
  getPageInfo(pageId: string, accessToken: string): Promise<ApiResponse<any>>;

  /**
   * Get page ratings
   */
  getPageRatings(pageId: string, accessToken: string): Promise<ApiResponse<any>>;

  /**
   * Post to page
   */
  postToPage(pageId: string, accessToken: string, message: string): Promise<ApiResponse<any>>;
}

export interface IHikerApiClient extends IExternalApiClient {
  /**
   * Get Instagram user profile
   */
  getUserProfile(username: string): Promise<ApiResponse<any>>;

  /**
   * Get user media
   */
  getUserMedia(username: string, limit?: number): Promise<ApiResponse<any>>;

  /**
   * Get media comments
   */
  getMediaComments(mediaId: string): Promise<ApiResponse<any>>;
}

export interface ILamaTokApiClient extends IExternalApiClient {
  /**
   * Get TikTok user profile
   */
  getUserProfile(username: string): Promise<ApiResponse<any>>;

  /**
   * Get user videos
   */
  getUserVideos(username: string, limit?: number): Promise<ApiResponse<any>>;

  /**
   * Get video comments
   */
  getVideoComments(videoId: string): Promise<ApiResponse<any>>;
}

