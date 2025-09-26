// Engagement tracker for Twitter Alerts Dashboard
const fs = require('fs');
const path = require('path');

const ENGAGEMENT_FILE = 'engagement-history.json';

// Initialize engagement tracker
function initializeEngagementTracker() {
  try {
    if (!fs.existsSync(ENGAGEMENT_FILE)) {
      const initialData = {
        engagements: [],
        statistics: {
          totalEngagements: 0,
          likes: 0,
          retweets: 0,
          comments: 0,
          lastEngagement: null
        }
      };
      fs.writeFileSync(ENGAGEMENT_FILE, JSON.stringify(initialData, null, 2));
      console.log('Engagement tracker initialized with new file');
    } else {
      console.log('Engagement tracker initialized with existing file');
    }
    return true;
  } catch (error) {
    console.error('Error initializing engagement tracker:', error);
    return false;
  }
}

// Log engagement action
function logEngagement(tweetUrl, actionType, profileId, details = {}, success = true) {
  try {
    const timestamp = new Date().toISOString();
    const engagement = {
      id: generateId(),
      tweetUrl,
      actionType,
      profileId,
      details,
      timestamp,
      success: success
    };

    // Load existing data
    let data = { engagements: [], statistics: { totalEngagements: 0, likes: 0, retweets: 0, comments: 0, lastEngagement: null } };
    if (fs.existsSync(ENGAGEMENT_FILE)) {
      data = JSON.parse(fs.readFileSync(ENGAGEMENT_FILE, 'utf8'));
    }

    // Add new engagement
    data.engagements.unshift(engagement); // Add to beginning

    // Update statistics only for successful engagements
    if (success) {
      data.statistics.totalEngagements++;
      data.statistics.lastEngagement = timestamp;
      
      switch (actionType) {
        case 'like':
          data.statistics.likes++;
          break;
        case 'retweet':
          data.statistics.retweets++;
          break;
        case 'comment':
          data.statistics.comments++;
          break;
      }
    }

    // Keep only last 1000 engagements to prevent file from growing too large
    if (data.engagements.length > 1000) {
      data.engagements = data.engagements.slice(0, 1000);
    }

    // Save updated data
    fs.writeFileSync(ENGAGEMENT_FILE, JSON.stringify(data, null, 2));

    console.log(`[ENGAGEMENT] ${actionType} on ${tweetUrl} - Profile: ${profileId} - Success: ${success}`);
    return engagement;
  } catch (error) {
    console.error('Error logging engagement:', error);
    return null;
  }
}

// Get all engagements
function getAllEngagements() {
  try {
    if (!fs.existsSync(ENGAGEMENT_FILE)) {
      return { engagements: [], statistics: { totalEngagements: 0, likes: 0, retweets: 0, comments: 0, lastEngagement: null } };
    }
    return JSON.parse(fs.readFileSync(ENGAGEMENT_FILE, 'utf8'));
  } catch (error) {
    console.error('Error reading engagements:', error);
    return { engagements: [], statistics: { totalEngagements: 0, likes: 0, retweets: 0, comments: 0, lastEngagement: null } };
  }
}

// Get engagements for a specific tweet
function getEngagementsForTweet(tweetUrl) {
  try {
    const data = getAllEngagements();
    return data.engagements.filter(engagement => engagement.tweetUrl === tweetUrl);
  } catch (error) {
    console.error('Error getting engagements for tweet:', error);
    return [];
  }
}

// Get recent engagements (last N)
function getRecentEngagements(limit = 50) {
  try {
    const data = getAllEngagements();
    return data.engagements.slice(0, limit);
  } catch (error) {
    console.error('Error getting recent engagements:', error);
    return [];
  }
}

// Get engagement statistics
function getEngagementStatistics() {
  try {
    const data = getAllEngagements();
    return data.statistics;
  } catch (error) {
    console.error('Error getting engagement statistics:', error);
    return { totalEngagements: 0, likes: 0, retweets: 0, comments: 0, lastEngagement: null };
  }
}

// Clear all engagements
function clearEngagements() {
  try {
    const initialData = {
      engagements: [],
      statistics: {
        totalEngagements: 0,
        likes: 0,
        retweets: 0,
        comments: 0,
        lastEngagement: null
      }
    };
    fs.writeFileSync(ENGAGEMENT_FILE, JSON.stringify(initialData, null, 2));
    console.log('All engagements cleared');
    return true;
  } catch (error) {
    console.error('Error clearing engagements:', error);
    return false;
  }
}

// Generate unique ID
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

module.exports = {
  initializeEngagementTracker,
  logEngagement,
  getAllEngagements,
  getEngagementsForTweet,
  getRecentEngagements,
  getEngagementStatistics,
  clearEngagements
};
