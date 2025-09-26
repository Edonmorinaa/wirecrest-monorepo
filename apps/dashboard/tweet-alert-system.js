const fs = require('fs');
// Use built-in fetch (available in Node.js 18+ and Next.js)
const fetch = globalThis.fetch || (() => {
  throw new Error('Fetch is not available. Please use Node.js 18+ or ensure fetch is polyfilled.');
});
const CronJob = require('cron').CronJob;

// Import automation functions for executing actions
const { 
  loadProfiles, 
  automateTwitterWithAI, 
  log, 
  isProfileAvailable,
  markProfileExecuting,
  markProfileExecutionComplete
} = require('./automation-flow.js');

// Import engagement tracker
const engagementTracker = require('./engagement-tracker.js');

// Load Apify configuration
let APIFY_CONFIG = null;
try {
  APIFY_CONFIG = JSON.parse(fs.readFileSync('apify-config.json', 'utf8'));
} catch (error) {
  console.error('❌ Failed to load apify-config.json. Please create this file with your configuration.');
  APIFY_CONFIG = {
    apify: {
      apiToken: process.env.APIFY_API_TOKEN,
      baseUrl: 'https://api.apify.com/v2',
      actorId: 'jupri~twitter-scraper'
    },
    twitter: {
      authToken: 'f4a719b44e8a388303ebb15f5898ac58e4321036'
    },
    scraper: {
      searchMode: "live",
      maxTweets: 50,
      maxRequestRetries: 3,
      addUserInfo: true,
      maxConcurrency: 1,
      filters: {
        replies: false
      }
    }
  };
}

// Configuration for tweet alerts with Apify integration
const TWEET_ALERT_CONFIG = {
  APIFY_API_TOKEN: process.env.APIFY_API_TOKEN,
  APIFY_BASE_URL: APIFY_CONFIG.apify.baseUrl,
  APIFY_ACTOR_ID: APIFY_CONFIG.apify.actorId,
  TWITTER_AUTH_TOKEN: APIFY_CONFIG.twitter.authToken,
  ALERTS_FILE: 'tweet-alerts.json',
  LOG_FILE: 'tweet-alert-log.txt'
};

// Store tweet data for dashboard display
const tweetDataStore = new Map();

// Cooldown tracking for manual scans
let lastManualScan = null;
const MANUAL_SCAN_COOLDOWN = 30 * 60 * 1000; // 30 minutes in milliseconds

// Automatic scan job
let autoScanJob = null;

// Initialize alerts file
function initializeAlerts() {
  if (!fs.existsSync(TWEET_ALERT_CONFIG.ALERTS_FILE)) {
    const initialData = {
      created: new Date().toISOString(),
      keywords: [],
      alerts: [],
      lastScan: null,
      statistics: {
        totalScans: 0,
        totalAlerts: 0,
        lastAlert: null
      }
    };
    fs.writeFileSync(TWEET_ALERT_CONFIG.ALERTS_FILE, JSON.stringify(initialData, null, 2));
    console.log('📊 Tweet alert system initialized with Apify integration.');
  }
  
  // Check Twitter auth token configuration
  if (!TWEET_ALERT_CONFIG.TWITTER_AUTH_TOKEN || TWEET_ALERT_CONFIG.TWITTER_AUTH_TOKEN === 'YOUR_TWITTER_AUTH_TOKEN_HERE') {
    console.log('⚠️  WARNING: Twitter auth token not configured!');
    console.log('📖 Please follow the instructions in TWITTER_AUTH_SETUP.md to get your auth token.');
    console.log('🔧 Update apify-config.json with your Twitter auth token before scanning.');
  } else {
    console.log('✅ Twitter auth token configured');
  }
  
  // Initialize engagement tracker
  engagementTracker.initializeEngagementTracker();
  
  // Clean up any existing replies that might have been stored before filtering was enabled
  const removedReplies = cleanUpExistingReplies();
  if (removedReplies > 0) {
    console.log(`🧹 Initial cleanup: Removed ${removedReplies} existing replies from stored alerts`);
  }
  
  // Don't start automatic scanning automatically - let user start it manually
  console.log('🔄 Automatic scanning ready but not started. Use "Start Monitoring" to begin.');
}

// Load alerts data
function loadAlerts() {
  try {
    return JSON.parse(fs.readFileSync(TWEET_ALERT_CONFIG.ALERTS_FILE, 'utf8'));
  } catch (error) {
    console.error('Error loading alerts:', error.message);
    return { keywords: [], alerts: [], statistics: { totalScans: 0, totalAlerts: 0 } };
  }
}

// Save alerts data
function saveAlerts(data) {
  try {
    console.log(`💾 Saving alerts to ${TWEET_ALERT_CONFIG.ALERTS_FILE}`);
    console.log(`📊 Total alerts to save: ${data.alerts.length}`);
    fs.writeFileSync(TWEET_ALERT_CONFIG.ALERTS_FILE, JSON.stringify(data, null, 2));
    console.log(`✅ Alerts saved successfully`);
  } catch (error) {
    console.error('Error saving alerts:', error.message);
  }
}

// Add keyword to monitor
function addKeyword(keyword) {
  const data = loadAlerts();
  
  // Check if keyword already exists (handle both string and object formats)
  const keywordExists = data.keywords.some(k => {
    if (typeof k === 'string') {
      return k.toLowerCase() === keyword.toLowerCase();
    } else if (k && typeof k === 'object' && k.keyword) {
      return k.keyword.toLowerCase() === keyword.toLowerCase();
    }
    return false;
  });
  
  if (!keywordExists) {
    // Add keyword as object format to match API expectations
    const newKeyword = {
      keyword: keyword.toLowerCase(),
      enabled: true,
      priority: 'medium',
      maxTweets: 5,
      createdAt: new Date().toISOString(),
      lastFound: '',
      totalFound: 0
    };
    data.keywords.push(newKeyword);
    saveAlerts(data);
    console.log(`✅ Added keyword: "${keyword}"`);
    return true;
  }
  console.log(`⚠️ Keyword "${keyword}" already exists`);
  return false;
}

// Remove keyword from monitoring
function removeKeyword(keyword) {
  const data = loadAlerts();
  
  // Find keyword index (handle both string and object formats)
  const index = data.keywords.findIndex(k => {
    if (typeof k === 'string') {
      return k.toLowerCase() === keyword.toLowerCase();
    } else if (k && typeof k === 'object' && k.keyword) {
      return k.keyword.toLowerCase() === keyword.toLowerCase();
    }
    return false;
  });
  
  if (index > -1) {
    data.keywords.splice(index, 1);
    saveAlerts(data);
    console.log(`✅ Removed keyword: "${keyword}"`);
    return true;
  }
  console.log(`⚠️ Keyword "${keyword}" not found`);
  return false;
}

// List all monitored keywords
function listKeywords() {
  const data = loadAlerts();
  console.log('🔍 Monitored Keywords:');
  if (data.keywords.length === 0) {
    console.log('No keywords being monitored.');
  } else {
    data.keywords.forEach((keyword, index) => {
      console.log(`${index + 1}. ${keyword}`);
    });
  }
}

// Format tweet data from Apify for Telegram message
function formatTweetMessage(tweet) {
  const timestamp = new Date().toLocaleString('en-US', { 
    timeZone: 'Europe/Berlin',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });

  let message = `🔍 *New Tweet Alert*\n\n`;
  message += `📝 *Tweet:* ${tweet.text || tweet.full_text || tweet.tweet_text}\n\n`;
  message += `👤 *User:* ${tweet.username || tweet.user?.username}\n`;
  message += `📅 *Time:* ${timestamp}\n`;
  message += `🔗 *Link:* ${tweet.url}\n`;
  
  if (tweet.verified || tweet.user?.verified) {
    message += `✅ *Verified Account*\n`;
  }
  
  if (tweet.images && tweet.images.length > 0) {
    message += `🖼️ *Images:* ${tweet.images.length}\n`;
  }
  
  if (tweet.links && tweet.links.length > 0) {
    message += `📋 *Contains Links*\n`;
  }

  return message;
}

// Create inline keyboard for tweet actions
function createTweetActionsKeyboard(tweetId) {
  return {
    inline_keyboard: [
      [
        {
          text: "💬 Comment",
          callback_data: `comment_${tweetId}`
        },
        {
          text: "👍 Like",
          callback_data: `like_${tweetId}`
        },
        {
          text: "🔄 Retweet",
          callback_data: `retweet_${tweetId}`
        }
      ]
    ]
  };
}

// Create comment options keyboard
function createCommentOptionsKeyboard(tweetId) {
  return {
    inline_keyboard: [
      [
        {
          text: "✍️ Custom Comment",
          callback_data: `custom_comment_${tweetId}`
        },
        {
          text: "🤖 AI Comment",
          callback_data: `ai_comment_${tweetId}`
        }
      ],
      [
        {
          text: "⬅️ Back",
          callback_data: `back_${tweetId}`
        }
      ]
    ]
  };
}

// Execute action on tweet using existing automation flow (still needs profiles for actions)
async function executeTweetAction(tweetUrl, actionType, chatId, customComment = null, profileId = null, tweetData = null) {
  try {
    // If tweetData is not provided, try to get it from alerts
    if (!tweetData) {
      const alerts = loadAlerts();
      tweetData = alerts.alerts.find(alert => alert.url === tweetUrl);
      
      if (!tweetData) {
        throw new Error('Tweet data not found in alerts');
      }
    }

    // Load profiles (still needed for actions)
    const profiles = JSON.parse(fs.readFileSync('profiles.json', 'utf8'));
    const availableProfiles = profiles.filter(p => p.active);
    
    if (availableProfiles.length === 0) {
      throw new Error('No active profiles available for actions');
    }

    // Use provided profile ID or select a random profile
    let selectedProfile;
    if (profileId) {
      selectedProfile = availableProfiles.find(p => p.id === profileId);
      if (!selectedProfile) {
        throw new Error(`Profile ${profileId} not found or not active`);
      }
    } else {
      // Select a random profile
      const randomIndex = Math.floor(Math.random() * availableProfiles.length);
      selectedProfile = availableProfiles[randomIndex];
    }

    console.log(`🎯 Executing ${actionType} on tweet ${tweetUrl} with profile ${selectedProfile.adspower_id}`);

    // Determine actions based on action type
    let actions = [];
    let actionDisplayName = '';

    switch (actionType) {
      case 'like':
        actions = ['like'];
        actionDisplayName = 'Like';
        break;
      case 'retweet':
        actions = ['retweet'];
        actionDisplayName = 'Retweet';
        break;
      case 'comment':
        actions = ['comment'];
        actionDisplayName = 'Comment';
        break;
      case 'ai_comment':
        actions = ['comment'];
        actionDisplayName = 'AI Comment';
        break;
      default:
        throw new Error(`Unknown action type: ${actionType}`);
    }

    // Execute each action
    const results = [];
    let commentUrl = null;

    for (const action of actions) {
      try {
        log(`Executing ${action} action for tweet alert`, selectedProfile.id);

        // Create options for the automation
        const options = {
          tweetUrl: tweetUrl,
          telegramChatId: chatId,
          bypassTelegram: true,
          targetSpecificTweet: true,
          specificTweetUrl: tweetUrl,
          profileId: selectedProfile.adspower_id, // Add profile ID for engagement tracking
          startTime: Date.now(), // Add start time for execution time calculation
          tweetText: tweetData.tweetText || tweetData.text || 'unknown' // Add tweet text for engagement tracking
        };

        // Add comment for comment actions
        if (action === 'comment') {
          if (actionType === 'ai_comment') {
            // Use AI comment (no custom comment specified)
            // The automation flow will generate AI comment when no customComment is provided
          } else if (customComment) {
            // Use custom comment
            options.customComment = customComment;
          }
        }

        // Execute the automation with the started profile
        const result = await automateTwitterWithAI(selectedProfile, action, options);

        // Proper success detection based on action type
        let actionSuccess = false;
        if (action === 'comment') {
          // For comments, we need a commentUrl to confirm success
          if (result && result.commentUrl) {
            commentUrl = result.commentUrl;
            results.push(`✅ ${action.toUpperCase()} completed successfully`);
            actionSuccess = true;
          } else {
            // No commentUrl means the comment failed
            results.push(`❌ ${action.toUpperCase()} failed: No comment URL received`);
            throw new Error('Comment failed: No comment URL received');
          }
        } else if (action === 'like' || action === 'retweet') {
          // For likes and retweets, check for success flag or specific indicators
          if (result && (result.success || result.liked || result.retweeted)) {
            results.push(`✅ ${action.toUpperCase()} completed successfully`);
            actionSuccess = true;
          } else {
            results.push(`❌ ${action.toUpperCase()} failed: Action not confirmed`);
            throw new Error(`${action} failed: Action not confirmed`);
          }
        } else {
          // Fallback for unknown actions
          if (result && result.success) {
            results.push(`✅ ${action.toUpperCase()} completed successfully`);
            actionSuccess = true;
          } else {
            results.push(`❌ ${action.toUpperCase()} failed: Unknown result`);
            throw new Error(`${action} failed: Unknown result`);
          }
        }

        // Log to engagement tracker for Actions History (direct logging from tweet alert system)
        if (actionSuccess && engagementTracker) {
          try {
            const details = {
              tweetText: tweetData.tweetText || tweetData.text || 'unknown',
              username: tweetData.username || 'unknown',
              keyword: tweetData.keyword || 'unknown',
              customComment: action === 'comment' ? (options.customComment || null) : null,
              isAI: action === 'comment' && actionType === 'ai_comment',
              commentUrl: commentUrl,
              error: null
            };
            
            log(`Logging engagement to Actions History from tweet alert system: ${action} on ${tweetUrl}`, selectedProfile.id);
            engagementTracker.logEngagement(tweetUrl, action, selectedProfile.adspower_id, details, true);
            log(`Successfully logged engagement to Actions History from tweet alert system`, selectedProfile.id);
          } catch (error) {
            log(`Failed to log engagement to Actions History from tweet alert system: ${error.message}`, selectedProfile.id);
          }
        }

      } catch (error) {
        log(`Failed to execute ${action}: ${error.message}`, selectedProfile.id);
        results.push(`❌ ${action.toUpperCase()} failed: ${error.message}`);
      }
    }

    // Check if any action failed
    const hasFailures = results.some(result => result.includes('❌'));
    
    // Generate response
    const resultText = results.join('\n');
    const escapedComment = customComment ? customComment.replace(/[_*[\]()~`>#+=|{}.!-]/g, '\\$&') : '';

    let responseMessage = `🎯 *Action ${hasFailures ? 'Failed' : 'Completed'}*

*Profile:* ${selectedProfile.adspower_id}
*Action:* ${actionDisplayName}
*Tweet:* ${tweetUrl}${customComment ? `\n*Comment:* "${escapedComment}"` : ''}

*Results:*
${resultText}

${hasFailures ? '❌ Action failed. Please check the results above.' : '✅ Action has been executed successfully!'}`;

    if (commentUrl) {
      const cleanCommentUrl = commentUrl.replace(/\\/g, '');
      responseMessage += `\n\n🔗 *Comment Link:*\n[View Your Comment](${cleanCommentUrl})`;
    }

    // Return both the message and the comment URL for API consumption
    return {
      message: responseMessage,
      commentUrl: commentUrl,
      success: !hasFailures, // Only true if no failures
      actionType: actionType,
      profileId: selectedProfile.adspower_id,
      hasFailures: hasFailures
    };

  } catch (error) {
    log(`Tweet action execution failed: ${error.message}`, 'TWEET_ALERT');
    throw new Error(`Failed to execute action: ${error.message}`);
  }
}

// Execute action on tweet from Twitter Profiles (doesn't require tweet to be in alerts)
async function executeProfileTweetAction(tweetUrl, actionType, chatId, customComment = null, profileId = null, tweetText = null) {
  try {
    // Load profiles (needed for actions)
    const profiles = JSON.parse(fs.readFileSync('profiles.json', 'utf8'));
    const availableProfiles = profiles.filter(p => p.active);
    
    if (availableProfiles.length === 0) {
      throw new Error('No active profiles available for actions');
    }

    // Use provided profile ID or select a random profile
    let selectedProfile;
    if (profileId) {
      selectedProfile = availableProfiles.find(p => p.id === profileId);
      if (!selectedProfile) {
        throw new Error(`Profile ${profileId} not found or not active`);
      }
    } else {
      // Select a random profile
      const randomIndex = Math.floor(Math.random() * availableProfiles.length);
      selectedProfile = availableProfiles[randomIndex];
    }

    console.log(`🎯 Executing ${actionType} on profile tweet ${tweetUrl} with profile ${selectedProfile.adspower_id}`);

    // Determine actions based on action type
    let actions = [];
    let actionDisplayName = '';

    switch (actionType) {
      case 'like':
        actions = ['like'];
        actionDisplayName = 'Like';
        break;
      case 'retweet':
        actions = ['retweet'];
        actionDisplayName = 'Retweet';
        break;
      case 'comment':
        actions = ['comment'];
        actionDisplayName = 'Comment';
        break;
      case 'ai_comment':
        actions = ['comment'];
        actionDisplayName = 'AI Comment';
        break;
      default:
        throw new Error(`Unknown action type: ${actionType}`);
    }

    // Execute each action
    const results = [];
    let commentUrl = null;

    for (const action of actions) {
      try {
        log(`Executing ${action} action for profile tweet`, selectedProfile.id);

        // Create options for the automation
        const options = {
          tweetUrl: tweetUrl,
          telegramChatId: chatId,
          bypassTelegram: true,
          targetSpecificTweet: true,
          specificTweetUrl: tweetUrl,
          profileId: selectedProfile.adspower_id, // Add profile ID for engagement tracking
          startTime: Date.now(), // Add start time for execution time calculation
          tweetText: tweetText || 'unknown' // Add tweet text for engagement tracking
        };

        // Add comment for comment actions
        if (action === 'comment') {
          if (actionType === 'ai_comment') {
            // Use AI comment (no custom comment specified)
            // The automation flow will generate AI comment when no customComment is provided
          } else if (customComment) {
            // Use custom comment
            options.customComment = customComment;
          }
        }

        // Execute the automation with the started profile
        const result = await automateTwitterWithAI(selectedProfile, action, options);

        // Proper success detection based on action type
        let actionSuccess = false;
        if (action === 'comment') {
          // For comments, we need a commentUrl to confirm success
          if (result && result.commentUrl) {
            commentUrl = result.commentUrl;
            results.push(`✅ ${action.toUpperCase()} completed successfully`);
            actionSuccess = true;
          } else {
            results.push(`❌ ${action.toUpperCase()} failed - no comment URL returned`);
            actionSuccess = false;
          }
        } else {
          // For likes and retweets, check if the action was completed
          if (result && result.success !== false) {
            results.push(`✅ ${action.toUpperCase()} completed successfully`);
            actionSuccess = true;
          } else {
            results.push(`❌ ${action.toUpperCase()} failed`);
            actionSuccess = false;
          }
        }

        // Log engagement for successful actions
        if (actionSuccess) {
          try {
            const engagementTracker = require('./engagement-tracker.js');
            engagementTracker.logEngagement({
              action: action,
              tweetUrl: tweetUrl,
              tweetText: tweetText || 'unknown',
              profileId: selectedProfile.adspower_id,
              profileName: selectedProfile.name,
              executionTime: Date.now(),
              success: true,
              commentUrl: commentUrl,
              isAIComment: actionType === 'ai_comment'
            });
            console.log(`📊 Engagement logged for ${action} action`);
          } catch (error) {
            console.error(`❌ Failed to log engagement: ${error.message}`);
          }
        }

      } catch (error) {
        console.error(`❌ Error executing ${action}: ${error.message}`);
        results.push(`❌ ${action.toUpperCase()} failed: ${error.message}`);
      }
    }

    // Check if any actions failed
    const hasFailures = results.some(result => result.startsWith('❌'));

    // Create response message
    let responseMessage = `🎯 *${actionDisplayName} Action Results*\n\n`;
    responseMessage += results.join('\n');
    responseMessage += `\n\n${hasFailures ? '❌ Action failed. Please check the results above.' : '✅ Action has been executed successfully!'}`;

    if (commentUrl) {
      const cleanCommentUrl = commentUrl.replace(/\\/g, '');
      responseMessage += `\n\n🔗 *Comment Link:*\n[View Your Comment](${cleanCommentUrl})`;
    }

    // Return both the message and the comment URL for API consumption
    return {
      message: responseMessage,
      commentUrl: commentUrl,
      success: !hasFailures, // Only true if no failures
      actionType: actionType,
      profileId: selectedProfile.adspower_id,
      hasFailures: hasFailures
    };

  } catch (error) {
    log(`Profile tweet action execution failed: ${error.message}`, 'TWEET_ALERT');
    throw new Error(`Failed to execute action: ${error.message}`);
  }
}

// Apify API functions
async function startApifyRun(keywords) {
  try {
    console.log('🚀 Starting Apify Twitter scraper run...');
    
    // Configure Apify run with proper reply filtering
    const runInput = {
      query: keywords.join(' OR '), // Use 'query' as a string with OR separator
      limit: APIFY_CONFIG.scraper.maxTweets, // Use 'limit' instead of 'maxTweets'
      content: 'text', // Specify content format
      // Add authentication token for Twitter access
      token: TWEET_ALERT_CONFIG.TWITTER_AUTH_TOKEN,
      // Use only the filters structure that the actor supports
      filters: APIFY_CONFIG.scraper.filters
    };

    console.log(`📤 Sending request to Apify with input:`, JSON.stringify(runInput, null, 2));
    console.log(`🔍 Filters configuration:`, JSON.stringify(APIFY_CONFIG.scraper.filters, null, 2));

    // Use asynchronous run endpoint
    const response = await fetch(`${TWEET_ALERT_CONFIG.APIFY_BASE_URL}/acts/${TWEET_ALERT_CONFIG.APIFY_ACTOR_ID}/runs?token=${TWEET_ALERT_CONFIG.APIFY_API_TOKEN}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(runInput)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Apify API error response: ${errorText}`);
      throw new Error(`Apify API error: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    console.log(`✅ Apify run started with ID: ${result.data.id}`);
    console.log(`📊 Run data:`, JSON.stringify(result.data, null, 2));
    return result.data;
  } catch (error) {
    console.error(`❌ Failed to start Apify run: ${error.message}`);
    throw error;
  }
}

// Enhanced reply detection function
function isTweetReply(tweet) {
  const tweetText = tweet.text || tweet.full_text || tweet.tweet_text || '';
  const trimmedText = tweetText.trim();
  
  // Check for explicit reply metadata
  const hasReplyMetadata = (tweet.in_reply_to_status_id && tweet.in_reply_to_status_id !== null) ||
                          (tweet.in_reply_to_user_id && tweet.in_reply_to_user_id !== null) ||
                          (tweet.reply_to && tweet.reply_to !== null) ||
                          (tweet.is_reply === true) ||
                          (tweet.reply_to_status_id && tweet.reply_to_status_id !== null) ||
                          (tweet.reply_to_user_id && tweet.reply_to_user_id !== null) ||
                          (tweet.reply_to_screen_name && tweet.reply_to_screen_name !== null) ||
                          (tweet.in_reply_to_screen_name && tweet.in_reply_to_screen_name !== null);
  
  // Check for text-based reply indicators
  const startsWithMention = trimmedText.startsWith('@') || trimmedText.match(/^@\w+/);
  
  // Check for quote tweets
  const isQuoteTweet = (tweet.quoted_status_id && tweet.quoted_status_id !== null) ||
                      (tweet.quoted_status && tweet.quoted_status !== null);
  
  // Heuristic: Check for common reply patterns
  const hasReplyPatterns = trimmedText.includes('RT @') || // Retweet pattern
                          trimmedText.match(/^Replying to @/) || // Reply indicator
                          trimmedText.match(/^In reply to @/) || // Alternative reply indicator
                          (tweet.retweeted_status && tweet.retweeted_status !== null); // Retweet status
  
  // Check URL structure for reply indicators
  const url = tweet.url || tweet.tweet_url || '';
  const isReplyUrl = url.includes('/status/') && url.includes('/reply/') || // Reply URL pattern
                    url.includes('/status/') && url.includes('/conversation/'); // Conversation URL pattern
  
  const isReply = hasReplyMetadata || startsWithMention || isQuoteTweet || hasReplyPatterns || isReplyUrl;
  
  if (isReply) {
    console.log(`🚫 Reply detected: ${trimmedText.substring(0, 50)}...`);
    console.log(`🚫 Reply indicators: metadata=${hasReplyMetadata}, mention=${startsWithMention}, quote=${isQuoteTweet}, patterns=${hasReplyPatterns}, url=${isReplyUrl}`);
  }
  
  return isReply;
}

function filterOutReplies(tweets) {
  if (!APIFY_CONFIG.scraper.filters || APIFY_CONFIG.scraper.filters.replies !== false) {
    // If reply filtering is not enabled, return all tweets
    return tweets;
  }
  
  const originalCount = tweets.length;
  const filteredTweets = tweets.filter(tweet => !isTweetReply(tweet));
  
  const filteredCount = filteredTweets.length;
  console.log(`🔍 Reply filtering: ${originalCount} tweets → ${filteredCount} tweets (filtered out ${originalCount - filteredCount} replies)`);
  
  return filteredTweets;
}

async function waitForApifyRun(runId) {
  try {
    console.log(`⏳ Waiting for Apify run ${runId} to complete...`);
    
    let attempts = 0;
    const maxAttempts = 60; // 5 minutes max wait
    
    while (attempts < maxAttempts) {
      const response = await fetch(`${TWEET_ALERT_CONFIG.APIFY_BASE_URL}/acts/${TWEET_ALERT_CONFIG.APIFY_ACTOR_ID}/runs/${runId}?token=${TWEET_ALERT_CONFIG.APIFY_API_TOKEN}`);
      
      if (!response.ok) {
        throw new Error(`Apify API error: ${response.status} ${response.statusText}`);
      }
      
      const runData = await response.json();
      
      if (runData.data.status === 'SUCCEEDED') {
        console.log(`✅ Apify run ${runId} completed successfully`);
        return runData.data;
      } else if (runData.data.status === 'FAILED') {
        throw new Error(`Apify run ${runId} failed: ${runData.data.meta?.errorInfo?.message || 'Unknown error'}`);
      } else if (runData.data.status === 'ABORTED') {
        throw new Error(`Apify run ${runId} was aborted`);
      }
      
      // Wait 5 seconds before checking again
      await new Promise(resolve => setTimeout(resolve, 5000));
      attempts++;
    }
    
    throw new Error(`Apify run ${runId} timed out after 5 minutes`);
  } catch (error) {
    console.error(`❌ Error waiting for Apify run: ${error.message}`);
    throw error;
  }
}

async function getApifyResults(runId, datasetId = null) {
  try {
    console.log(`📥 Fetching results from Apify run ${runId}...`);
    
    // If we have a dataset ID, use it directly
    if (datasetId) {
      console.log(`🔍 Using dataset ID: ${datasetId}`);
      const response = await fetch(`${TWEET_ALERT_CONFIG.APIFY_BASE_URL}/datasets/${datasetId}/items?token=${TWEET_ALERT_CONFIG.APIFY_API_TOKEN}&format=json`);
      
      if (response.ok) {
        const results = await response.json();
        console.log(`✅ Retrieved ${results.length} tweets from Apify using dataset ID`);
        
        // Apply reply filtering if configured
        const filteredResults = filterOutReplies(results);
        
        return filteredResults;
      } else {
        const errorText = await response.text();
        console.log(`❌ Dataset endpoint failed: ${errorText.substring(0, 200)}`);
      }
    }
    
    // Fallback: Try different dataset endpoints
    const endpoints = [
      `${TWEET_ALERT_CONFIG.APIFY_BASE_URL}/acts/${TWEET_ALERT_CONFIG.APIFY_ACTOR_ID}/runs/${runId}/dataset/items?token=${TWEET_ALERT_CONFIG.APIFY_API_TOKEN}&format=json`,
      `${TWEET_ALERT_CONFIG.APIFY_BASE_URL}/acts/${TWEET_ALERT_CONFIG.APIFY_ACTOR_ID}/runs/${runId}/dataset/items?token=${TWEET_ALERT_CONFIG.APIFY_API_TOKEN}`,
      `${TWEET_ALERT_CONFIG.APIFY_BASE_URL}/acts/${TWEET_ALERT_CONFIG.APIFY_ACTOR_ID}/runs/${runId}/dataset/items?token=${TWEET_ALERT_CONFIG.APIFY_API_TOKEN}&format=csv`,
      // Try alternative endpoint structure
      `${TWEET_ALERT_CONFIG.APIFY_BASE_URL}/datasets/${runId}/items?token=${TWEET_ALERT_CONFIG.APIFY_API_TOKEN}&format=json`,
      // Try with dataset ID from run data
      `${TWEET_ALERT_CONFIG.APIFY_BASE_URL}/datasets/${runId}/items?token=${TWEET_ALERT_CONFIG.APIFY_API_TOKEN}`
    ];
    
    for (const endpoint of endpoints) {
      try {
        console.log(`🔍 Trying endpoint: ${endpoint.split('?')[0]}`);
        const response = await fetch(endpoint);
        
        console.log(`📊 Response status: ${response.status} ${response.statusText}`);
        
        if (response.ok) {
          const results = await response.json();
          console.log(`✅ Retrieved ${results.length} tweets from Apify`);
          return results;
        } else {
          const errorText = await response.text();
          console.log(`❌ Endpoint failed with status ${response.status}: ${errorText.substring(0, 200)}`);
        }
      } catch (error) {
        console.log(`⚠️ Endpoint failed: ${error.message}`);
        continue;
      }
    }
    
    throw new Error('All dataset endpoints failed');
  } catch (error) {
    console.error(`❌ Failed to get Apify results: ${error.message}`);
    throw error;
  }
}

// Process Apify results and extract relevant tweets
function processApifyResults(tweets, keywords) {
  const processedTweets = [];
  
  console.log(`🔍 Processing ${tweets.length} tweets from Apify...`);
  
  // Ensure keywords are strings
  const keywordStrings = keywords.map(k => {
    if (typeof k === 'string') {
      return k;
    } else if (k && typeof k === 'object' && k.keyword) {
      return k.keyword;
    } else {
      console.warn(`⚠️ Invalid keyword format:`, k);
      return null;
    }
  }).filter(k => k !== null);
  
  for (const tweet of tweets) {
    // Extract tweet text (handle different field names from Apify)
    const tweetText = tweet.Content || tweet.text || tweet.full_text || tweet.tweet_text || tweet.content || '';
    
    // Check if tweet contains any of our keywords
    const containsKeyword = keywordStrings.some(keyword => 
      tweetText.toLowerCase().includes(keyword.toLowerCase())
    );
    
    // Construct URL from tweet ID if not present
    let tweetUrl = tweet.url;
    if (!tweetUrl && tweet.id) {
      tweetUrl = `https://x.com/i/status/${tweet.id}`;
    }
    
    if (containsKeyword && tweetUrl) {
      console.log(`🚨 Found matching tweet: ${tweetUrl}`);
      
      processedTweets.push({
        text: tweetText,
        username: tweet.user?.screen || tweet.User?.username || tweet.username || 'unknown',
        authorName: tweet.user?.name || tweet.User?.name || 'Unknown',
        url: tweetUrl,
        verified: tweet.user?.flags?.verified || tweet.User?.verified || tweet.verified || false,
        imageCount: tweet.Media ? 1 : 0,
        hasCard: !!(tweet.Card || (tweet.links && tweet.links.length > 0)),
        tweetCreatedAt: tweet.Created_at || tweet.created_at || tweet.timestamp || new Date().toISOString(),
        timestamp: new Date().toISOString(), // When we found it
        keyword: keywordStrings.find(keyword => 
          tweetText.toLowerCase().includes(keyword.toLowerCase())
        ) || 'unknown'
      });
    }
  }
  
  console.log(`📊 Processed ${processedTweets.length} matching tweets`);
  return processedTweets;
}

// Scan for keywords using Apify
async function scanForKeywords(keywords, isManualScan = false) {
  try {
    console.log(`🔍 Starting keyword scan with Apify for: ${keywords.join(', ')}`);
    
    // Track manual scan for cooldown
    if (isManualScan) {
      lastManualScan = Date.now();
      console.log('⏰ Manual scan timestamp recorded');
    }
    
    // Start Apify run
    const runData = await startApifyRun(keywords);
    
    // Wait for run to complete
    await waitForApifyRun(runData.id);
    
    // Get results using the dataset ID from the run
    const apifyResults = await getApifyResults(runData.id, runData.defaultDatasetId);

    // Apply reply filtering if configured
    const filteredResults = filterOutReplies(apifyResults);
    console.log(`🔍 After reply filtering: ${filteredResults.length} tweets (from ${apifyResults.length} original)`);

    // Debug: Log the first tweet structure (only in development)
    if (filteredResults.length > 0 && process.env.NODE_ENV === 'development') {
      console.log('🔍 First tweet structure from Apify:');
      console.log(JSON.stringify(filteredResults[0], null, 2));
      console.log('🔍 Available fields:', Object.keys(filteredResults[0]));
    }
    
    // Process results
    const processedTweets = processApifyResults(filteredResults, keywords);
    console.log(`✅ Processed ${processedTweets.length} tweets after filtering`);
    
    // Load existing alerts
    const alerts = loadAlerts();
    let newAlertsFound = 0;
    
    // Check for new tweets (not already alerted)
    console.log(`🔍 Checking ${processedTweets.length} processed tweets against ${alerts.alerts.length} existing alerts`);
    
    for (const tweet of processedTweets) {
      console.log(`\n🔍 Checking tweet: ${tweet.url}`);
      console.log(`📝 Tweet text: "${tweet.text.substring(0, 50)}..."`);
      
      // Simple and effective duplicate checking by URL
      const isDuplicate = alerts.alerts.some(alert => {
        // Primary check: exact URL match
        if (alert.url === tweet.url) {
          console.log(`❌ Duplicate found: exact URL match`);
          return true;
        }
        
        // Secondary check: extract tweet ID from URL and compare
        const tweetId = tweet.url.match(/status\/(\d+)/)?.[1];
        const alertTweetId = alert.url?.match(/status\/(\d+)/)?.[1];
        if (tweetId && alertTweetId && tweetId === alertTweetId) {
          console.log(`❌ Duplicate found: tweet ID match (${tweetId})`);
          return true;
        }
        
        return false;
      });
      
      if (!isDuplicate) {
        console.log(`🚨 New tweet found for keyword "${tweet.keyword}": ${tweet.url}`);
        
        // Save alert in format expected by dashboard
        const newAlert = {
          id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          keyword: tweet.keyword,
          tweetId: tweet.url.match(/status\/(\d+)/)?.[1] || '',
          tweetText: tweet.text,
          author: tweet.authorName || tweet.username || 'Unknown', // This will be the display name
          authorHandle: tweet.username || 'unknown', // This will be the username
          timestamp: tweet.tweetCreatedAt || new Date().toISOString(), // Use actual tweet creation time
          scrapedAt: new Date().toISOString(), // When we found it
          url: tweet.url,
          engagement: {
            likes: 0,
            retweets: 0,
            replies: 0
          },
          status: 'new',
          verified: tweet.verified,
          imageCount: tweet.imageCount,
          hasCard: tweet.hasCard,
          alertSent: false
        };
        
        console.log(`💾 Saving new alert:`, JSON.stringify(newAlert, null, 2));
        alerts.alerts.push(newAlert);
        
        newAlertsFound++;
      } else {
        console.log(`⏭️ Skipping duplicate tweet: ${tweet.url}`);
      }
    }
    
    // Update statistics
    alerts.statistics.totalScans++;
    alerts.statistics.totalAlerts += newAlertsFound;
    alerts.statistics.lastAlert = newAlertsFound > 0 ? new Date().toISOString() : alerts.statistics.lastAlert;
    alerts.lastScan = new Date().toISOString();
    
    saveAlerts(alerts);
    
    // Clear old alerts to prevent file from growing too large
    clearOldAlerts();
    
    // Clean up any replies that might have slipped through
    const removedReplies = cleanUpExistingReplies();
    if (removedReplies > 0) {
      console.log(`🧹 Post-scan cleanup: Removed ${removedReplies} replies that slipped through filtering`);
    }
    
    console.log(`📊 Scan completed for keywords: ${keywords.join(', ')}`);
    console.log(`🚨 Found ${newAlertsFound} new alerts`);
    
    return newAlertsFound;
    
  } catch (error) {
    console.error(`❌ Error during Apify keyword scan: ${error.message}`);
    return 0;
  }
}

// Start monitoring with Apify
function startMonitoring(intervalMinutes = 30) {
  console.log(`🚀 Starting tweet alert monitoring with Apify`);
  console.log(`⏰ Scanning every ${intervalMinutes} minute(s)`);
  
  // Initialize if needed
  initializeAlerts();
  
  // Load current keywords
  const alerts = loadAlerts();
  if (alerts.keywords.length === 0) {
    console.log('⚠️ No keywords configured. Use addKeyword() to add keywords first.');
    return;
  }
  
  console.log(`🔍 Monitoring ${alerts.keywords.length} keywords: ${alerts.keywords.join(', ')}`);
  
  // Execute immediate scan on startup
  console.log(`🚀 Executing immediate scan on startup...`);
  scanForKeywords(alerts.keywords).then(() => {
    console.log(`✅ Initial scan completed`);
  }).catch((error) => {
    console.error(`❌ Initial scan failed: ${error.message}`);
  });
  
  // Create cron job for scheduled scanning
  const cronPattern = `*/${intervalMinutes} * * * *`;
  const scanJob = new CronJob(cronPattern, async () => {
    console.log(`\n🔍 Starting scheduled scan at ${new Date().toLocaleString()}`);
    await scanForKeywords(alerts.keywords);
  }, null, true);
  
  console.log(`✅ Monitoring started. Cron pattern: ${cronPattern}`);
  
  // Return the job for potential stopping
  return scanJob;
}

// Stop monitoring
function stopMonitoring(scanJob) {
  if (scanJob) {
    scanJob.stop();
    console.log('🛑 Monitoring stopped.');
  }
}

// Set Telegram chat ID (needed for first time setup)
function setChatId(chatId) {
  TWEET_ALERT_CONFIG.CHAT_ID = chatId;
  
  // Save chat ID to alerts file
  const alerts = loadAlerts();
  alerts.chatId = chatId;
  saveAlerts(alerts);
  
  console.log(`✅ Chat ID set to: ${chatId}`);
}

// Clear old alerts (keep only last 1000)
function clearOldAlerts() {
  const alerts = loadAlerts();
  if (alerts.alerts.length > 1000) {
    alerts.alerts = alerts.alerts.slice(-1000);
    saveAlerts(alerts);
    console.log(`🧹 Cleared old alerts. Keeping last 1000 alerts.`);
  }
}

// Clean up existing replies from alerts
function cleanUpExistingReplies() {
  const alerts = loadAlerts();
  const originalCount = alerts.alerts.length;
  
  // Filter out existing replies using the enhanced detection
  alerts.alerts = alerts.alerts.filter(alert => !isTweetReply(alert));
  
  const filteredCount = alerts.alerts.length;
  const removedCount = originalCount - filteredCount;
  
  if (removedCount > 0) {
    console.log(`🧹 Cleaned up ${removedCount} existing replies from alerts (${originalCount} → ${filteredCount})`);
    saveAlerts(alerts);
  }
  
  return removedCount;
}

// Reset alerts (clear all stored alerts)
function resetAlerts() {
  const alerts = loadAlerts();
  alerts.alerts = [];
  alerts.statistics.totalAlerts = 0;
  alerts.statistics.lastAlert = null;
  saveAlerts(alerts);
  console.log(`🔄 Reset all alerts. Starting fresh.`);
}

// Get system status
function getStatus() {
  const alerts = loadAlerts();
  console.log('📊 Tweet Alert System Status (Apify Integration):');
  console.log(`Keywords monitored: ${alerts.keywords.length}`);
  console.log(`Total scans: ${alerts.statistics.totalScans}`);
  console.log(`Total alerts sent: ${alerts.statistics.totalAlerts}`);
  console.log(`Last scan: ${alerts.lastScan || 'Never'}`);
  console.log(`Last alert: ${alerts.statistics.lastAlert || 'Never'}`);
  console.log(`Chat ID configured: ${alerts.chatId ? 'Yes' : 'No'}`);
  console.log(`Total alerts stored: ${alerts.alerts.length}`);
  console.log(`Apify API configured: Yes`);
}

// Export functions
module.exports = {
  initializeAlerts,
  loadAlerts,
  saveAlerts,
  addKeyword,
  removeKeyword,
  listKeywords,
  startMonitoring,
  stopMonitoring,
  setChatId,
  getStatus,
  scanForKeywords,
  executeTweetAction,
  cleanUpExistingReplies,
  // Dashboard data for web integration
  getDashboardData: (page = 1, limit = 10, showAll = false) => {
    try {
      if (!fs.existsSync(TWEET_ALERT_CONFIG.ALERTS_FILE)) {
        return {
          initialized: false,
          message: 'Tweet alert system not initialized'
        };
      }
      
      const alertsData = JSON.parse(fs.readFileSync(TWEET_ALERT_CONFIG.ALERTS_FILE, 'utf8'));
      const allAlerts = alertsData.alerts || [];
      
      // Calculate pagination
      const totalAlerts = allAlerts.length;
      const totalPages = Math.ceil(totalAlerts / limit);
      const startIndex = showAll ? 0 : (page - 1) * limit;
      const endIndex = showAll ? totalAlerts : startIndex + limit;
      
      // Get alerts for current page or all alerts
      const alertsToShow = allAlerts
        .reverse() // Reverse first to get newest at the beginning
        .slice(startIndex, endIndex)
        .map(alert => ({
          username: alert.username,
          text: alert.text,
          url: alert.url,
          timestamp: alert.timestamp,
          keyword: alert.keyword,
          verified: alert.verified,
          imageCount: alert.imageCount,
          hasCard: alert.hasCard
        }));
      
      return {
        initialized: true,
        keywords: alertsData.keywords || [],
        statistics: {
          totalScans: alertsData.statistics?.totalScans || 0,
          totalAlerts: alertsData.statistics?.totalAlerts || 0,
          lastAlert: alertsData.statistics?.lastAlert || null
        },
        lastScan: alertsData.lastScan || null,
        chatIdConfigured: !!alertsData.chatId,
        totalAlertsStored: totalAlerts,
        pagination: {
          currentPage: page,
          totalPages: totalPages,
          totalAlerts: totalAlerts,
          alertsPerPage: limit,
          showAll: showAll
        },
        recentAlerts: alertsToShow
      };
    } catch (error) {
      return {
        initialized: false,
        error: error.message
      };
    }
  },
  
  // Export current status for API endpoints
  getStatusData: () => {
    try {
      const alertsData = JSON.parse(fs.readFileSync(TWEET_ALERT_CONFIG.ALERTS_FILE, 'utf8'));
      return {
        keywords: alertsData.keywords || [],
        totalScans: alertsData.statistics?.totalScans || 0,
        totalAlerts: alertsData.statistics?.totalAlerts || 0,
        lastScan: alertsData.lastScan || null,
        lastAlert: alertsData.statistics?.lastAlert || null,
        chatIdConfigured: !!alertsData.chatId,
        totalAlertsStored: alertsData.alerts?.length || 0,
        // Cooldown info
        canScanNow: canPerformManualScan(),
        timeUntilNextScan: getTimeUntilNextManualScan(),
        automaticScanning: !!autoScanJob,
        // Apify integration info
        usingApify: true,
        apifyConfigured: true
      };
    } catch (error) {
      return { error: error.message };
    }
  },
  // Cooldown functions
  canPerformManualScan,
  getTimeUntilNextManualScan,
  startAutomaticScanning,
  stopAutomaticScanning
};

// Start automatic scanning every 30 minutes
function startAutomaticScanning() {
  if (autoScanJob) {
    autoScanJob.stop();
  }

  console.log('🔄 Starting automatic scanning every 30 minutes with Apify');
  
  // Create cron job for every 30 minutes
  autoScanJob = new CronJob('*/30 * * * *', async () => {
    console.log(`\n🔍 Starting automatic scan at ${new Date().toLocaleString()}`);
    
    try {
      const alerts = loadAlerts();
      if (alerts.keywords.length > 0) {
        await scanForKeywords(alerts.keywords);
      } else {
        console.log('⚠️ No keywords configured for automatic scan');
      }
    } catch (error) {
      console.error(`❌ Automatic scan failed: ${error.message}`);
    }
  }, null, true);

  console.log('✅ Automatic scanning started. Cron pattern: */30 * * * *');
}

// Stop automatic scanning
function stopAutomaticScanning() {
  if (autoScanJob) {
    autoScanJob.stop();
    autoScanJob = null;
    console.log('🛑 Automatic scanning stopped.');
  }
}

// Check if manual scan is allowed (30-minute cooldown)
function canPerformManualScan() {
  if (!lastManualScan) return true;
  
  const now = Date.now();
  const timeSinceLastScan = now - lastManualScan;
  
  return timeSinceLastScan >= MANUAL_SCAN_COOLDOWN;
}

// Get time until next manual scan is allowed
function getTimeUntilNextManualScan() {
  if (!lastManualScan) return 0;
  
  const now = Date.now();
  const timeSinceLastScan = now - lastManualScan;
  const remainingTime = MANUAL_SCAN_COOLDOWN - timeSinceLastScan;
  
  return Math.max(0, Math.ceil(remainingTime / (1000 * 60))); // Return minutes
}

// Get keywords function
function getKeywords() {
  try {
    if (fs.existsSync(TWEET_ALERT_CONFIG.ALERTS_FILE)) {
      const data = fs.readFileSync(TWEET_ALERT_CONFIG.ALERTS_FILE, 'utf8');
      const parsed = JSON.parse(data);
      const keywords = parsed.keywords || [];
      
      // Handle both string and object formats
      return keywords.map(k => {
        if (typeof k === 'string') {
          return k;
        } else if (k && typeof k === 'object' && k.keyword) {
          return k.keyword;
        } else {
          return null;
        }
      }).filter(Boolean);
    }
    return [];
  } catch (error) {
    console.error('Error getting keywords:', error);
    return [];
  }
}

// Get status data for existing team-based system
function getStatusData() {
  try {
    const alerts = loadAlerts();
    const keywords = alerts.keywords || [];
    const totalAlerts = alerts.alerts || [];
    
    return {
      isMonitoring: false, // Default to false since we're using Apify now
      totalKeywords: keywords.length,
      totalAlerts: totalAlerts.length,
      newAlerts: totalAlerts.filter(a => !a.status || a.status === 'new').length,
      processedAlerts: totalAlerts.filter(a => a.status === 'processed').length,
      lastScan: alerts.lastScan ? new Date(alerts.lastScan).toISOString() : null,
      nextScan: alerts.nextScan ? new Date(alerts.nextScan).toISOString() : null,
      automaticScanning: false
    };
  } catch (error) {
    console.error('Error getting status data:', error);
    return {
      isMonitoring: false,
      totalKeywords: 0,
      totalAlerts: 0,
      newAlerts: 0,
      processedAlerts: 0,
      lastScan: null,
      nextScan: null,
      automaticScanning: false
    };
  }
}

// Get dashboard data for existing team-based system
function getDashboardData(page = 1, limit = 10, showAll = false) {
  try {
    const alerts = loadAlerts();
    const allAlerts = alerts.alerts || [];
    
    // Filter alerts based on showAll parameter
    const filteredAlerts = showAll ? allAlerts : allAlerts.filter(a => !a.status || a.status === 'new');
    
    // Paginate results
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedAlerts = filteredAlerts.slice(startIndex, endIndex);
    
    return {
      alerts: paginatedAlerts,
      total: filteredAlerts.length,
      page: page,
      limit: limit,
      totalPages: Math.ceil(filteredAlerts.length / limit),
      keywords: alerts.keywords || [],
      status: getStatusData()
    };
  } catch (error) {
    console.error('Error getting dashboard data:', error);
    return {
      alerts: [],
      total: 0,
      page: page,
      limit: limit,
      totalPages: 0,
      keywords: [],
      status: getStatusData()
    };
  }
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0];
  
  switch (command) {
    case 'init':
      initializeAlerts();
      break;
    case 'reset':
      resetAlerts();
      break;
    case 'add':
      if (args[1]) {
        addKeyword(args[1]);
      } else {
        console.log('Usage: node tweet-alert-system.js add <keyword>');
      }
      break;
    case 'remove':
      if (args[1]) {
        removeKeyword(args[1]);
      } else {
        console.log('Usage: node tweet-alert-system.js remove <keyword>');
      }
      break;
    case 'list':
      listKeywords();
      break;
    case 'status':
      getStatus();
      break;
    case 'start':
      const interval = args[1] ? parseInt(args[1]) : 30;
      startMonitoring(interval);
      break;
    case 'setchat':
      if (args[1]) {
        setChatId(args[1]);
      } else {
        console.log('Usage: node tweet-alert-system.js setchat <chatId>');
      }
      break;
    default:
      console.log('Tweet Alert System Commands (Apify Integration):');
      console.log('  init                    - Initialize the system');
      console.log('  reset                   - Reset all alerts (start fresh)');
      console.log('  add <keyword>           - Add keyword to monitor');
      console.log('  remove <keyword>        - Remove keyword from monitoring');
      console.log('  list                    - List all monitored keywords');
      console.log('  status                  - Show system status');
      console.log('  setchat <chatId>        - Set Telegram chat ID');
      console.log('  start [minutes]         - Start monitoring (default 30 min interval)');
      break;
  }
}

// Stop monitoring function
function stopMonitoring() {
  try {
    stopAutomaticScanning();
    console.log('🛑 Twitter alerts monitoring stopped');
    return true;
  } catch (error) {
    console.error('❌ Failed to stop monitoring:', error);
    return false;
  }
}

// Export functions for external use
module.exports = {
  initializeAlerts,
  addKeyword,
  removeKeyword,
  getKeywords,
  scanForKeywords,
  startMonitoring,
  stopMonitoring,
  getStatus,
  formatTweetMessage,
  getStatusData,
  getDashboardData,
  loadAlerts,
  saveAlerts,
  executeTweetAction,
  executeProfileTweetAction,
  cleanUpExistingReplies
};

console.log('🚀 Tweet Alert System with Apify Integration is ready!');
console.log('📊 No profiles needed for scanning - using Apify scraper');
