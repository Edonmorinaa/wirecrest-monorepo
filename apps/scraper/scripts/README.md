# Mock Data Scripts

This directory contains scripts for generating and inserting mock data for testing and development purposes.

## Available Scripts

### 1. 6-Month Mock Data Script (Recommended)

**File:** `insert-6-months-mock-data.ts`

This is the main script that generates 6 months (180 days) worth of realistic mock data for both Instagram and TikTok platforms.

**Features:**
- Creates mock business profiles for both platforms
- Generates 180 days of daily snapshots
- Includes realistic growth patterns with seasonal variations
- Simulates viral growth periods and occasional negative growth
- Includes weekend/weekday variations in engagement
- Handles error simulation (3% for Instagram, 2% for TikTok)
- Updates business profiles with final metrics

**Usage:**
```bash
# Run the main script
npx ts-node scripts/insert-6-months-mock-data.ts

# Or use the runner script
npx ts-node scripts/run-6-months-mock-data.ts
```

### 2. Individual Platform Scripts

**Instagram:** `insert-mock-instagram-data.ts`
- Generates 30 days of Instagram snapshots
- Uses existing business profile if available
- Updates profile with current metrics

**TikTok:** `insert-mock-tiktok-data.ts`
- Generates 30 days of TikTok snapshots
- Creates mock business profile
- Updates profile with current metrics

**Usage:**
```bash
# Instagram only
npx ts-node scripts/insert-mock-instagram-data.ts

# TikTok only
npx ts-node scripts/insert-mock-tiktok-data.ts
```

## Data Characteristics

### Instagram Mock Data
- **Starting Followers:** 2,500
- **Growth Pattern:** 5-35 followers per day (seasonal variations)
- **Content:** 30% chance of new posts daily
- **Engagement:** Realistic likes, comments, views with weekend boosts
- **Stories:** 1-4 stories per day
- **Reels:** 15% chance of new reel daily

### TikTok Mock Data
- **Starting Followers:** 18,000
- **Growth Pattern:** 20-200 followers per day (more volatile)
- **Viral Potential:** 5% chance of viral growth (200-700 extra followers)
- **Content:** 25% chance of new videos daily
- **Engagement:** High view counts, realistic comment ratios
- **Hearts:** Accumulating heart count from videos

## Seasonal Patterns

Both scripts include realistic seasonal variations:
- **Holiday Season (Dec/Jan):** Higher engagement and growth
- **Summer (Jun-Sep):** Moderate growth boost
- **Regular Periods:** Standard growth patterns

## Error Simulation

- **Instagram:** 3% chance of API errors
- **TikTok:** 2% chance of API errors
- Error messages simulate rate limiting issues

## Database Requirements

Make sure your Supabase database has the following tables:
- `InstagramBusinessProfile`
- `InstagramDailySnapshot`
- `TikTokBusinessProfile`
- `TikTokDailySnapshot`

## Environment Variables

Ensure these environment variables are set:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

## Output

The scripts will provide detailed console output including:
- Progress updates for each batch of snapshots
- Final statistics for both platforms
- Current metrics summary
- Success/failure status

## Example Output

```
🎭 Starting 6-month mock data insertion for Instagram and TikTok...
✅ Instagram business profile created
✅ TikTok business profile created
📊 Generating 180 days of snapshots for both platforms...
📸 Generated 180 Instagram snapshots
🎵 Generated 180 TikTok snapshots

📸 Inserting Instagram snapshots...
✅ Inserted batch 1: 20 snapshots
✅ Inserted batch 2: 20 snapshots
...

🎵 Inserting TikTok snapshots...
✅ Inserted batch 1: 20 snapshots
✅ Inserted batch 2: 20 snapshots
...

📈 Updating business profiles...
✅ Updated InstagramBusinessProfile with current metrics
✅ Updated TikTokBusinessProfile with current metrics

🎉 Successfully inserted 6 months of mock data!

📊 Final Statistics:

📸 Instagram:
   - Total Snapshots: 180
   - Followers: 8,247
   - Following: 1,156
   - Posts: 142
   - Daily Likes: 67
   - Daily Comments: 12
   - Daily Views: 234

🎵 TikTok:
   - Total Snapshots: 180
   - Followers: 45,892
   - Following: 623
   - Videos: 195
   - Hearts: 680,000
   - Total Likes: 510,000
   - Total Comments: 688
   - Total Views: 14,625,000

🌐 You can now view the analytics zones on both Instagram and TikTok dashboards!
📅 Data covers the last 6 months with realistic growth patterns and seasonal variations.
```

## Notes

- The scripts use a mock team ID by default. You can modify the `teamId` in the script to use a real team ID.
- Data is inserted in batches to avoid overwhelming the database.
- The scripts include small delays between batches for better performance.
- All timestamps are in ISO format and use the current timezone. 