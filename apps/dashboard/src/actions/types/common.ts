// Common API response types
export interface ApiResponse<T = any> {
  data?: T;
  error?: {
    code: number;
    message: string;
    values?: Record<string, any>;
  };
}

// Common pagination type
export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface PaginationResponse {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

// Team types with member count
export interface TeamWithMemberCount {
  id: string;
  name: string;
  slug: string;
  domain: string | null;
  defaultRole: string;
  billingId: string | null;
  billingProvider: string | null;
  createdAt: Date;
  updatedAt: Date;
  _count: {
    members: number;
  };
}

// Common error types
export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}
