# Twitter Profiles Migration to Supabase

## Overview

This document outlines the migration of Twitter profiles functionality from file-based JSON storage to Supabase database operations. The migration maintains all existing functionality while providing better scalability, data integrity, and user isolation.

## Changes Made

### 1. Database Schema

Added two new models to `prisma/schema.prisma`:

#### TwitterProfile Model

```prisma
model TwitterProfile {
  id                    String   @id @default(uuid())
  userId                String
  user                  User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  username              String
  displayName           String
  bio                   String?
  profileUrl            String
  verified              Boolean  @default(false)
  followersCount        Int      @default(0)
  followingCount        Int      @default(0)
  tweetsCount           Int      @default(0)
  profileImageUrl       String?
  customBio             String?
  isActive              Boolean  @default(true)
  lastSyncAt            DateTime?
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt

  // Relations
  tweets                TwitterTweet[]

  @@unique([userId, username])
  @@index([userId])
  @@index([username])
}
```

#### TwitterTweet Model

```prisma
model TwitterTweet {
  id                    String   @id @default(uuid())
  profileId             String
  profile               TwitterProfile @relation(fields: [profileId], references: [id], onDelete: Cascade)
  tweetId               String   @unique
  text                  String
  url                   String
  likes                 Int      @default(0)
  retweets              Int      @default(0)
  replies               Int      @default(0)
  hasMedia              Boolean  @default(false)
  mediaUrls             String[] @default([])
  tweetCreatedAt        DateTime
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt

  @@index([profileId])
  @@index([tweetId])
  @@index([tweetCreatedAt])
}
```

### 2. API Route Updates

#### `/api/twitter-profiles/route.ts`

- **GET**: Now fetches profiles from database with user isolation
- **POST**: Creates profiles in database with proper user association
- Maintains same response format for frontend compatibility

#### `/api/twitter-profiles/[id]/route.ts`

- **DELETE**: Soft deletes profiles from database with user validation
- Ensures users can only delete their own profiles

#### `/api/twitter-profiles/[id]/refresh/route.ts`

- **POST**: Updates profile data and refreshes tweets in database
- Maintains data consistency and user isolation

### 3. Key Improvements

#### User Isolation

- Each user can only access their own Twitter profiles
- Database queries include `userId` filtering
- Prevents cross-user data access

#### Data Integrity

- Foreign key relationships ensure data consistency
- Cascade deletes maintain referential integrity
- Unique constraints prevent duplicate profiles

#### Scalability

- Database indexing for better query performance
- No file system dependencies
- Concurrent access support

#### Error Handling

- Proper error messages for unauthorized access
- Database transaction support
- Graceful handling of missing data

## Migration Process

### 1. Database Migration

```bash
# Generate Prisma client
npx prisma generate

# Create and apply migration
npx prisma migrate dev --name add-twitter-profiles
```

### 2. Data Migration

Run the migration script to move existing data:

```bash
node scripts/migrate-twitter-profiles.js
```

This script will:

- Create a backup of `twitter-profiles.json`
- Migrate all existing profiles to the database
- Assign profiles to the first available user
- Preserve all tweet data

### 3. Verification

After migration:

1. Test all CRUD operations in the dashboard
2. Verify user isolation works correctly
3. Confirm data integrity is maintained
4. Check that existing functionality works as expected

## API Compatibility

The migration maintains full API compatibility:

### Response Format

All endpoints return the same response format as before:

```json
{
  "profiles": [...],
  "tweets": {...},
  "lastUpdated": "2025-01-XX..."
}
```

### Error Handling

Error responses maintain the same structure:

```json
{
  "error": "Error message",
  "message": "Detailed error description"
}
```

## Frontend Impact

**No changes required** - the frontend will continue to work exactly as before since:

- API endpoints remain the same
- Response formats are identical
- Error handling is consistent
- All existing features are preserved

## Benefits

1. **User Isolation**: Each user can only manage their own profiles
2. **Data Persistence**: No risk of data loss from file system issues
3. **Concurrent Access**: Multiple users can use the system simultaneously
4. **Scalability**: Database can handle much larger datasets
5. **Data Integrity**: Foreign keys and constraints ensure data consistency
6. **Performance**: Database indexing improves query performance
7. **Backup & Recovery**: Standard database backup procedures apply

## Rollback Plan

If needed, you can rollback by:

1. Restoring the backup JSON file: `twitter-profiles-backup.json`
2. Reverting the API route changes
3. The frontend will continue to work with the JSON file

## Files Modified

- `prisma/schema.prisma` - Added Twitter models
- `src/app/api/twitter-profiles/route.ts` - Updated to use database
- `src/app/api/twitter-profiles/[id]/route.ts` - Updated DELETE endpoint
- `src/app/api/twitter-profiles/[id]/refresh/route.ts` - Updated refresh endpoint
- `scripts/migrate-twitter-profiles.js` - Migration script (new)
- `TWITTER_PROFILES_MIGRATION.md` - This documentation (new)

## Next Steps

1. Run the database migration
2. Execute the data migration script
3. Test all functionality
4. Remove the original `twitter-profiles.json` file once confirmed working
5. Update any documentation or deployment scripts as needed
