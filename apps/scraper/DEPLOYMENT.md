# Scraper API Deployment Guide - AWS Lightsail

## Overview
This guide will help you deploy the Wirecrest Scraper API to AWS Lightsail using Docker containers.

## Prerequisites

### Local Development
- Docker and Docker Compose installed
- Node.js 18+ installed
- Git installed
- AWS CLI configured (optional but recommended)

### AWS Account Setup
- AWS account with billing enabled
- AWS CLI configured with appropriate permissions
- Access to AWS Lightsail console

## Local Development Setup

### 1. Clone and Setup
```bash
# Navigate to the scraper API directory
cd wirecrest-scrape-worker-api

# Install dependencies
npm install

# Create environment file
cp .env.example .env
# Edit .env with your configuration
```

### 2. Environment Configuration
Create a `.env` file with the following variables:

```env
# Basic Configuration
NODE_ENV=production
PORT=3000

# Apify Configuration
APIFY_TOKEN=your_apify_token_here
APIFY_GOOGLE_REVIEWS_ACTOR_ID=your_google_actor_id
APIFY_FACEBOOK_REVIEWS_ACTOR_ID=your_facebook_actor_id
APIFY_TRIPADVISOR_REVIEWS_ACTOR_ID=your_tripadvisor_actor_id
APIFY_BOOKING_PROFILE_ACTOR_ID=your_booking_profile_actor_id
APIFY_BOOKING_REVIEWS_ACTOR_ID=your_booking_reviews_actor_id

# Database Configuration (Supabase)
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Redis Configuration
REDIS_URL=redis://localhost:6379

# Optional: Database URL for direct PostgreSQL connection
DATABASE_URL=postgresql://user:password@localhost:5432/database_name

# Security
JWT_SECRET=your_jwt_secret_here
API_KEY_SECRET=your_api_key_secret_here
```

### 3. Local Testing
```bash
# Build and run with Docker Compose
docker-compose up --build

# Or run in development mode
npm run dev

# Test the API
curl http://localhost:3000/health
```

## AWS Lightsail Deployment

### Step 1: Create a Lightsail Container Service

1. **Login to AWS Console**
   - Go to AWS Lightsail console
   - Navigate to "Containers" section

2. **Create Container Service**
   - Click "Create container service"
   - Choose your preferred region
   - Select container service capacity:
     - **Nano** (512 MB RAM, 0.25 vCPU) - $7/month - For testing
     - **Micro** (1 GB RAM, 0.5 vCPU) - $10/month - For light production
     - **Small** (2 GB RAM, 1 vCPU) - $20/month - For production
     - **Medium** (4 GB RAM, 2 vCPU) - $40/month - For high-traffic production

3. **Configure Container**
   - Service name: `wirecrest-scraper-api`
   - Container name: `scraper-api`

### Step 2: Prepare Docker Image

#### Option A: Use Lightsail's Built-in Container Registry

1. **Build and Push Image**
```bash
# Build the image
docker build -t wirecrest-scraper-api .

# Tag for Lightsail
docker tag wirecrest-scraper-api:latest wirecrest-scraper-api:v1.0.0

# Push to Lightsail (this will be done via the console)
```

#### Option B: Use Amazon ECR (Recommended for Production)

1. **Create ECR Repository**
```bash
# Create ECR repository
aws ecr create-repository \
    --repository-name wirecrest-scraper-api \
    --region us-east-1

# Get login token
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <account-id>.dkr.ecr.us-east-1.amazonaws.com
```

2. **Build and Push to ECR**
```bash
# Build image
docker build -t wirecrest-scraper-api .

# Tag for ECR
docker tag wirecrest-scraper-api:latest <account-id>.dkr.ecr.us-east-1.amazonaws.com/wirecrest-scraper-api:latest

# Push to ECR
docker push <account-id>.dkr.ecr.us-east-1.amazonaws.com/wirecrest-scraper-api:latest
```

### Step 3: Configure Container Service

1. **Container Configuration**
   - Image: Use the ECR image URI or upload via Lightsail
   - Open ports: 3000 (HTTP)
   - Environment variables: Add all variables from your `.env` file

2. **Environment Variables Setup**
   ```
   NODE_ENV=production
   PORT=3000
   APIFY_TOKEN=your_apify_token
   SUPABASE_URL=your_supabase_url
   SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
   REDIS_URL=redis://redis-cluster.xxxxxx.cache.amazonaws.com:6379
   ```

3. **Health Check Configuration**
   - Health check path: `/health`
   - Health check interval: 30 seconds
   - Health check timeout: 5 seconds
   - Healthy threshold: 2
   - Unhealthy threshold: 3

### Step 4: Configure External Services

#### Redis Setup (Amazon ElastiCache)
1. **Create Redis Cluster**
   - Go to ElastiCache console
   - Create Redis cluster
   - Choose t3.micro for development or t3.small for production
   - Enable encryption in transit
   - Configure security groups to allow access from Lightsail

2. **Configure Security Groups**
   ```bash
   # Allow Lightsail container service to access Redis
   aws ec2 authorize-security-group-ingress \
       --group-id sg-xxxxxxxxx \
       --protocol tcp \
       --port 6379 \
       --source-group sg-lightsail-container-service
   ```

#### Database Configuration
Since you're using Supabase, no additional setup is needed. Just ensure your Supabase project is properly configured and accessible.

### Step 5: Deploy the Container

1. **Create Deployment**
   - In Lightsail console, go to your container service
   - Click "Create new deployment"
   - Configure container settings:
     - Image: Select your uploaded image
     - Environment variables: Add all required variables
     - Port mappings: 3000 → 3000
     - Health check: Enable with `/health` endpoint

2. **Deploy**
   - Click "Save and deploy"
   - Wait for deployment to complete (usually 5-10 minutes)

### Step 6: Configure Custom Domain (Optional)

1. **Create SSL Certificate**
   - In Lightsail console, go to "Networking" → "Certificates"
   - Create certificate for your domain
   - Add required DNS records to your domain provider

2. **Configure Custom Domain**
   - In your container service, go to "Custom domains"
   - Add your domain and select the certificate
   - Update your DNS to point to the Lightsail load balancer

### Step 7: Monitor and Scale

1. **Monitoring**
   - Use Lightsail metrics to monitor CPU, memory, and network usage
   - Set up CloudWatch alarms for critical metrics
   - Monitor application logs via Lightsail console

2. **Scaling**
   - Scale vertically by changing container service capacity
   - Scale horizontally by increasing container count
   - Use auto-scaling rules based on CPU/memory usage

## Production Optimizations

### 1. Multi-Container Setup
```yaml
# docker-compose.production.yml
version: '3.8'
services:
  scraper-api:
    image: your-ecr-repo/wirecrest-scraper-api:latest
    environment:
      - NODE_ENV=production
      - REDIS_URL=redis://your-elasticache-endpoint:6379
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    deploy:
      replicas: 2
      resources:
        limits:
          memory: 1G
        reservations:
          memory: 512M
```

### 2. Security Best Practices
- Use AWS Secrets Manager for sensitive environment variables
- Enable AWS WAF for DDoS protection
- Configure security groups with minimal required access
- Use IAM roles for service-to-service communication
- Enable logging and monitoring

### 3. Cost Optimization
- Use spot instances for non-critical workloads
- Implement auto-scaling to reduce costs during low traffic
- Use CloudWatch to monitor and optimize resource usage
- Consider using AWS Lambda for periodic tasks

## Troubleshooting

### Common Issues

1. **Container fails to start**
   - Check environment variables are correctly set
   - Verify Docker image builds successfully locally
   - Check CloudWatch logs for error messages

2. **Health check failures**
   - Ensure `/health` endpoint is accessible
   - Check if application is binding to correct port (3000)
   - Verify health check configuration

3. **Database connection issues**
   - Check Supabase URL and keys
   - Verify network connectivity
   - Check security group rules

4. **Redis connection issues**
   - Verify ElastiCache endpoint URL
   - Check security group configurations
   - Ensure Redis cluster is running

### Debugging Commands
```bash
# View container logs
aws lightsail get-container-log \
    --service-name wirecrest-scraper-api \
    --container-name scraper-api

# Check container service status
aws lightsail get-container-services \
    --service-name wirecrest-scraper-api
```

## Maintenance

### Regular Tasks
- Monitor application logs and metrics
- Update Docker images with security patches
- Backup database regularly
- Review and rotate API keys/secrets
- Monitor costs and optimize resources

### Scaling Considerations
- Monitor API response times and error rates
- Set up alerts for high memory/CPU usage
- Plan for traffic spikes during peak times
- Consider implementing caching strategies

## Cost Estimation

### Monthly Costs (US East)
- **Lightsail Container Service**: $10-40/month (depending on size)
- **ElastiCache Redis**: $15-30/month (t3.micro to t3.small)
- **Data Transfer**: $0.09/GB after free tier
- **Domain/SSL**: $0 (included with Lightsail)
- **Total**: ~$25-70/month for a production setup

### Cost Optimization Tips
- Use CloudWatch to monitor actual usage
- Implement auto-scaling to reduce costs during low traffic
- Consider using reserved instances for predictable workloads
- Monitor and optimize data transfer costs

## Security Checklist

- [ ] Environment variables stored securely
- [ ] SSL/TLS enabled for all endpoints
- [ ] Security groups configured with minimal access
- [ ] API rate limiting implemented
- [ ] Logging and monitoring enabled
- [ ] Regular security updates applied
- [ ] Access keys rotated regularly
- [ ] Network traffic encrypted

## Support

For issues or questions:
1. Check CloudWatch logs for error messages
2. Review Lightsail console for service status
3. Verify environment configuration
4. Check external service connectivity (Supabase, Redis)
5. Review this deployment guide for troubleshooting steps 