# Subdomain Setup Guide

This guide explains how to run the auth and dashboard projects with subdomain routing on localhost.

## Project Structure

- **Dashboard**: `http://wirecrest.local:3032` (main domain)
- **Auth**: `http://auth.localhost:3033` (auth subdomain)

## Setup Instructions

### 1. Start the Dashboard (Main Domain)
```bash
cd apps/dashboard
npm run dev
# or
yarn dev
```
This will run on `http://wirecrest.local:3032`

### 2. Start the Auth Project (Auth Subdomain)
```bash
cd apps/auth
npm run dev
# or
yarn dev
```
This will run on `http://auth.localhost:3033`

## Subdomain Routing

### Dashboard (wirecrest.local:3032)
- Main application
- Team-specific routes: `http://team-slug.wirecrest.local:3032`
- Auth routes redirect to: `http://auth.localhost:3033`

### Auth (auth.localhost:3033)
- Authentication pages
- Sign-in, sign-up, password reset
- **Smart redirects**: After authentication, redirects back to:
  - Team subdomain if user came from a team subdomain
  - Team subdomain if stored in localStorage/sessionStorage
  - Main domain as fallback

## Testing

1. **Main Domain**: Visit `http://wirecrest.local:3032`
2. **Auth Subdomain**: Visit `http://auth.localhost:3033`
3. **Team Subdomain**: Visit `http://team-slug.wirecrest.local:3032` (replace `team-slug` with actual team)
4. **Test Page**: Visit `http://auth.localhost:3033/test-subdomain` to see subdomain info and test redirects

### Testing Team Subdomain Redirects

1. Visit a team subdomain: `http://myteam.wirecrest.local:3032`
2. Navigate to auth: `http://auth.localhost:3033`
3. After authentication, you should be redirected back to `http://myteam.wirecrest.local:3032`

## Environment Variables

Both projects should share the same environment variables for:
- Database connection
- NextAuth configuration
- API endpoints

## Port Configuration

- Dashboard: Port 3032
- Auth: Port 3033

This allows both to run simultaneously on localhost with different subdomains.

## Production Deployment

In production, configure your DNS to point:
- `domain.com` → Dashboard
- `auth.domain.com` → Auth project
- `team-slug.domain.com` → Dashboard (with team context)
