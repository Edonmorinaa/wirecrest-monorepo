#!/bin/bash

# Wirecrest Scraper API Deployment Script
# This script helps build and deploy the Docker container

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
APP_NAME="wirecrest-scraper-api"
VERSION="${1:-latest}"
AWS_REGION="${AWS_REGION:-us-east-1}"
ECR_REPO="${ECR_REPO:-}"

# Functions
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
    exit 1
}

# Check requirements
check_requirements() {
    log "Checking requirements..."
    
    if ! command -v docker &> /dev/null; then
        error "Docker is not installed or not in PATH"
    fi
    
    if ! command -v aws &> /dev/null; then
        warn "AWS CLI is not installed. ECR deployment will not be available."
    fi
    
    if [ ! -f ".env" ]; then
        warn "No .env file found. Make sure to create one before deployment."
    fi
    
    log "Requirements check completed"
}

# Build Docker image
build_image() {
    log "Building Docker image..."
    
    # Build the image
    docker build -t "${APP_NAME}:${VERSION}" .
    
    # Also tag as latest
    docker tag "${APP_NAME}:${VERSION}" "${APP_NAME}:latest"
    
    log "Docker image built successfully: ${APP_NAME}:${VERSION}"
}

# Test image locally
test_image() {
    log "Testing Docker image locally..."
    
    # Run a quick test
    docker run --rm "${APP_NAME}:${VERSION}" node -e "console.log('Image test successful')"
    
    log "Docker image test completed"
}

# Deploy to ECR
deploy_to_ecr() {
    if [ -z "$ECR_REPO" ]; then
        error "ECR_REPO environment variable not set"
    fi
    
    log "Deploying to ECR..."
    
    # Get AWS account ID
    AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
    
    # Login to ECR
    aws ecr get-login-password --region ${AWS_REGION} | docker login --username AWS --password-stdin ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com
    
    # Tag for ECR
    docker tag "${APP_NAME}:${VERSION}" "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPO}:${VERSION}"
    docker tag "${APP_NAME}:${VERSION}" "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPO}:latest"
    
    # Push to ECR
    docker push "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPO}:${VERSION}"
    docker push "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPO}:latest"
    
    log "Successfully deployed to ECR: ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPO}:${VERSION}"
}

# Run with docker-compose
run_local() {
    log "Running locally with docker-compose..."
    
    if [ ! -f "docker-compose.yml" ]; then
        error "docker-compose.yml not found"
    fi
    
    docker-compose up --build
}

# Clean up
cleanup() {
    log "Cleaning up..."
    
    # Remove unused Docker images
    docker image prune -f
    
    log "Cleanup completed"
}

# Main script
main() {
    echo "================================================"
    echo "Wirecrest Scraper API Deployment Script"
    echo "================================================"
    echo
    
    case "${1:-build}" in
        "build")
            check_requirements
            build_image
            test_image
            log "Build completed! Use 'docker run -p 3000:3000 ${APP_NAME}:latest' to test locally"
            ;;
        "deploy")
            check_requirements
            build_image
            test_image
            deploy_to_ecr
            log "Deployment completed!"
            ;;
        "local")
            check_requirements
            run_local
            ;;
        "clean")
            cleanup
            ;;
        "help"|"-h"|"--help")
            echo "Usage: $0 [command]"
            echo
            echo "Commands:"
            echo "  build   - Build Docker image (default)"
            echo "  deploy  - Build and deploy to ECR"
            echo "  local   - Run locally with docker-compose"
            echo "  clean   - Clean up unused Docker images"
            echo "  help    - Show this help message"
            echo
            echo "Environment variables:"
            echo "  AWS_REGION  - AWS region for ECR (default: us-east-1)"
            echo "  ECR_REPO    - ECR repository name"
            echo
            echo "Examples:"
            echo "  $0 build"
            echo "  ECR_REPO=wirecrest-scraper-api $0 deploy"
            echo "  $0 local"
            ;;
        *)
            error "Unknown command: $1. Use '$0 help' for usage information."
            ;;
    esac
}

# Run main function with all arguments
main "$@" 