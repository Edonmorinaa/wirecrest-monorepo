export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function recordMetric(metric: string): void {
  // Implementation for recording metrics
  console.log(`Metric: ${metric}`);
}
