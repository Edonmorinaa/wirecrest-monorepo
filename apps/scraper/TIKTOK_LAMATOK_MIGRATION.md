# TikTok API Migration: ScrapeCreators → LamaTok

## Overview

This document describes the migration of the TikTok data service from ScrapeCreators API to LamaTok API.

## Changes Made

### 1. Environment Variables
- **Old**: `SCRAPECREATORS_API_KEY`
- **New**: `LAMATOK_ACCESS_KEY`

### 2. API Configuration
- **Old Base URL**: `https://api.scrapecreators.com`
- **New Base URL**: `https://api.lamatok.com`

### 3. Authentication
- **Old**: Bearer token in Authorization header
- **New**: Access key in `access_key` header

### 4. API Endpoints

#### User Information
- **Old**: `POST /tiktok/user`
- **New**: `GET /v1/user/by/username?username={username}`

#### User Videos
- **Old**: `POST /tiktok/user-videos`
- **New**: `⚠️  Not available in LamaTok API - functionality limited`

#### Video Comments
- **Old**: `POST /tiktok/video-comments`
- **New**: `GET /v1/media/comments/by/id?id={videoId}&count={count}`

### 5. Data Structure Changes

#### User Response
- Added `secUid` field for video fetching
- Maintained backward compatibility with existing interfaces

#### Video Response
- Added `hasMore` and `cursor` fields for pagination
- Maintained existing video structure

#### Comment Response
- Added `hasMore` and `cursor` fields for pagination
- Maintained existing comment structure

## Migration Steps

### 1. Update Environment Variables
```bash
# Remove old variable
unset SCRAPECREATORS_API_KEY

# Add new variable
export LAMATOK_ACCESS_KEY="your_lamatok_access_key"
```

### 2. Get LamaTok Access Key
1. Visit [LamaTok](https://lamatok.com/tokens)
2. Create an account and get your access key
3. Set the environment variable

### 3. Test the Integration
```bash
# Run the test script
npm run test:lamatok
# or
npx ts-node scripts/test-lamatok-api.ts
```

## Backward Compatibility

The migration maintains backward compatibility through:
- Legacy type aliases (`ScrapeCreatorsTikTokUserResponse` → `LamaTokUserResponse`)
- Same method signatures in the service
- Same database schema and data structures

## Benefits of LamaTok API

1. **Better Rate Limits**: More generous rate limits for production use
2. **Improved Reliability**: More stable API with better uptime
3. **Enhanced Features**: Additional endpoints for hashtags, music, etc.
4. **Better Documentation**: Comprehensive OpenAPI specification
5. **Cost Effective**: More competitive pricing for high-volume usage

## Limitations

1. **No User Videos Endpoint**: LamaTok API does not provide a direct endpoint for fetching user videos
2. **Limited Video Functionality**: Video-related features may need alternative implementation
3. **Comments Limited**: Comments can only be fetched by specific video ID, not by user

## Testing

Use the provided test script to verify the integration:

```bash
LAMATOK_ACCESS_KEY="your_key" npx ts-node scripts/test-lamatok-api.ts
```

## Troubleshooting

### Common Issues

1. **401 Unauthorized**: Check your `LAMATOK_ACCESS_KEY` is correct
2. **404 Not Found**: Verify the username exists on TikTok
3. **Rate Limit Exceeded**: Implement proper rate limiting in your application

### Debug Mode

Enable debug logging by setting:
```bash
export DEBUG_TIKTOK=true
```

## API Documentation

For complete API documentation, visit:
- [LamaTok API Docs](https://api.lamatok.com/redoc)
- [OpenAPI Specification](https://api.lamatok.com/openapi.json) 