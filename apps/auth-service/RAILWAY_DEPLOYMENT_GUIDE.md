# Railway Deployment Guide for Auth Service

## Overview
This guide covers deploying the auth-service from a monorepo to Railway using Docker.

## Prerequisites
- Railway account
- Railway CLI installed (`npm install -g @railway/cli`)
- Docker installed locally (for testing)

## Environment Variables
Set these environment variables in Railway dashboard:

### Required
- `NODE_ENV=production`
- `PORT` (Railway will set this automatically)
- Database connection variables (from your `@wirecrest/db` package)

### Optional
- `CORS_ORIGIN` - Override CORS origins if needed
- `RATE_LIMIT_MAX` - Override rate limiting (default: 100)

## Deployment Steps

### 1. Connect Repository
1. Go to Railway dashboard
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Choose your repository
5. Select the `apps/auth-service` directory as the root

### 2. Configure Build Settings
Railway will automatically detect the Dockerfile. The configuration is optimized for:
- Multi-stage builds for smaller images
- Proper workspace dependency handling
- Security best practices (non-root user)
- Health checks

### 3. Set Environment Variables
In Railway dashboard, go to Variables tab and add:
```
NODE_ENV=production
DATABASE_URL=your_database_url
# Add other required environment variables
```

### 4. Deploy
Railway will automatically build and deploy when you push to your main branch.

## Docker Build Optimization

The Dockerfile includes several optimizations:

### Multi-stage Build
- **deps**: Installs dependencies
- **builder**: Compiles TypeScript
- **runner**: Production runtime (smallest image)

### Security Features
- Non-root user execution
- Minimal attack surface
- Health checks for monitoring

### Monorepo Support
- Properly handles workspace dependencies
- Copies only necessary packages (`@wirecrest/auth`, `@wirecrest/db`)
- Optimized layer caching

## Monitoring

### Health Checks
- Endpoint: `/health`
- Railway will use this for health monitoring
- Returns service status and timestamp

### Logs
Access logs through Railway dashboard or CLI:
```bash
railway logs
```

## Troubleshooting

### Common Issues

1. **Build Failures**
   - Check that all workspace dependencies are properly copied
   - Verify TypeScript compilation succeeds locally

2. **Runtime Errors**
   - Verify all environment variables are set
   - Check database connectivity
   - Review application logs

3. **Performance Issues**
   - Monitor memory usage in Railway dashboard
   - Consider upgrading Railway plan if needed

### Local Testing
Test the Docker build locally:
```bash
# Build the image
docker build -t auth-service .

# Run the container
docker run -p 3000:3000 --env-file .env auth-service
```

## Production Considerations

### Security
- All secrets should be in Railway environment variables
- CORS is configured for production domains
- Rate limiting is enabled
- Helmet security headers are applied

### Performance
- Multi-stage build reduces image size
- Only production dependencies in final image
- Optimized for Railway's infrastructure

### Scaling
Railway will automatically handle:
- Load balancing
- Health checks
- Auto-restart on failures
- Resource allocation

## Support
For issues specific to this deployment:
1. Check Railway logs
2. Verify environment variables
3. Test locally with Docker
4. Review this guide for configuration
