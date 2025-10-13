#!/bin/bash

# Vercel Build Script for Dashboard
# This script handles the monorepo workspace dependencies for Vercel deployment

echo "🚀 Starting Vercel build for dashboard..."

# Install dependencies from root
echo "📦 Installing dependencies from monorepo root..."
cd ../..
yarn install

# Build workspace packages first
echo "🔨 Building workspace packages..."
yarn workspace @wirecrest/db build
yarn workspace @wirecrest/core build  
yarn workspace @wirecrest/auth build
yarn workspace @wirecrest/billing build
yarn workspace @wirecrest/email build
yarn workspace @wirecrest/notifications build

# Build dashboard
echo "🏗️ Building dashboard..."
yarn workspace dashboard build

echo "✅ Build completed successfully!"
