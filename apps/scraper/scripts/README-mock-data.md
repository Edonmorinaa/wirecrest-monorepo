# Mock Data Scripts

This directory contains scripts to generate mock data for testing and development purposes.

## Available Scripts

### Instagram Mock Data

#### Basic Instagram Data (30 days)
- **Script**: `insert-mock-instagram-data.ts`
- **Runner**: `run-mock-instagram-data.ts`
- **Description**: Generates 30 days of Instagram mock data with realistic growth patterns
- **Usage**: `npm run mock:instagram`

#### 6 Months Instagram Data
- **Script**: `insert-6-months-mock-instagram-data.ts`
- **Runner**: `run-6-months-mock-instagram-data.ts`
- **Description**: Generates 6 months (180 days) of Instagram mock data with seasonal patterns
- **Usage**: `npm run mock:instagram:6months`

### TikTok Mock Data

#### Basic TikTok Data (30 days)
- **Script**: `insert-mock-tiktok-data-improved.ts`
- **Runner**: `run-mock-tiktok-data.ts`
- **Description**: Generates 30 days of TikTok mock data with realistic engagement patterns
- **Usage**: `npm run mock:tiktok`

#### 6 Months TikTok Data
- **Script**: `insert-6-months-mock-tiktok-data.ts`
- **Runner**: `run-6-months-mock-tiktok-data.ts`
- **Description**: Generates 6 months (180 days) of TikTok mock data with seasonal patterns
- **Usage**: `npm run mock:tiktok:6months`

### Combined Scripts

#### Both Platforms (30 days each)
- **Script**: `insert-mock-data-both-platforms.ts`
- **Runner**: `run-mock-data-both-platforms.ts`
- **Description**: Generates mock data for both Instagram and TikTok (30 days each)
- **Usage**: `npm run mock:both`

## Data Features

### Instagram Mock Data
- **Follower Growth**: Realistic daily growth with seasonal patterns
- **Engagement Metrics**: Likes, comments, saves, shares, reach, impressions
- **Content Metrics**: Posts, stories, reels with different engagement rates
- **Seasonal Patterns**: Higher engagement in summer, lower in winter
- **Viral Content**: Occasional viral posts with 10x engagement
- **Weekend Effects**: Higher engagement on weekends
- **Error Simulation**: 2% chance of API errors

### TikTok Mock Data
- **Follower Growth**: Realistic daily growth with seasonal patterns
- **Engagement Metrics**: Likes, comments, views, shares, downloads
- **Content Metrics**: Videos with high engagement rates
- **Seasonal Patterns**: Higher engagement in summer, lower in winter
- **Viral Content**: Occasional viral videos with 10x engagement
- **Weekend Effects**: Higher engagement on weekends
- **Error Simulation**: 2% chance of API errors

## Usage Examples

### Generate Instagram Data Only
```bash
# 30 days
npm run mock:instagram

# 6 months
npm run mock:instagram:6months
```

### Generate TikTok Data Only
```bash
# 30 days
npm run mock:tiktok

# 6 months
npm run mock:tiktok:6months
```

### Generate Both Platforms
```bash
# Both platforms (30 days each)
npm run mock:both
```

## Data Structure

### Instagram Snapshots
- Daily follower/following counts
- Engagement metrics (likes, comments, saves, shares)
- Reach and impressions
- Content metrics (posts, stories, reels)
- Growth calculations (daily, weekly, monthly)
- Engagement rates and ratios

### TikTok Snapshots
- Daily follower/following counts
- Engagement metrics (likes, comments, views, shares, downloads)
- Video metrics
- Growth calculations (daily, weekly, monthly)
- Engagement rates and ratios

## Business Profiles

Each script creates a mock business profile with:
- Realistic business information
- Current metrics from the latest snapshot
- Profile metadata (verification, category, etc.)
- Contact information

## Database Tables

### Instagram
- `InstagramBusinessProfile` - Business profile information
- `InstagramDailySnapshot` - Daily analytics snapshots

### TikTok
- `TikTokBusinessProfile` - Business profile information
- `TikTokDailySnapshot` - Daily analytics snapshots

## Notes

- All scripts use the existing team ID: `e5afb14c-4f1d-4747-bf29-7cfcf0223737`
- Data is inserted in batches to avoid overwhelming the database
- Scripts include error handling and progress logging
- Mock data includes realistic variations and patterns
- Seasonal effects simulate real-world social media behavior

## Troubleshooting

If you encounter issues:

1. **Database Connection**: Ensure Supabase is properly configured
2. **Team ID**: Verify the team ID exists in your database
3. **Permissions**: Ensure the service account has write permissions
4. **Rate Limits**: Scripts include delays to avoid overwhelming the database

## Development

To modify the mock data generation:

1. Edit the respective script file
2. Adjust the `generateMockSnapshots` function
3. Modify growth patterns, engagement rates, or seasonal effects
4. Test with a small dataset first
5. Run the full script when satisfied

## Analytics Dashboard

After running the mock data scripts, you can view the analytics in the dashboard:

- **Instagram**: `/dashboard/teams/[slug]/instagram`
- **TikTok**: `/dashboard/teams/[slug]/tiktok`

The mock data will populate all analytics views including:
- Overview metrics
- Growth charts
- Engagement analysis
- Historical data
