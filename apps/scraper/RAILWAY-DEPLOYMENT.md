# Railway Deployment Guide

## Required Environment Variables

To deploy this application on Railway, you need to set the following environment variables:

### **Essential Variables (Required)**
```bash
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

### **Optional Variables (Recommended)**
```bash
# Apify API Token (required for scraping functionality)
APIFY_TOKEN=your_apify_token

# Google API Key (for Google Business Profile creation)
GOOGLE_API_KEY=your_google_api_key

# Database URL (defaults to SUPABASE_URL if not set)
DATABASE_URL=your_database_connection_string

# Performance Settings
ACTOR_MEMORY_LIMIT_MB=2048
POLLING_INTERVAL_MINUTES=10
POLLING_BATCH_SIZE=5

# Environment
NODE_ENV=production
```

## Deployment Steps

1. **Connect your repository to Railway**
   - Push your code to a Git repository
   - Connect the repository to Railway

2. **Set environment variables**
   - Go to your Railway project settings
   - Add the required environment variables listed above

3. **Deploy**
   - Railway will automatically build and deploy your application
   - The build process will compile TypeScript to JavaScript
   - The application will be available at your Railway-provided URL

## Health Check Endpoints

The application provides two health check endpoints:

- **`/ready`** - Quick health check that returns immediately
- **`/health`** - Comprehensive health check that verifies all services are initialized

Railway's health checks use the `/ready` endpoint for faster startup times.

## Environment Variable Sources

- **SUPABASE_URL**: Get this from your Supabase project settings
- **SUPABASE_SERVICE_ROLE_KEY**: Get this from your Supabase project API settings
- **APIFY_TOKEN**: Get this from your Apify account settings
- **GOOGLE_API_KEY**: Get this from Google Cloud Console with Places API enabled

## Troubleshooting

### Health Check Failures (Fixed in Latest Version)
- The application now returns 200 OK for health checks even during startup
- Railway health checks use the `/health` endpoint which is now startup-friendly
- The `/ready` endpoint provides a quick health check without service validation

### Common Issues
1. **Missing Environment Variables**
   - Ensure `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set
   - Missing `APIFY_TOKEN` will disable scraping but won't prevent startup
   - Check Railway logs for missing variable warnings

2. **Startup Failures**
   - Check Railway build logs for compilation errors
   - Verify all dependencies are properly installed
   - Ensure TypeScript compiles successfully

3. **Database Connection Issues**
   - Verify Supabase credentials are correct
   - Check if Supabase project is accessible from Railway
   - Ensure connection strings don't have extra spaces or characters

### Missing Features
- If scraping doesn't work, ensure `APIFY_TOKEN` is set
- If Google Business Profile creation fails, ensure `GOOGLE_API_KEY` is set
- Polling service will be disabled if database connection fails (app continues running)

### Debugging Steps
1. Check Railway deployment logs for startup messages
2. Use the `/health` endpoint to check service status
3. Verify environment variables in Railway dashboard
4. Test endpoints individually after deployment

## Application Structure

The application includes:
- Review analytics API endpoints
- Multi-platform scraping (Google, Facebook, TripAdvisor, Booking.com)
- Sentiment analysis
- Business profile management
- Task tracking system

## Support

For deployment issues, check:
1. Railway build logs
2. Application logs in Railway console
3. Environment variable configuration 