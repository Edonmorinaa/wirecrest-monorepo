#!/usr/bin/env node

const puppeteer = require('puppeteer-core');
const nodemailer = require('nodemailer');
const CronJob = require('cron').CronJob;
const fs = require('fs');
const path = require('path');

// Configuration
const ADS_LOCAL_URL = 'http://local.adspower.net:50325';
const PROFILES_FILE = path.join(__dirname, 'profiles.json');
const SCHEDULE_FILE = path.join(__dirname, 'schedule.json');
const PERSONA_FILE = path.join(__dirname, 'persona.txt');
const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY;
const PERPLEXITY_API_URL = 'https://api.perplexity.ai/chat/completions';
const UPLOADTHING_TOKEN='eyJhcGlLZXkiOiJza19saXZlXzA4YThkODg2YTk4N2UyNWM2NmZjZmU1MTNkYzVkZDAzYWYxNWY4MjMxNzZmN2MzYmIzNTE4ZTEzNmRmMzAxNzIiLCJhcHBJZCI6Im1tcGxjNW40ZDEiLCJyZWdpb25zIjpbInNlYTEiXX0='
const EMAIL_CONFIG = {
  service: 'gmail',
  auth: { user: 'your.email@gmail.com', pass: 'your-app-password' },
  to: 'your.email@gmail.com'
};
const LOG_FILE = path.join(__dirname, 'automation-log.txt');



// Global variables
let profiles = [];
let scheduledJobs = new Map();
let currentSchedule = null;
let lastExecutionTime = null;
let executingProfiles = new Set(); // Track currently executing profiles
let recentlyExecutedProfiles = new Map(); // Track recently executed profiles with timestamps

// Action types available
const ACTION_TYPES = ['comment', 'like', 'retweet'];

// Minimum time between ANY profile executions (in minutes)
const MIN_EXECUTION_INTERVAL = 15;

// Cooldown period for individual profiles (in minutes)
const PROFILE_COOLDOWN = 180; // 3 hours

// Multiple selectors for tweets (fallback options)
const TWEET_SELECTORS = [
  'div[data-testid="tweet"]',
  'article[data-testid="tweet"]',
  'div[data-testid="cellInnerDiv"]',
  'article[role="article"]',
  '[data-testid="tweet"]'
];

// Action selectors for different interactions
const ACTION_SELECTORS = {
  like: [
    'div[data-testid="like"]',
    '[data-testid="like"]',
    'div[aria-label="Like"]',
    'button[aria-label="Like"]',
    'div[role="button"][aria-label*="ike"]'
  ],
  retweet: [
    'div[data-testid="retweet"]',
    '[data-testid="retweet"]',
    'div[aria-label="Repost"]',
    'button[aria-label="Repost"]',
    'div[role="button"][aria-label*="epost"]'
  ],
  reply: [
    'div[data-testid="reply"]',
    '[data-testid="reply"]',
    'div[aria-label="Reply"]',
    'button[aria-label="Reply"]',
    'div[role="button"][aria-label*="epl"]'
  ]
};

// Helper: Sleep function to replace page.waitForTimeout
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Helper functions removed - using simpler text matching now

// Helper: Log to file and console with profile support
function log(message, profileId = 'SYSTEM') {
  const timestamp = new Date().toISOString();
  const entry = `[${timestamp}][${profileId}] ${message}`;
  
  try {
    const path = require('path');
    const fullLogPath = path.resolve(LOG_FILE);
    fs.appendFileSync(fullLogPath, entry + '\n');
    
    // Debug: Show where we're writing (only once)
    if (!log.pathShown) {
      console.log(`[DEBUG] Writing logs to: ${fullLogPath}`);
      log.pathShown = true;
    }
  } catch (err) {
    console.error(`Failed to write to log file: ${err.message}`);
    // Try to create the file if it doesn't exist
    try {
      const path = require('path');
      const fullLogPath = path.resolve(LOG_FILE);
      fs.writeFileSync(fullLogPath, entry + '\n');
      console.log(`[DEBUG] Created new log file at: ${fullLogPath}`);
    } catch (createErr) {
      console.error(`Failed to create log file: ${createErr.message}`);
    }
  }
  
  console.log(entry);
}

// Helper: Check if enough time has passed since last execution
function canExecuteNow(bypassTelegram = false) {
  // If this is a Telegram request, bypass the cooldown
  if (bypassTelegram) {
    log('Telegram request detected - bypassing global cooldown', 'TELEGRAM');
    return true;
  }
  
  if (!lastExecutionTime) return true;
  
  const now = new Date();
  const timeSinceLastExecution = (now.getTime() - lastExecutionTime.getTime()) / (1000 * 60); // in minutes
  
  return timeSinceLastExecution >= MIN_EXECUTION_INTERVAL;
}

// Helper: Check if profile is available for execution
function isProfileAvailable(profileId) {
  // Check if profile is currently executing
  if (executingProfiles.has(profileId)) {
    log(`Profile ${profileId} is currently executing, skipping`, profileId);
    return false;
  }
  
  // Check if profile is in cooldown period
  const lastExecution = recentlyExecutedProfiles.get(profileId);
  if (lastExecution) {
    const now = new Date();
    const timeSinceExecution = (now.getTime() - lastExecution.getTime()) / (1000 * 60); // in minutes
    
    if (timeSinceExecution < PROFILE_COOLDOWN) {
      const remainingCooldown = Math.round(PROFILE_COOLDOWN - timeSinceExecution);
      log(`Profile ${profileId} is in cooldown for ${remainingCooldown} more minutes`, profileId);
      return false;
    }
  }
  
  return true;
}

// Helper: Mark profile as executing
function markProfileExecuting(profileId) {
  executingProfiles.add(profileId);
  log(`Marked ${profileId} as executing`, profileId);
}

// Helper: Mark profile execution complete
function markProfileExecutionComplete(profileId) {
  executingProfiles.delete(profileId);
  recentlyExecutedProfiles.set(profileId, new Date());
  lastExecutionTime = new Date();
  log(`Marked ${profileId} execution complete`, profileId);
}

// Helper: Get random action type with better distribution
function getRandomActionType() {
  const randomIndex = Math.floor(Math.random() * ACTION_TYPES.length);
  const selectedAction = ACTION_TYPES[randomIndex];
  log(`Random action selected: ${selectedAction} (index: ${randomIndex} of ${ACTION_TYPES.length})`, 'SYSTEM');
  return selectedAction;
}

// Helper: Generate random time within specified hours from now
function generateRandomTime(minHours = 0.5, maxHours = 3) {
  const now = new Date();
  const minTime = now.getTime() + (minHours * 60 * 60 * 1000);
  const maxTime = now.getTime() + (maxHours * 60 * 60 * 1000);
  
  const randomTime = new Date(minTime + Math.random() * (maxTime - minTime));
  return randomTime;
}

// Helper: Create comprehensive schedule for all profiles with balanced action distribution
function createSchedule() {
  log('Creating new comprehensive schedule for all profiles');
  
  const schedule = {
    created: new Date().toISOString(),
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours from now
    version: '1.0',
    totalProfiles: profiles.length,
    profiles: []
  };
  
  // Select a random profile for immediate execution (1 minute delay)
  const randomProfileIndex = Math.floor(Math.random() * profiles.length);
  
  // Ensure balanced action distribution for non-immediate profiles
  const actionDistribution = [];
  const remainingProfiles = profiles.length - 1; // Subtract 1 for the immediate execution profile
  const actionsPerType = Math.ceil(remainingProfiles / ACTION_TYPES.length);
  
  // Create balanced distribution for remaining profiles: equal numbers of each action type
  ACTION_TYPES.forEach(actionType => {
    for (let i = 0; i < actionsPerType; i++) {
      actionDistribution.push(actionType);
    }
  });
  
  // Shuffle the action distribution array for randomness
  for (let i = actionDistribution.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [actionDistribution[i], actionDistribution[j]] = [actionDistribution[j], actionDistribution[i]];
  }
  
  log(`Action distribution created for remaining profiles: ${actionDistribution.join(', ')}`);
  
  let distributionIndex = 0; // Track position in action distribution array
  
  // Create schedule entries for each profile
  profiles.forEach((profile, index) => {
    let scheduledTime;
    let isImmediateExecution = false;
    let actionType;
    
    if (index === randomProfileIndex) {
      // CRITICAL: Schedule this random profile to run after 1 minute with COMMENT action
      // This ensures the first action is ALWAYS a comment as agreed
      scheduledTime = new Date(Date.now() + 60 * 1000); // 1 minute from now
      isImmediateExecution = true;
      actionType = 'comment'; // ALWAYS comment for immediate execution - NEVER change this!
      log(`Selected profile ${profile.id} for immediate COMMENT execution (1 minute delay)`, profile.id);
    } else {
      // Use staggered timing with larger intervals to prevent overlap
      const baseDelay = 2 + (index * 3); // Start at 2 hours, add 3 hours per profile
      scheduledTime = generateRandomTime(baseDelay, baseDelay + 1);
      
      // Get action from balanced distribution (or fallback to random)
      actionType = actionDistribution[distributionIndex] || getRandomActionType();
      distributionIndex++;
    }
    
    const profileSchedule = {
      profileId: profile.id,
      adspower_id: profile.adspower_id,
      scheduledTime: scheduledTime.toISOString(),
      status: 'scheduled',
      completed: false,
      actionType: actionType,
      delayRange: profile.delay_range || { min: 60, max: 120 },
      persona: profile.persona.substring(0, 100) + '...', // Truncated for readability
      createdAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      isImmediateExecution: isImmediateExecution // Flag to identify the immediate profile
    };
    
    schedule.profiles.push(profileSchedule);
    
    const timeUntil = Math.round((scheduledTime.getTime() - Date.now()) / 1000 / 60);
    const executionType = isImmediateExecution ? ' (IMMEDIATE EXECUTION)' : '';
    const cetTime = scheduledTime.toLocaleString('en-GB', { 
      timeZone: 'Europe/Berlin', 
      year: 'numeric', 
      month: '2-digit', 
      day: '2-digit', 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
    log(`Scheduled ${profile.id} for ${actionType.toUpperCase()} in ${timeUntil} minutes at ${cetTime} CET${executionType}`, profile.id);
  });
  
  // Sort profiles by scheduled time
  schedule.profiles.sort((a, b) => new Date(a.scheduledTime) - new Date(b.scheduledTime));
  
  // Log final action distribution
  const finalCounts = {
    comment: schedule.profiles.filter(p => p.actionType === 'comment').length,
    like: schedule.profiles.filter(p => p.actionType === 'like').length,
    retweet: schedule.profiles.filter(p => p.actionType === 'retweet').length
  };
  log(`Final action distribution - Comments: ${finalCounts.comment} (includes 1 immediate), Likes: ${finalCounts.like}, Retweets: ${finalCounts.retweet}`);
  
  // Save schedule to file
  fs.writeFileSync(SCHEDULE_FILE, JSON.stringify(schedule, null, 2));
  log(`Schedule created and saved with ${schedule.profiles.length} profiles`);
  
  return schedule;
}

// Helper: Force recreate schedule (useful for fixing distribution issues)
function forceRecreateSchedule() {
  log('Force recreating schedule to fix action distribution');
  
  // Clear existing schedule
  if (fs.existsSync(SCHEDULE_FILE)) {
    fs.unlinkSync(SCHEDULE_FILE);
    log('Deleted existing schedule file');
  }
  
  // Create new schedule
  return createSchedule();
}

// Helper: Check if schedule has balanced action distribution
function hasBalancedActionDistribution(schedule) {
  if (!schedule || !schedule.profiles) return false;
  
  const actionCounts = {
    comment: schedule.profiles.filter(p => p.actionType === 'comment').length,
    like: schedule.profiles.filter(p => p.actionType === 'like').length,
    retweet: schedule.profiles.filter(p => p.actionType === 'retweet').length
  };
  
  // Check if comments are completely missing (the main issue)
  if (actionCounts.comment === 0) {
    log('Schedule has no COMMENT actions - needs recreation');
    return false;
  }
  
  // Check if there's no immediate comment execution
  const hasImmediateComment = schedule.profiles.some(p => 
    p.isImmediateExecution && p.actionType === 'comment'
  );
  
  if (!hasImmediateComment) {
    log('Schedule has no immediate COMMENT execution - needs recreation');
    return false;
  }
  
  // For the remaining profiles (excluding immediate), check if distribution is reasonable
  const nonImmediateProfiles = schedule.profiles.filter(p => !p.isImmediateExecution);
  const minExpected = Math.floor(nonImmediateProfiles.length / ACTION_TYPES.length);
  
  // Allow some flexibility in distribution, but ensure no action type is completely missing
  const hasReasonableDistribution = Object.values(actionCounts).every(count => count >= 1);
  
  if (!hasReasonableDistribution) {
    log(`Poor action distribution detected - Comments: ${actionCounts.comment}, Likes: ${actionCounts.like}, Retweets: ${actionCounts.retweet}`);
    return false;
  }
  
  log(`Good action distribution confirmed - Comments: ${actionCounts.comment}, Likes: ${actionCounts.like}, Retweets: ${actionCounts.retweet}`);
  return true;
}

// Helper: Load existing schedule or create new one
function loadOrCreateSchedule() {
  try {
    if (fs.existsSync(SCHEDULE_FILE)) {
      const data = fs.readFileSync(SCHEDULE_FILE, 'utf8');
      const schedule = JSON.parse(data);
      
      const expiryTime = new Date(schedule.expires);
      const now = new Date();
      
      if (now > expiryTime) {
        log('Existing schedule expired, creating new one');
        return createSchedule();
      } else {
        // Check if schedule has balanced distribution
        if (!hasBalancedActionDistribution(schedule)) {
          log('Existing schedule has poor action distribution, recreating...');
          return forceRecreateSchedule();
        }
        
        log(`Loading existing schedule with ${schedule.profiles.length} profiles`);
        return schedule;
      }
    } else {
      log('No existing schedule found, creating new one');
      return createSchedule();
    }
  } catch (err) {
    log(`Error loading schedule: ${err.message}`);
    return createSchedule();
  }
}

// Helper: Update schedule status for a profile
function updateScheduleStatus(profileId, status, error = null, result = null) {
  try {
    if (!fs.existsSync(SCHEDULE_FILE)) {
      log('Schedule file not found, cannot update status');
      return;
    }
    
    const data = fs.readFileSync(SCHEDULE_FILE, 'utf8');
    const schedule = JSON.parse(data);
    
    const profileSchedule = schedule.profiles.find(p => p.profileId === profileId);
    if (profileSchedule) {
      profileSchedule.status = status;
      profileSchedule.completed = status === 'completed' || status === 'failed';
      profileSchedule.lastUpdated = new Date().toISOString();
      
      if (status === 'completed') {
        profileSchedule.completedAt = new Date().toISOString();
        if (result) {
          profileSchedule.result = {
            action: result.actionType || 'unknown',
            success: result.success,
            comment: result.comment?.substring(0, 150) || null,
            tweetText: result.tweet?.substring(0, 150) || 'N/A'
          };
        }
      }
      
      if (status === 'failed' && error) {
        profileSchedule.error = error;
        profileSchedule.failedAt = new Date().toISOString();
      }
      
      if (status === 'running') {
        profileSchedule.startedAt = new Date().toISOString();
      }
      
      // Update schedule statistics
      const completed = schedule.profiles.filter(p => p.status === 'completed').length;
      const failed = schedule.profiles.filter(p => p.status === 'failed').length;
      const running = schedule.profiles.filter(p => p.status === 'running').length;
      const pending = schedule.profiles.filter(p => p.status === 'scheduled').length;
      
      // Count actions by type
      const actionCounts = {
        comment: schedule.profiles.filter(p => p.actionType === 'comment').length,
        like: schedule.profiles.filter(p => p.actionType === 'like').length,
        retweet: schedule.profiles.filter(p => p.actionType === 'retweet').length
      };
      
      const completedActions = {
        comment: schedule.profiles.filter(p => p.actionType === 'comment' && p.status === 'completed').length,
        like: schedule.profiles.filter(p => p.actionType === 'like' && p.status === 'completed').length,
        retweet: schedule.profiles.filter(p => p.actionType === 'retweet' && p.status === 'completed').length
      };
      
      schedule.statistics = {
        total: schedule.profiles.length,
        completed,
        failed,
        running,
        pending,
        actionCounts,
        completedActions,
        lastUpdated: new Date().toISOString()
      };
    }
    
    fs.writeFileSync(SCHEDULE_FILE, JSON.stringify(schedule, null, 2));
    log(`Schedule updated: ${profileId} -> ${status}`, profileId);
  } catch (err) {
    log(`Error updating schedule: ${err.message}`);
  }
}

// Helper: Get next scheduled profile that's available for execution
function getNextScheduledProfile(isImmediateRun = false) {
  try {
    if (!currentSchedule) return null;
    
    const now = new Date();
    
    // Find profiles that are due and available
    let availableProfiles;
    
    if (isImmediateRun) {
      // For immediate runs, ignore cooldowns and availability checks
      availableProfiles = currentSchedule.profiles.filter(p => 
        !p.completed && 
        p.status === 'scheduled' && 
        new Date(p.scheduledTime) <= now
      );
      log(`Immediate run: Found ${availableProfiles.length} profiles ready (ignoring cooldowns)`);
    } else {
      // For regular runs, check availability and cooldowns
      availableProfiles = currentSchedule.profiles.filter(p => 
        !p.completed && 
        p.status === 'scheduled' && 
        new Date(p.scheduledTime) <= now &&
        isProfileAvailable(p.profileId)
      );
    }
    
    if (availableProfiles.length === 0) {
      return null;
    }
    
    // Return the earliest scheduled available profile
    return availableProfiles[0];
    
  } catch (err) {
    log(`Error getting next scheduled profile: ${err.message}`);
    return null;
  }
}

// Helper: Display schedule summary
function displayScheduleSummary() {
  if (!currentSchedule) return;
  
  const now = new Date();
  const upcoming = currentSchedule.profiles.filter(p => 
    !p.completed && new Date(p.scheduledTime) > now
  ).slice(0, 5);
  
  log('=== SCHEDULE SUMMARY ===');
  log(`Total Profiles: ${currentSchedule.totalProfiles}`);
  log(`Schedule Created: ${new Date(currentSchedule.created).toLocaleString('en-GB', { timeZone: 'Europe/Berlin', hour12: false })} CET`);
  log(`Schedule Expires: ${new Date(currentSchedule.expires).toLocaleString('en-GB', { timeZone: 'Europe/Berlin', hour12: false })} CET`);
  
  if (currentSchedule.statistics) {
    const stats = currentSchedule.statistics;
    log(`Status - Completed: ${stats.completed}, Failed: ${stats.failed}, Running: ${stats.running}, Pending: ${stats.pending}`);
    
    if (stats.actionCounts) {
      log(`Actions - Comments: ${stats.actionCounts.comment}, Likes: ${stats.actionCounts.like}, Retweets: ${stats.actionCounts.retweet}`);
      log(`Completed - Comments: ${stats.completedActions.comment}, Likes: ${stats.completedActions.like}, Retweets: ${stats.completedActions.retweet}`);
    }
  }
  
  // Display execution status
  if (executingProfiles.size > 0) {
    log(`Currently Executing: ${Array.from(executingProfiles).join(', ')}`);
  }
  
  if (lastExecutionTime) {
    const timeSinceLastExecution = Math.round((new Date().getTime() - lastExecutionTime.getTime()) / 1000 / 60);
    log(`Last Execution: ${timeSinceLastExecution} minutes ago`);
  }
  
  log('=== ALL SCHEDULED PROFILES (11 TOTAL) ===');
  const allProfiles = currentSchedule.profiles.sort((a, b) => new Date(a.scheduledTime) - new Date(b.scheduledTime));
  allProfiles.forEach((profile, index) => {
    const timeUntil = Math.round((new Date(profile.scheduledTime).getTime() - now.getTime()) / 1000 / 60);
    const available = isProfileAvailable(profile.profileId) ? '' : ' (COOLDOWN)';
    const cetTime = new Date(profile.scheduledTime).toLocaleString('en-GB', { 
      timeZone: 'Europe/Berlin', 
      year: 'numeric', 
      month: '2-digit', 
      day: '2-digit', 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
    
    // Show status for each profile
    let statusInfo = '';
    if (profile.completed && profile.status === 'completed') {
      statusInfo = ' ✅ COMPLETED';
    } else if (profile.completed && profile.status === 'failed') {
      statusInfo = ' ❌ FAILED';
    } else if (profile.status === 'running') {
      statusInfo = ' 🔄 RUNNING';
    } else if (executingProfiles.has(profile.profileId)) {
      statusInfo = ' 🔄 EXECUTING';
    } else {
      statusInfo = ` ⏳ PENDING${available}`;
    }
    
    log(`${index + 1}. ${profile.profileId} - ${profile.actionType.toUpperCase()} in ${timeUntil} minutes (${cetTime} CET)${statusInfo}`);
  });
  log('========================');
}

// Helper: Load profiles from JSON file
function loadProfiles() {
  try {
    if (!fs.existsSync(PROFILES_FILE)) {
      log('profiles.json not found. Creating default file.');
      const defaultProfiles = [
        {
          "id": "profile_default",
          "adspower_id": "kv849kg",
          "persona": "You are a knowledgeable and friendly AI enthusiast who loves discussing technology, automation, and innovation.",
          "active": true,
          "delay_range": { "min": 60, "max": 120 }
        }
      ];
      fs.writeFileSync(PROFILES_FILE, JSON.stringify(defaultProfiles, null, 2));
      return defaultProfiles;
    }
    
    const data = fs.readFileSync(PROFILES_FILE, 'utf8');
    const allProfiles = JSON.parse(data);
    const activeProfiles = allProfiles.filter(profile => profile.active);
    
    log(`Loaded ${activeProfiles.length} active profiles from ${allProfiles.length} total profiles`);
    return activeProfiles;
  } catch (err) {
    log(`Error loading profiles: ${err.message}`);
    return [];
  }
}

// Helper: Read persona from text file (fallback for old system)
function loadPersona() {
  try {
    if (!fs.existsSync(PERSONA_FILE)) {
      const defaultPersona = `You are a knowledgeable and friendly AI enthusiast who loves discussing technology, automation, and innovation. You provide helpful insights while maintaining a conversational and approachable tone. You often reference practical applications and encourage further discussion.`;
      fs.writeFileSync(PERSONA_FILE, defaultPersona);
      log('Created default persona file. Please customize it.');
    }
    const persona = fs.readFileSync(PERSONA_FILE, 'utf8').trim();
    log('Persona loaded from file.');
    return persona;
  } catch (err) {
    log(`Error loading persona: ${err.message}`);
    return "You are a helpful AI assistant.";
  }
}

// Helper: Generate random delay within profile's range
function getRandomDelay(profile) {
  const min = profile.delay_range?.min || 60;
  const max = profile.delay_range?.max || 120;
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Helper: Capture comment URL after posting
async function captureCommentUrl(page, aiComment, profileId) {
  let commentUrl = null;
  try {
    // Wait a bit more for the comment to appear
    await sleep(3000);
    
    // Since our comment is always the first reply, prioritize finding the first reply
    log(`Looking for first reply comment (our comment should be the first reply)`, profileId);
    
    // Method 1: Get the first reply comment (most reliable for our use case)
    const firstReplyUrl = await page.evaluate(() => {
      const articles = document.querySelectorAll('article[data-testid="tweet"]');
      // Skip the first article (which is usually the original tweet)
      for (let i = 1; i < articles.length; i++) {
        const article = articles[i];
        const linkElement = article.querySelector('a[href*="/status/"]');
        if (linkElement) {
          return linkElement.href;
        }
      }
      return null;
    });
    
    if (firstReplyUrl) {
      commentUrl = firstReplyUrl;
      log(`Found first reply comment URL: ${commentUrl}`, profileId);
    } else {
      log(`No first reply found, trying alternative methods`, profileId);
    }
    
    // Method 2: If first reply method failed, try reply indicator
    if (!commentUrl) {
      log(`Trying to find comment by reply indicator`, profileId);
      const replyCommentUrl = await page.evaluate(() => {
        const articles = document.querySelectorAll('article[data-testid="tweet"]');
        for (const article of articles) {
          // Look for reply indicators
          const replyIndicator = article.querySelector('[data-testid="reply"]');
          if (replyIndicator) {
            const linkElement = article.querySelector('a[href*="/status/"]');
            if (linkElement) {
              return linkElement.href;
            }
          }
        }
        return null;
      });
      
      if (replyCommentUrl) {
        commentUrl = replyCommentUrl;
        log(`Found comment URL by reply indicator: ${commentUrl}`, profileId);
      }
    }
    
    // Method 3: Try to find by "just now" timestamp
    if (!commentUrl) {
      log(`Trying to find comment with "just now" timestamp`, profileId);
      const justNowCommentUrl = await page.evaluate(() => {
        const articles = document.querySelectorAll('article[data-testid="tweet"]');
        for (const article of articles) {
          // Look for "just now" or similar recent timestamps
          const timeElement = article.querySelector('time');
          if (timeElement) {
            const timeText = timeElement.textContent.toLowerCase();
            if (timeText.includes('just now') || timeText.includes('now') || timeText.includes('1m') || timeText.includes('2m')) {
              const linkElement = article.querySelector('a[href*="/status/"]');
              if (linkElement) {
                return linkElement.href;
              }
            }
          }
        }
        return null;
      });
      
      if (justNowCommentUrl) {
        commentUrl = justNowCommentUrl;
        log(`Found comment URL by timestamp: ${commentUrl}`, profileId);
      }
    }
    
    // Method 4: Text matching as last resort (less reliable)
    if (!commentUrl) {
      log(`Trying text matching as last resort`, profileId);
      const commentElements = await page.$$('article[data-testid="tweet"]');
      log(`Found ${commentElements.length} tweet elements to search through`, profileId);
      
      for (const element of commentElements) {
        const commentText = await page.evaluate((el) => {
          const textElement = el.querySelector('[data-testid="tweetText"]');
          return textElement ? textElement.innerText.trim() : null;
        }, element);
        
        if (commentText) {
          log(`Checking comment text: "${commentText.substring(0, 50)}..." against "${aiComment.substring(0, 20)}"`, profileId);
        }
        
        // Try exact match first, then partial matches
        if (commentText && (
          commentText === aiComment || 
          commentText.includes(aiComment.substring(0, 30)) ||
          commentText.includes(aiComment.substring(0, 20)) ||
          commentText.includes(aiComment.substring(0, 15))
        )) {
          // Get the comment URL
          const commentLink = await page.evaluate((el) => {
            const linkElement = el.querySelector('a[href*="/status/"]');
            return linkElement ? linkElement.href : null;
          }, element);
          
          if (commentLink) {
            commentUrl = commentLink;
            log(`Found comment URL by text matching: ${commentUrl}`, profileId);
            break;
          }
        }
      }
    }
    
    // Last resort: get the most recent comment but log a warning
    if (!commentUrl) {
      log(`WARNING: Could not find specific comment, getting most recent comment as fallback`, profileId);
      const recentCommentUrl = await page.evaluate(() => {
        const articles = document.querySelectorAll('article[data-testid="tweet"]');
        if (articles.length > 0) {
          const firstArticle = articles[0]; // Most recent
          const linkElement = firstArticle.querySelector('a[href*="/status/"]');
          return linkElement ? linkElement.href : null;
        }
        return null;
      });
      
      if (recentCommentUrl) {
        commentUrl = recentCommentUrl;
        log(`Found fallback comment URL: ${commentUrl}`, profileId);
      } else {
        log(`No comment URL found at all`, profileId);
      }
    }
  } catch (urlErr) {
    log(`Could not capture comment URL: ${urlErr.message}`, profileId);
  }
  
  return commentUrl;
}

// Helper: Extract image URLs from tweet element
async function extractImageUrls(page, tweetElement) {
  try {
    const imageUrls = await page.evaluate((tweet) => {
      const imageSelectors = [
        'img[src*="pbs.twimg.com"]', // Twitter's image CDN
        'img[src*="media"]', // Media images
        'img[alt*="Image"]', // Images with alt text
        'img[data-testid="tweetPhoto"]', // Tweet photos
        'img[src*="twimg"]', // Any Twitter image
        'img[src*="http"]' // Any external image
      ];
      
      const images = [];
      for (const selector of imageSelectors) {
        const imgElements = tweet.querySelectorAll(selector);
        for (const img of imgElements) {
          const src = img.getAttribute('src');
          if (src && src.startsWith('http') && !src.includes('profile_images')) {
            // Filter out emoji SVGs and other non-image content
            if (src.includes('emoji/v2/svg/') || 
                src.includes('emoji/v2/72x72/') ||
                src.includes('emoji/v2/color/') ||
                src.includes('emoji/v2/') ||
                src.endsWith('.svg') ||
                src.includes('abs-0.twimg.com/emoji')) {
              continue;
            }
            
            // Only include actual image files
            if (src.includes('pbs.twimg.com/media/') || 
                src.includes('format=jpg') || 
                src.includes('format=png') ||
                src.includes('format=webp')) {
              // Get the highest quality version of the image
              let highQualityUrl = src;
              if (src.includes('pbs.twimg.com')) {
                // Twitter images can have different sizes, try to get the largest
                highQualityUrl = src.replace(/&name=\w+/, '&name=large');
              }
              images.push({
                url: highQualityUrl,
                alt: img.getAttribute('alt') || '',
                width: img.getAttribute('width') || '',
                height: img.getAttribute('height') || ''
              });
            }
          }
        }
      }
      
      // Remove duplicates and return unique images
      const uniqueImages = images.filter((img, index, self) => 
        index === self.findIndex(t => t.url === img.url)
      );
      
      return uniqueImages;
    }, tweetElement);
    
    return imageUrls;
  } catch (err) {
    log(`Error extracting image URLs: ${err.message}`, 'SYSTEM');
    return [];
  }
}

// Generate comment using text and image analysis
async function generateComment(tweetText, persona, profileId = 'SYSTEM', imageUrls = [], customPersona = null) {
  try {
    // Validate input
    if (!tweetText || tweetText.trim().length < 5) {
      log('Invalid tweet text provided to generateComment', profileId);
      return "interesting point";
    }

    // Clean and prepare tweet text for analysis
    const cleanTweetText = tweetText.trim().replace(/\n+/g, ' ').substring(0, 500);
    log(`Processing tweet: "${cleanTweetText}"`, profileId);
    
    if (imageUrls.length > 0) {
      log(`Found ${imageUrls.length} images in tweet`, profileId);
      imageUrls.forEach((img, index) => {
        log(`Image ${index + 1}: ${img.url} (alt: "${img.alt}")`, profileId);
      });
    }

    let prompt;
    let messages = [
      {
        role: 'system',
        content: `${persona}\n\nIMPORTANT: Before analyzing any tweet or generating a response, you MUST think and respond exactly like this profile. Your response should reflect this person's background, beliefs, communication style, and perspective. You are not a generic AI - you are this specific person with their unique worldview and way of expressing themselves.\n\nWhen replying to tweets, you sound like a real human having casual conversations. You never use emojis, exclamation marks, or overly enthusiastic language. You keep responses natural, conversational, and authentic. You can agree, disagree, or share your own perspective naturally. Stay on the same topic as the original tweet.`
      }
    ];

    if (imageUrls.length > 0) {
      // Use sonar-pro for tweets with images (it can handle both text and images)
      prompt = `You're a real person on Twitter. Look at this tweet and respond naturally like you would to a friend.

TWEET: "${cleanTweetText}"

IMAGES: ${imageUrls.map((img, index) => `Image ${index + 1}: ${img.url}${img.alt ? ` (Alt: "${img.alt}")` : ''}`).join('\n')}

Respond like a real human - be casual, sometimes funny, sometimes sarcastic, sometimes just honest. Don't be formal or news-like. You can:
- Make jokes or witty comments
- Be sarcastic or playful
- Show genuine reactions (surprise, confusion, agreement, etc.)
- Use casual language and slang
- Be brief and to the point
- Sometimes disagree or question things
- Be yourself, not a perfect AI

Keep it between 50-150 characters. Sound like a real person chatting, not a news report.`;

      // Use sonar-pro with image URLs (works reliably)
      const requestBody = {
        model: 'sonar-pro',
        messages: [
          {
            role: 'system',
            content: `${persona}\n\nYou're a real person on Twitter. Be casual, natural, and human. You can be funny, sarcastic, or just honest. Don't sound like a news reporter or AI assistant. Use casual language, make jokes, show real reactions. Be yourself - not perfect or formal.`
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: prompt
              },
              ...imageUrls.map(img => ({
                type: 'image_url',
                image_url: {
                  url: img.url
                }
              }))
            ]
          }
        ],
        max_tokens: 200,
        temperature: 0.8
      };
      
      log(`Sending sonar-pro API request with ${imageUrls.length} images`, profileId);
      log(`Request body: ${JSON.stringify(requestBody, null, 2)}`, profileId);
      
      const visionResponse = await fetch(PERPLEXITY_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${PERPLEXITY_API_KEY}`
        },
        body: JSON.stringify(requestBody)
      });

      if (!visionResponse.ok) {
        throw new Error(`Sonar-pro API error: ${visionResponse.status} - ${visionResponse.statusText}`);
      }

      const visionData = await visionResponse.json();
      let comment = visionData.choices[0].message.content.trim();
      
      log(`Raw sonar-pro AI response: "${comment}"`, profileId);
      
      // Clean up the response (same as text-only)
      comment = comment.replace(/^["']|["']$/g, '');
      comment = comment.replace(/\[\d+\]/g, '');
      comment = comment.replace(/—/g, '-');
      comment = comment.replace(/<think>[\s\S]*?<\/think>/gi, '');
      comment = comment.replace(/^\s*[-•*]\s*/, '');
      comment = comment.replace(/[🎯🔥💯👍❤️😊🤔💪✨🙌👏🎉💡⭐]/g, '');
      comment = comment.replace(/!/g, '');
      comment = comment.trim();
      
      log(`Cleaned sonar-pro AI response: "${comment}"`, profileId);
      
      // Apply the same bot-like detection and fallbacks as text-only
      const botPhrases = [
        'thanks for sharing',
        'great point',
        'interesting perspective',
        'love this',
        'amazing',
        'incredible',
        'absolutely',
        'totally agree',
        'finally stepping out together',
        'interesting to see new connections',
        'public eye',
        'stepping out together'
      ];
      
      const lowerComment = comment.toLowerCase();
      const soundsBotLike = botPhrases.some(phrase => lowerComment.includes(phrase));
      
      if (soundsBotLike) {
        const naturalFallbacks = [
          "yeah that makes sense",
          "not sure about this one",
          "happens to me too",
          "pretty accurate", 
          "never thought of it that way",
          "interesting take",
          "could be right",
          "same here"
        ];
        comment = naturalFallbacks[Math.floor(Math.random() * naturalFallbacks.length)];
        log('Replaced bot-like sonar-pro response with natural fallback', profileId);
      }
      
      // Final validation with random length between 80-140 characters
      const maxLength = Math.floor(Math.random() * 81) + 120; // Random between 120-200
      if (comment.length > maxLength) {
        comment = comment.substring(0, maxLength - 3) + '...';
      }
      
      if (comment.length < 5) {
        const shortFallbacks = [
          "makes sense",
          "fair point", 
          "could be right",
          "interesting",
          "yeah",
          "true"
        ];
        comment = shortFallbacks[Math.floor(Math.random() * shortFallbacks.length)];
      }
      
      log(`Final sonar-pro-based comment: "${comment}"`, profileId);
      return comment;
      
    } else {
      // Text-only analysis (existing logic)
      prompt = `You're a real person on Twitter. Look at this tweet and respond naturally like you would to a friend.

TWEET: "${cleanTweetText}"

Respond like a real human - be casual, sometimes funny, sometimes sarcastic, sometimes just honest. Don't be formal or news-like. You can:
- Make jokes or witty comments
- Be sarcastic or playful
- Show genuine reactions (surprise, confusion, agreement, etc.)
- Use casual language and slang
- Be brief and to the point
- Sometimes disagree or question things
- Be yourself, not a perfect AI

Keep it between 50-150 characters. Sound like a real person chatting, not a news report.`;

    const response = await fetch(PERPLEXITY_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${PERPLEXITY_API_KEY}`
      },
      body: JSON.stringify({
        model: 'sonar-pro', 
        messages: [
          {
            role: 'system',
            content: `${persona}\n\nYou're a real person on Twitter. Be casual, natural, and human. You can be funny, sarcastic, or just honest. Don't sound like a news reporter or AI assistant. Use casual language, make jokes, show real reactions. Be yourself - not perfect or formal.`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 200,
        temperature: 0.8
      })
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status} - ${response.statusText}`);
    }

    const data = await response.json();
    let comment = data.choices[0].message.content.trim();
    
    log(`Raw AI response: "${comment}"`, profileId);
    
    // Clean up the response to make it more human
    comment = comment.replace(/^["']|["']$/g, ''); // Remove quotes
    comment = comment.replace(/\[\d+\]/g, ''); // Remove reference numbers
    comment = comment.replace(/—/g, '-'); // Replace em dashes
    comment = comment.replace(/<think>[\s\S]*?<\/think>/gi, ''); // Remove thinking tags
    comment = comment.replace(/^\s*[-•*]\s*/, ''); // Remove bullet points
    comment = comment.replace(/[🎯🔥💯👍❤️😊🤔💪✨🙌👏🎉💡⭐]/g, ''); // Remove any emojis
    comment = comment.replace(/!/g, ''); // Remove exclamation marks
    comment = comment.trim();
    
    log(`Cleaned AI response: "${comment}"`, profileId);
    
    // Make sure it doesn't sound too bot-like
    const botPhrases = [
      'thanks for sharing',
      'great point',
      'interesting perspective',
      'love this',
      'amazing',
      'incredible',
      'absolutely',
      'totally agree'
    ];
    
    const lowerComment = comment.toLowerCase();
    const soundsBotLike = botPhrases.some(phrase => lowerComment.includes(phrase));
    
    if (soundsBotLike) {
      const naturalFallbacks = [
        "lol yeah",
        "idk about that",
        "same tbh",
        "facts", 
        "never thought of it like that",
        "interesting",
        "could be",
        "same"
      ];
      comment = naturalFallbacks[Math.floor(Math.random() * naturalFallbacks.length)];
      log('Replaced bot-like response with natural fallback', profileId);
    }
    
    // Enhanced relevance validation for text-only
    const tweetWords = cleanTweetText.toLowerCase().split(/\W+/).filter(word => word.length > 2);
    const commentWords = comment.toLowerCase().split(/\W+/).filter(word => word.length > 2);
    
    const sharedWords = tweetWords.filter(tweetWord => 
      commentWords.some(commentWord => 
        commentWord.includes(tweetWord) || tweetWord.includes(commentWord)
      )
    );
    
    const relevanceScore = sharedWords.length / Math.min(tweetWords.length, 10);
    log(`Relevance score: ${relevanceScore.toFixed(2)} (${sharedWords.length} shared / ${Math.min(tweetWords.length, 10)} tweet words)`, profileId);
    
    if (relevanceScore < 0.1 && sharedWords.length === 0) {
      log('AI response seems unrelated, using contextual fallback', profileId);
      
      if (cleanTweetText.includes('?')) {
        comment = "good question";
      } else if (cleanTweetText.toLowerCase().includes('love')) {
        comment = "yeah i feel that";
      } else if (cleanTweetText.toLowerCase().includes('work')) {
        comment = "so true about work";
      } else if (cleanTweetText.toLowerCase().includes('time')) {
        comment = "happens all the time";
      } else {
              const contextualFallbacks = [
        "yeah i see what you mean",
        "that's one way to look at it", 
        "makes sense",
        "fair",
        "could be",
        "interesting"
      ];
        comment = contextualFallbacks[Math.floor(Math.random() * contextualFallbacks.length)];
      }
    }
    
    // Final validation with random length between 80-140 characters
          const maxLength = Math.floor(Math.random() * 81) + 120; // Random between 120-200
    if (comment.length > maxLength) {
      comment = comment.substring(0, maxLength - 3) + '...';
    }
    
    if (comment.length < 5) {
      const shortFallbacks = [
        "makes sense",
        "fair", 
        "could be",
        "interesting",
        "yeah",
        "true"
      ];
      comment = shortFallbacks[Math.floor(Math.random() * shortFallbacks.length)];
    }
    
    log(`Final human-like comment: "${comment}"`, profileId);
    return comment;
    }
    
  } catch (err) {
    log(`Error generating comment: ${err.message}`, profileId);
    // Natural error fallbacks
    const errorFallbacks = [
      "yeah i see what you mean",
      "that's one way to look at it",
      "makes sense",
      "fair",
      "could be",
      "interesting"
    ];
    return errorFallbacks[Math.floor(Math.random() * errorFallbacks.length)];
  }
}

// Helper: Send email notification
async function sendNotification(subject, body) {
  try {
    const transporter = nodemailer.createTransport(EMAIL_CONFIG);
    await transporter.sendMail({
      from: EMAIL_CONFIG.auth.user,
      to: EMAIL_CONFIG.to,
      subject,
      text: body
    });
    log('Notification sent.');
  } catch (err) {
    log(`Failed to send notification: ${err.message}`);
  }
}

// Helper: Wait for any of multiple selectors
async function waitForAnySelector(page, selectors, timeout = 10000) {
  for (let i = 0; i < selectors.length; i++) {
    try {
      await page.waitForSelector(selectors[i], { timeout: timeout / selectors.length });
      return selectors[i];
    } catch (err) {
      continue;
    }
  }
  throw new Error('None of the tweet selectors found');
}

// Helper: Check if logged in
async function checkLoginStatus(page) {
  try {
    // Check for common elements that appear when logged in
    const loginIndicators = [
      'div[data-testid="SideNav_NewTweet_Button"]',
      'a[aria-label="Home"]',
      'div[data-testid="primaryColumn"]',
      'nav[aria-label="Primary"]'
    ];
    
    for (const selector of loginIndicators) {
      const element = await page.$(selector);
      if (element) {
        return true;
      }
    }
    
    // Check current URL for login redirect
    const url = page.url();
    if (url.includes('/login') || url.includes('/i/flow/login')) {
      return false;
    }
    
    return false;
  } catch (err) {
    return false;
  }
}

// Action Functions

// Execute LIKE action
async function executeLikeAction(page, tweet, profileId, options = {}) {
  try {
    log('Executing LIKE action', profileId);
    
    // Handle specific tweet URL for Telegram requests
    if (options.targetSpecificTweet && options.specificTweetUrl) {
      log(`Targeting specific tweet URL: ${options.specificTweetUrl}`, profileId);
      
      // Navigate directly to the specific tweet
      try {
        log(`Attempting to navigate to: ${options.specificTweetUrl}`, profileId);
        await page.goto(options.specificTweetUrl, { 
          waitUntil: 'networkidle2',
          timeout: 30000 
        });
        
        log(`Successfully navigated to specific tweet: ${page.url()}`, profileId);
      } catch (navigationError) {
        log(`Navigation failed: ${navigationError.message}`, profileId);
        throw new Error(`Failed to navigate to tweet URL: ${navigationError.message}. The tweet might be deleted, private, or the URL might be invalid.`);
      }
      
      // Wait for the tweet to load
      await sleep(3000);
      
      // Find the tweet element on the specific tweet page
      log(`Looking for tweet element on the page...`, profileId);
      const tweetElement = await page.$('article[data-testid="tweet"]');
      if (!tweetElement) {
        log(`Tweet element not found. Current page URL: ${page.url()}`, profileId);
        throw new Error('Could not find tweet element on the specific tweet page. The tweet might be deleted, private, or the page structure has changed.');
      }
      
      log(`Tweet element found successfully`, profileId);
      tweet = tweetElement; // Use the found tweet element
    }
    
    let likeClicked = false;
    for (const selector of ACTION_SELECTORS.like) {
      try {
        const likeButton = await tweet.$(selector);
        if (likeButton) {
          // Check if already liked
          const isLiked = await page.evaluate((button) => {
            return button.getAttribute('aria-label')?.includes('Liked') || 
                   button.querySelector('[data-testid="unlike"]') !== null;
          }, likeButton);
          
          if (isLiked) {
            log('Tweet already liked, skipping', profileId);
            return { action: 'like', status: 'already_liked', message: 'Tweet was already liked' };
          }
          
          await likeButton.click();
          likeClicked = true;
          log(`Like button clicked using: ${selector}`, profileId);
          break;
        }
      } catch (err) {
        log(`Like selector ${selector} failed: ${err.message}`, profileId);
        continue;
      }
    }
    
    if (!likeClicked) {
      throw new Error('Could not find like button');
    }
    
    await sleep(1000);
    log('Tweet liked successfully!', profileId);
    return { action: 'like', status: 'success', message: 'Tweet liked successfully' };
    
  } catch (err) {
    log(`Error in like action: ${err.message}`, profileId);
    throw err;
  }
}

// Execute RETWEET action
async function executeRetweetAction(page, tweet, profileId, options = {}) {
  try {
    log('Executing RETWEET action', profileId);
    
    // Handle specific tweet URL for Telegram requests
    if (options.targetSpecificTweet && options.specificTweetUrl) {
      log(`Targeting specific tweet URL: ${options.specificTweetUrl}`, profileId);
      
      // Navigate directly to the specific tweet
      try {
        log(`Attempting to navigate to: ${options.specificTweetUrl}`, profileId);
        await page.goto(options.specificTweetUrl, { 
          waitUntil: 'networkidle2',
          timeout: 30000 
        });
        
        log(`Successfully navigated to specific tweet: ${page.url()}`, profileId);
      } catch (navigationError) {
        log(`Navigation failed: ${navigationError.message}`, profileId);
        throw new Error(`Failed to navigate to tweet URL: ${navigationError.message}. The tweet might be deleted, private, or the URL might be invalid.`);
      }
      
      // Wait for the tweet to load
      await sleep(3000);
      
      // Find the tweet element on the specific tweet page
      log(`Looking for tweet element on the page...`, profileId);
      const tweetElement = await page.$('article[data-testid="tweet"]');
      if (!tweetElement) {
        log(`Tweet element not found. Current page URL: ${page.url()}`, profileId);
        throw new Error('Could not find tweet element on the specific tweet page. The tweet might be deleted, private, or the page structure has changed.');
      }
      
      log(`Tweet element found successfully`, profileId);
      tweet = tweetElement; // Use the found tweet element
    }
    
    // Click retweet button
    let retweetClicked = false;
    for (const selector of ACTION_SELECTORS.retweet) {
      try {
        const retweetButton = await tweet.$(selector);
        if (retweetButton) {
          await retweetButton.click();
          retweetClicked = true;
          log(`Retweet button clicked using: ${selector}`, profileId);
          break;
        }
      } catch (err) {
        log(`Retweet selector ${selector} failed: ${err.message}`, profileId);
        continue;
      }
    }
    
    if (!retweetClicked) {
      throw new Error('Could not find retweet button');
    }
    
    await sleep(2000);
    
    // Look for retweet confirmation dialog and click "Repost"
    const repostSelectors = [
      'div[data-testid="retweetConfirm"]',
      '[data-testid="retweetConfirm"]',
      'div[role="menuitem"]:has-text("Repost")',
      'div[role="menuitem"]',
      'button:has-text("Repost")'
    ];
    
    let repostClicked = false;
    for (const selector of repostSelectors) {
      try {
        await page.waitForSelector(selector, { timeout: 3000 });
        await page.click(selector);
        repostClicked = true;
        log(`Repost confirmation clicked using: ${selector}`, profileId);
        break;
      } catch (err) {
        log(`Repost selector ${selector} not found, trying next...`, profileId);
        continue;
      }
    }
    
    if (!repostClicked) {
      // Try alternative approach - look for any button with "Repost" text
      try {
        const repostButton = await page.evaluateHandle(() => {
          const buttons = Array.from(document.querySelectorAll('div[role="menuitem"], button'));
          return buttons.find(button => 
            button.textContent?.includes('Repost') || 
            button.textContent?.includes('Retweet')
          );
        });
        
        if (repostButton) {
          await repostButton.click();
          repostClicked = true;
          log('Repost clicked using text search', profileId);
        }
      } catch (err) {
        log(`Alternative repost method failed: ${err.message}`, profileId);
      }
    }
    
    if (!repostClicked) {
      log('Could not find repost confirmation - retweet may have been initiated but not confirmed', profileId);
    } else {
      log('Tweet retweeted successfully!', profileId);
    }
    
    await sleep(2000);
    return { action: 'retweet', status: 'success', message: 'Tweet retweeted successfully' };
    
  } catch (err) {
    log(`Error in retweet action: ${err.message}`, profileId);
    throw err;
  }
}

// Execute COMMENT action with text and image analysis
async function executeCommentAction(page, tweet, profile, profileId, tweetText, imageUrls = [], options = {}) {
      try {
      log('Executing COMMENT action with sonar-pro analysis (text + images)', profileId);
    
    // Check if we're targeting a specific tweet URL
    if (options.targetSpecificTweet && options.specificTweetUrl) {
      log(`Targeting specific tweet URL: ${options.specificTweetUrl}`, profileId);
      
      // Navigate directly to the specific tweet with better error handling
      try {
        log(`Attempting to navigate to: ${options.specificTweetUrl}`, profileId);
        await page.goto(options.specificTweetUrl, { 
          waitUntil: 'networkidle2',
          timeout: 30000 
        });
        
        log(`Successfully navigated to specific tweet: ${page.url()}`, profileId);
      } catch (navigationError) {
        log(`Navigation failed: ${navigationError.message}`, profileId);
        throw new Error(`Failed to navigate to tweet URL: ${navigationError.message}. The tweet might be deleted, private, or the URL might be invalid.`);
      }
      
      // Wait for the tweet to load
      await sleep(3000);
      
      // Find the tweet element on the specific tweet page with better error handling
      log(`Looking for tweet element on the page...`, profileId);
      const tweetElement = await page.$('article[data-testid="tweet"]');
      if (!tweetElement) {
        log(`Tweet element not found. Current page URL: ${page.url()}`, profileId);
        throw new Error('Could not find tweet element on the specific tweet page. The tweet might be deleted, private, or the page structure has changed.');
      }
      
      log(`Tweet element found successfully`, profileId);
      
      // Extract tweet text from the specific tweet
      const specificTweetText = await page.evaluate((tweet) => {
        const textSelectors = [
          'div[data-testid="tweetText"]',
          '[data-testid="tweetText"]',
          '.css-1dbjc4n .css-901oao',
          'span[style*="text-overflow"]',
          '.r-37j5jr',
          '[dir="auto"]'
        ];
        
        for (const selector of textSelectors) {
          const textElement = tweet.querySelector(selector);
          if (textElement && textElement.innerText.trim().length > 5) {
            return textElement.innerText.trim();
          }
        }
        return null;
      }, tweetElement);
      
      if (specificTweetText) {
        log(`Extracted text from specific tweet: "${specificTweetText.substring(0, 100)}..."`, profileId);
        tweetText = specificTweetText; // Use the actual tweet text
      }
      
      // Click the reply button directly on the specific tweet page
      const replySelectors = [
        'div[data-testid="reply"]',
        '[data-testid="reply"]',
        'div[aria-label="Reply"]',
        'button[aria-label="Reply"]',
        'div[role="button"][aria-label*="epl"]'
      ];
      
      let replyClicked = false;
      for (const selector of replySelectors) {
        try {
          await page.waitForSelector(selector, { timeout: 5000 });
          await page.click(selector);
          replyClicked = true;
          log(`Reply button clicked using: ${selector}`, profileId);
          break;
        } catch (err) {
          log(`Reply selector ${selector} not found, trying next...`, profileId);
          continue;
        }
      }
      
      if (!replyClicked) {
        throw new Error('Could not find reply button on specific tweet page');
      }
      
      await sleep(2000);
      
      // Generate AI comment using the specific tweet text
      log(`Generating comment for specific tweet: "${tweetText}"`, profileId);
      
      // Check if custom comment is provided
      let aiComment;
      if (options.customComment) {
        log(`Using custom comment: "${options.customComment}"`, profileId);
        aiComment = options.customComment;
      } else {
        aiComment = await generateComment(tweetText, profile.persona, profileId, imageUrls);
      }
      
      // Type comment
      const composeSelectors = [
        'div[aria-label="Tweet text"]',
        'div[role="textbox"]',
        '.public-DraftEditor-content',
        'div[contenteditable="true"]',
        '[data-testid="tweetTextarea_0"]',
        '.notranslate'
      ];
      
      let commentTyped = false;
      for (const selector of composeSelectors) {
        try {
          await page.waitForSelector(selector, { timeout: 5000 });
          await page.click(selector);
          await sleep(500);
          await page.type(selector, aiComment, { delay: 50 });
          commentTyped = true;
          log(`Comment typed using: ${selector}`, profileId);
          break;
        } catch (err) {
          log(`Compose selector ${selector} not found, trying next...`, profileId);
          continue;
        }
      }
      
      if (!commentTyped) {
        throw new Error('Could not find comment text area');
      }
      
      log(`Typed comment: "${aiComment}"`, profileId);
      
      await sleep(3000);
      
      // Post comment
      const postSelectors = [
        'div[data-testid="tweetButton"]',
        '[data-testid="tweetButton"]',
        'div[data-testid="tweetButtonInline"]',
        'button[type="submit"]'
      ];
      
      let postClicked = false;
      for (const selector of postSelectors) {
        try {
          await page.waitForSelector(selector, { timeout: 5000 });
          const isEnabled = await page.evaluate((sel) => {
            const button = document.querySelector(sel);
            return button && !button.disabled && !button.hasAttribute('aria-disabled');
          }, selector);
          
          if (isEnabled) {
            await page.click(selector);
            postClicked = true;
            log(`Post button clicked using: ${selector}`, profileId);
            break;
          } else {
            log(`Post button found but disabled: ${selector}`, profileId);
          }
        } catch (err) {
          log(`Post selector ${selector} not found, trying next...`, profileId);
          continue;
        }
      }
      
      if (!postClicked) {
        log('Could not find enabled post button - comment may have been typed but not posted', profileId);
        return { action: 'comment', status: 'partial', message: 'Comment typed but not posted', comment: aiComment };
      } else {
        log('Comment posted successfully to specific tweet!', profileId);
        
        // Wait a moment for the comment to be posted and get the comment URL
        await sleep(5000); // Increased wait time to ensure comment is fully posted
        
        // Use the helper function to capture the comment URL
        const commentUrl = await captureCommentUrl(page, aiComment, profileId);
        
        return { 
          action: 'comment', 
          status: 'success', 
          message: 'Comment posted successfully to specific tweet', 
          comment: aiComment,
          commentUrl: commentUrl
        };
      }
      
    } else {
      // Original logic for finding tweets on home feed
      log('Using original tweet discovery logic', profileId);
      
      // Find the tweet to click using text search
      log(`Finding tweet to click using text search: "${tweetText.substring(0, 50)}..."`, profileId);
      
      // Wait 1 second as requested
      await sleep(1000);
      
      // Find the tweet again by searching for the text
      const allTweets = await page.$$('article[data-testid="tweet"]');
      let targetTweet = null;
      
      for (let i = 0; i < allTweets.length; i++) {
        try {
          const currentTweetText = await page.evaluate((el) => {
            const textSelectors = [
              'div[data-testid="tweetText"]',
              '[data-testid="tweetText"]',
              '.css-1dbjc4n .css-901oao',
              'span[style*="text-overflow"]',
              '.r-37j5jr',
              '[dir="auto"]'
            ];
            
            for (const selector of textSelectors) {
              const textElement = el.querySelector(selector);
              if (textElement && textElement.innerText.trim().length > 5) {
                return textElement.innerText.trim();
              }
            }
            return null;
          }, allTweets[i]);
          
          if (currentTweetText && currentTweetText.includes(tweetText.substring(0, 20))) {
            targetTweet = allTweets[i];
            log(`✅ Found target tweet to click: "${currentTweetText.substring(0, 50)}..."`, profileId);
            break;
          }
        } catch (searchErr) {
          continue;
        }
      }
      
      if (!targetTweet) {
        throw new Error(`Could not find tweet with text: "${tweetText.substring(0, 50)}..."`);
      }
      
      // Click the found tweet to open it for replying
      log(`Clicking found tweet to open for replying...`, profileId);
      
      // Simple click approach - much more reliable
      let clickSuccess = false;
      
      try {
        await targetTweet.click();
        clickSuccess = true;
        log(`✅ Tweet clicked successfully`, profileId);
      } catch (clickErr) {
        log(`First click failed: ${clickErr.message}, trying one more time...`, profileId);
        await sleep(1000);
        
        // Find the tweet one more time for retry
        const retryTweets = await page.$$('article[data-testid="tweet"]');
        let retryTarget = null;
        
        for (let retryTweet of retryTweets) {
          try {
            const retryText = await page.evaluate((el) => {
              const textElement = el.querySelector('[data-testid="tweetText"]');
              return textElement ? textElement.innerText.trim() : null;
            }, retryTweet);
            
            if (retryText && retryText.includes(tweetText.substring(0, 20))) {
              retryTarget = retryTweet;
              log(`Found tweet for retry: "${retryText.substring(0, 30)}..."`, profileId);
              break;
            }
          } catch (retrySearchErr) {
            continue;
          }
        }
        
        if (retryTarget) {
          try {
            await retryTarget.click();
            clickSuccess = true;
            log(`✅ Tweet clicked successfully on retry`, profileId);
          } catch (retryClickErr) {
            throw new Error(`Could not click tweet after retry: ${retryClickErr.message}`);
          }
        } else {
          throw new Error(`Could not find tweet for retry click`);
        }
      }
      
      if (!clickSuccess) {
        throw new Error('Failed to click tweet');
      }
      
      await sleep(3000);
      
      // After clicking, re-verify the tweet text to ensure accuracy
      const clickedTweetText = await page.evaluate(() => {
        // Look for tweet text in the expanded/focused tweet view
        const expandedSelectors = [
          'div[data-testid="tweetText"]',
          '[data-testid="tweetText"]',
          'article[data-testid="tweet"] div[data-testid="tweetText"]',
          'div[role="article"] div[data-testid="tweetText"]'
        ];
        
        for (const selector of expandedSelectors) {
          const elements = document.querySelectorAll(selector);
          for (const element of elements) {
            const text = element.innerText?.trim();
            if (text && text.length > 10) {
              return text;
            }
          }
        }
        
        return null;
      });
      
      // Use the clicked tweet text if it's more accurate, but detect critical mismatches
      let finalTweetText = tweetText;
      if (clickedTweetText && clickedTweetText.length > 10) {
        if (clickedTweetText !== tweetText) {
          
          // Check if this is a minor difference (truncation, etc.) or a completely different tweet
          const originalWords = tweetText.toLowerCase().split(/\W+/).filter(w => w.length > 3);
          const clickedWords = clickedTweetText.toLowerCase().split(/\W+/).filter(w => w.length > 3);
          const sharedWords = originalWords.filter(word => clickedWords.includes(word));
          const similarity = sharedWords.length / Math.max(originalWords.length, clickedWords.length);
          
          if (similarity < 0.2) {
            // This is a completely different tweet - critical error!
            log(`CRITICAL ERROR: Clicked wrong tweet! Similarity: ${similarity.toFixed(2)}`, profileId);
            log(`Original selected: "${tweetText}"`, profileId);
            log(`Actually opened: "${clickedTweetText}"`, profileId);
            
            throw new Error(`Tweet mismatch: Selected "${tweetText.substring(0, 50)}..." but opened "${clickedTweetText.substring(0, 50)}...". This would result in an inappropriate response.`);
          } else {
            // Minor difference, probably just truncation or formatting
            log(`Tweet text updated after clicking (minor difference, similarity: ${similarity.toFixed(2)})`, profileId);
            log(`Original: "${tweetText}"`, profileId);
            log(`After click: "${clickedTweetText}"`, profileId);
            finalTweetText = clickedTweetText;
          }
          
          // Add additional logging for debugging
          log(`Tweet verification passed with similarity: ${similarity.toFixed(2)}`, profileId);
        } else {
          log(`Tweet text confirmed after clicking: "${clickedTweetText}"`, profileId);
        }
      }
      
      // Find and click reply button
      let replyClicked = false;
      for (const selector of ACTION_SELECTORS.reply) {
        try {
          await page.waitForSelector(selector, { timeout: 3000 });
          await page.click(selector);
          replyClicked = true;
          log(`Reply button clicked using: ${selector}`, profileId);
          break;
        } catch (err) {
          log(`Reply selector ${selector} not found, trying next...`, profileId);
          continue;
        }
      }
      
      if (!replyClicked) {
        throw new Error('Could not find reply button');
      }
      
      await sleep(2000);

      // Generate AI comment using both text and image analysis
      log(`Generating comment using text and image analysis for: "${finalTweetText}"`, profileId);
      
      // Check if custom comment is provided
      let aiComment;
      if (options.customComment) {
        log(`Using custom comment: "${options.customComment}"`, profileId);
        aiComment = options.customComment;
      } else {
        aiComment = await generateComment(finalTweetText, profile.persona, profileId, imageUrls);
      }

      // Type comment
      const composeSelectors = [
        'div[aria-label="Tweet text"]',
        'div[role="textbox"]',
        '.public-DraftEditor-content',
        'div[contenteditable="true"]',
        '[data-testid="tweetTextarea_0"]',
        '.notranslate'
      ];
      
      let commentTyped = false;
      for (const selector of composeSelectors) {
        try {
          await page.waitForSelector(selector, { timeout: 3000 });
          await page.click(selector);
          await sleep(500);
          await page.type(selector, aiComment, { delay: 50 });
          commentTyped = true;
          log(`Comment typed using: ${selector}`, profileId);
          break;
        } catch (err) {
          log(`Compose selector ${selector} not found, trying next...`, profileId);
          continue;
        }
      }
      
      if (!commentTyped) {
        throw new Error('Could not find comment text area');
      }
      
      log(`Typed text-based comment: "${aiComment}"`, profileId);

      await sleep(3000);
      
      // Post comment
      const postSelectors = [
        'div[data-testid="tweetButton"]',
        '[data-testid="tweetButton"]',
        'div[data-testid="tweetButtonInline"]',
        'button[type="submit"]'
      ];
      
      let postClicked = false;
      for (const selector of postSelectors) {
        try {
          await page.waitForSelector(selector, { timeout: 3000 });
          const isEnabled = await page.evaluate((sel) => {
            const button = document.querySelector(sel);
            return button && !button.disabled && !button.hasAttribute('aria-disabled');
          }, selector);
          
          if (isEnabled) {
            await page.click(selector);
            postClicked = true;
            log(`Post button clicked using: ${selector}`, profileId);
            break;
          } else {
            log(`Post button found but disabled: ${selector}`, profileId);
          }
        } catch (err) {
          log(`Post selector ${selector} not found, trying next...`, profileId);
          continue;
        }
      }
      
      if (!postClicked) {
        log('Could not find enabled post button - comment may have been typed but not posted', profileId);
        return { action: 'comment', status: 'partial', message: 'Comment typed but not posted', comment: aiComment };
      } else {
        log('Text-based comment posted successfully!', profileId);
        
        // Wait a moment for the comment to be posted and get the comment URL
        await sleep(5000); // Increased wait time to ensure comment is fully posted
        
        // Use the helper function to capture the comment URL
        const commentUrl = await captureCommentUrl(page, aiComment, profileId);
        
        return { 
          action: 'comment', 
          status: 'success', 
          message: 'Text-based comment posted successfully', 
          comment: aiComment,
          commentUrl: commentUrl
        };
      }
    }
    
  } catch (err) {
    log(`Error in comment action: ${err.message}`, profileId);
    throw err;
  }
}

// Core Automation Function - Modified for multi-action support
async function automateTwitterWithAI(profile, actionType = null, options = {}) {
  let browser;
  const profileId = profile.id;
  
  try {
    log(`Starting automation for profile: ${profileId}`, profileId);
    updateScheduleStatus(profileId, 'running');

    // Check if this is a Telegram request (bypass cooldown)
    const isTelegramRequest = options.telegramChatId || options.bypassTelegram;
    if (isTelegramRequest) {
      log('Telegram request detected - bypassing cooldown checks', profileId);
    } else {
      // For non-Telegram requests, check cooldown
      if (!canExecuteNow(false)) {
        const timeRemaining = Math.round(MIN_EXECUTION_INTERVAL - ((new Date().getTime() - lastExecutionTime.getTime()) / (1000 * 60)));
        log(`Global cooldown active - ${timeRemaining} minutes remaining until next execution allowed`, profileId);
        throw new Error(`Global cooldown active - ${timeRemaining} minutes remaining`);
      }
    }

    // Determine action type (parameter takes priority over schedule)
    if (!actionType) {
      // Only read from schedule if no action type was provided as parameter
      try {
        const scheduleData = JSON.parse(fs.readFileSync(SCHEDULE_FILE, 'utf8'));
        const profileSchedule = scheduleData.profiles.find(p => p.profileId === profileId);
        actionType = profileSchedule?.actionType || 'comment';
        log(`Action type read from schedule: ${actionType}`, profileId);
      } catch (err) {
        log(`Error reading schedule for action type, defaulting to comment: ${err.message}`, profileId);
        actionType = 'comment';
      }
    } else {
      log(`Action type provided as parameter: ${actionType}`, profileId);
    }

    // Validate action type
    if (!ACTION_TYPES.includes(actionType)) {
      log(`Invalid action type '${actionType}', defaulting to comment`, profileId);
      actionType = 'comment';
    }

    log(`Executing ${actionType.toUpperCase()} action`, profileId);

    // Start AdsPower profile with timeout handling
    const startUrl = `${ADS_LOCAL_URL}/api/v1/browser/start?user_id=${profile.adspower_id}`;
    let wsEndpoint;
    
    try {
      // Use AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
      
      const startResponse = await fetch(startUrl, { 
        signal: controller.signal 
      });
      clearTimeout(timeoutId);
      
      if (!startResponse.ok) throw new Error(`Failed to start profile: ${startResponse.statusText}`);
      const startData = await startResponse.json();
      if (startData.code !== 0) throw new Error(`AdsPower error: ${startData.msg}`);
      wsEndpoint = startData.data.ws.puppeteer;
      log('AdsPower profile started successfully.', profileId);
    } catch (error) {
      if (error.name === 'AbortError') {
        log('AdsPower connection timed out after 30 seconds', profileId);
        throw new Error('AdsPower connection timed out. Please check if AdsPower is running.');
      }
      log(`AdsPower connection failed: ${error.message}`, profileId);
      throw new Error(`Failed to start AdsPower profile: ${error.message}`);
    }

    // Connect Puppeteer with timeout handling
    let page;
    try {
      browser = await puppeteer.connect({ 
        browserWSEndpoint: wsEndpoint, 
        defaultViewport: null 
      });
      page = await browser.newPage();
      log('Puppeteer connected to browser.', profileId);
    } catch (error) {
      log(`Puppeteer connection failed: ${error.message}`, profileId);
      throw new Error(`Failed to connect to browser: ${error.message}`);
    }

    // Navigate to X.com with extended timeout and retry logic
    let navigationSuccess = false;
    let retryCount = 0;
    const maxRetries = 3;
    
    // Determine navigation URL
    let navigationUrl = 'https://x.com/home';
    if (options.targetUrl) {
      navigationUrl = options.targetUrl;
      log(`Using target URL: ${navigationUrl}`, profileId);
    }
    
    while (!navigationSuccess && retryCount < maxRetries) {
      try {
        await page.goto(navigationUrl, { 
          waitUntil: 'networkidle2',
          timeout: 60000 // 60 seconds timeout
        });
        navigationSuccess = true;
        log(`Navigated to: ${page.url()}`, profileId);
      } catch (error) {
        retryCount++;
        log(`Navigation attempt ${retryCount} failed: ${error.message}`, profileId);
        
        if (retryCount >= maxRetries) {
          throw new Error(`Failed to navigate to X.com after ${maxRetries} attempts: ${error.message}`);
        }
        
        // Wait before retrying
        await sleep(5000);
      }
    }

    // Check if logged in
    const isLoggedIn = await checkLoginStatus(page);
    if (!isLoggedIn) {
      throw new Error('Not logged in to X.com. Please log in manually in AdsPower profile.');
    }
    log('Login status verified.', profileId);

    // Wait for page to fully load
    await sleep(3000);



    // Sophisticated human-like scrolling with random pauses and natural behavior
    log('Starting sophisticated human-like scrolling behavior...', profileId);
    
    const scrollCount = Math.floor(Math.random() * 11) + 5; // 5-15 scrolls
    let meaningfulInteractions = 0;
    const maxInteractions = Math.floor(Math.random() * 3) + 2; // 2-4 interactions
    
    for (let i = 0; i < scrollCount; i++) {
      // Random scroll distance (100-400px)
      const scrollDistance = Math.floor(Math.random() * 301) + 100;
      
      await page.evaluate((distance) => {
        window.scrollBy(0, distance);
      }, scrollDistance);
      
      log(`Scroll ${i + 1}/${scrollCount}: Scrolled ${scrollDistance}px`, profileId);
      
      // Random pause between scrolls (1-5 seconds)
      const pauseTime = Math.floor(Math.random() * 4000) + 1000;
      await sleep(pauseTime);
      
      // Occasionally perform meaningful interactions (2-4 times per session)
      if (meaningfulInteractions < maxInteractions && Math.random() < 0.3) {
        try {
          // Find clickable elements for meaningful interactions
          const interactionElements = await page.evaluate(() => {
            const elements = [];
            
            // Look for tweet detail links
            const tweetLinks = document.querySelectorAll('a[href*="/status/"]');
            tweetLinks.forEach(link => {
              if (link.offsetParent !== null) { // Check if visible
                elements.push({
                  type: 'tweet_detail',
                  element: link,
                  href: link.href
                });
              }
            });
            
            // Look for profile links
            const profileLinks = document.querySelectorAll('a[href*="/status/"]');
            profileLinks.forEach(link => {
              if (link.offsetParent !== null && link.href.includes('/status/')) {
                const profileMatch = link.href.match(/https:\/\/twitter\.com\/([^\/]+)/);
                if (profileMatch) {
                  elements.push({
                    type: 'profile_visit',
                    element: link,
                    href: link.href,
                    profile: profileMatch[1]
                  });
                }
              }
            });
            
            return elements;
          });
          
                    // Check if interactionElements is defined and has length property
          if (interactionElements && Array.isArray(interactionElements) && interactionElements.length > 0) {
            const randomElement = interactionElements[Math.floor(Math.random() * interactionElements.length)];
            
            if (randomElement.type === 'tweet_detail') {
              // Open tweet detail (but don't navigate away)
              await page.evaluate((element) => {
                element.click();
              }, randomElement.element);
              log(`Meaningful interaction ${meaningfulInteractions + 1}/${maxInteractions}: Opened tweet detail`, profileId);
            } else if (randomElement.type === 'profile_visit') {
              // Visit profile (but don't navigate away)
              await page.evaluate((element) => {
                element.click();
              }, randomElement.element);
              log(`Meaningful interaction ${meaningfulInteractions + 1}/${maxInteractions}: Visited profile @${randomElement.profile}`, profileId);
            }
            
            meaningfulInteractions++;
            
            // Pause after interaction to simulate reading
            await sleep(Math.floor(Math.random() * 3000) + 2000);
          }
        } catch (error) {
          log(`Error during meaningful interaction: ${error.message}`, profileId);
        }
      }
    }
    
    log(`Completed ${scrollCount} scrolls with ${meaningfulInteractions} meaningful interactions`, profileId);
    await sleep(2000);

    // Skip random tweet selection for Telegram requests (targetSpecificTweet)
    if (options.targetSpecificTweet) {
      log(`Skipping random tweet selection for Telegram request - will target specific tweet directly`, profileId);
      
      // Create a dummy selectedTweet object for the action execution
      const selectedTweet = {
        element: null, // Will be set in the specific action functions
        text: '', // Will be set in the specific action functions
        images: []
      };
      
      log(`About to execute ${actionType.toUpperCase()} action - final confirmation`, profileId);
      let actionResult;
      switch (actionType) {
        case 'like':
          log(`Entering LIKE action execution`, profileId);
          actionResult = await executeLikeAction(page, null, profileId, options);
          break;
        case 'retweet':
          log(`Entering RETWEET action execution`, profileId);
          actionResult = await executeRetweetAction(page, null, profileId, options);
          break;
        case 'comment':
          log(`Entering COMMENT action execution`, profileId);
          actionResult = await executeCommentAction(page, null, profile, profileId, '', [], options);
          break;
        default:
          throw new Error(`Unknown action type: ${actionType}`);
      }
      
      log(`${actionType.toUpperCase()} action completed with status: ${actionResult.status}`, profileId);
      await sleep(3000);

      // Clean up for Telegram requests
      await browser.disconnect();
      
      // Stop AdsPower profile
      await fetch(`${ADS_LOCAL_URL}/api/v1/browser/stop?user_id=${profile.adspower_id}`);
      log('AdsPower profile stopped. Automation completed successfully.', profileId);
      
      const result = { 
        success: true, 
        profileId, 
        actionType, 
        actionResult,
        comment: actionResult.comment || null,
        commentUrl: actionResult.commentUrl || null,
        tweet: selectedTweet.text 
      };
      updateScheduleStatus(profileId, 'completed', null, result);
      
      return result;
    }

    // Try to find tweets with multiple selectors (only for regular automation)
    const workingSelector = await waitForAnySelector(page, TWEET_SELECTORS, 15000);
    const tweets = await page.$$(workingSelector);
    
    if (tweets.length === 0) {
      const pageContent = await page.content();
      fs.writeFileSync(`debug-page-${profileId}.html`, pageContent);
      throw new Error('No tweets found after trying all selectors. Page content saved to debug file');
    }
    
    log(`Found ${tweets.length} tweets using selector: ${workingSelector}`, profileId);

    // Filter tweets with actual content and extract text more accurately
    let validTweets = [];
    for (let i = 0; i < Math.min(tweets.length, 10); i++) {
      try {
        // Check if this is an ad or promotional content first
        // Skip this check for Telegram requests since user provides direct link
        if (!options.targetSpecificTweet) {
          const isAd = await page.evaluate((tweet) => {
            // Check for ad indicators
            const adIndicators = [
              '[data-testid="promotedIndicator"]',
              '[aria-label*="Promoted"]',
              '[data-testid="socialContext"]',
              '.r-1tl8opc', // Common ad class
              '[data-testid="placementTracking"]'
            ];
            
            for (const indicator of adIndicators) {
              if (tweet.querySelector(indicator)) {
                return true;
              }
            }
            
            // Check for promotional text patterns
            const tweetText = tweet.innerText || tweet.textContent || '';
            const promotionalPatterns = [
              /promoted/i,
              /sponsored/i,
              /advertisement/i,
              /register.*webinar/i,
              /sign up.*free/i,
              /upgrade.*premium/i,
              /subscribe.*now/i,
              /limited.*offer/i,
              /click.*link/i,
              /visit.*website/i,
              /download.*app/i,
              /get.*discount/i,
              /special.*deal/i,
              /buy.*now/i,
              /order.*today/i,
              /save.*\d+%/i,
              /free.*trial/i,
              /learn.*more/i,
              /register.*to/i
            ];
            
            return promotionalPatterns.some(pattern => pattern.test(tweetText));
          }, tweets[i]);
          
          if (isAd) {
            log(`Tweet ${i + 1} detected as ad/promotional content, skipping`, profileId);
            continue;
          }
        }
        
        // Check for external links
        // Skip this check for Telegram requests since user provides direct link
        if (!options.targetSpecificTweet) {
          const hasExternalLinks = await page.evaluate((tweet) => {
            const links = tweet.querySelectorAll('a[href]');
            for (const link of links) {
              const href = link.getAttribute('href');
              // Skip if it's an external link (not twitter/x.com internal)
              if (href && !href.includes('twitter.com') && !href.includes('x.com') && !href.startsWith('/') && !href.startsWith('#')) {
                return true;
              }
            }
            return false;
          }, tweets[i]);
          
          if (hasExternalLinks) {
            log(`Tweet ${i + 1} contains external links, skipping`, profileId);
            continue;
          }
        }
        
        // Extract text and images from the specific tweet element
        const tweetData = await page.evaluate((tweet) => {
          const textSelectors = [
            'div[data-testid="tweetText"]',
            '[data-testid="tweetText"]',
            '.css-1dbjc4n .css-901oao',
            'span[style*="text-overflow"]',
            '.r-37j5jr',
            '[dir="auto"]'
          ];
          
          // Extract text
          let tweetText = null;
          for (const selector of textSelectors) {
            const textElement = tweet.querySelector(selector);
            if (textElement && textElement.innerText.trim().length > 10) {
              tweetText = textElement.innerText.trim();
              break;
            }
          }
          
          // Fallback: get all text content from the tweet, but filter out UI elements
          if (!tweetText) {
            const allText = tweet.innerText || tweet.textContent || '';
            const lines = allText.split('\n').filter(line => {
              const trimmed = line.trim();
              // Filter out common UI elements and metadata
              return trimmed.length > 10 && 
                     !trimmed.match(/^\d+[hms]$/) && // timestamps like "2h", "30m"
                     !trimmed.match(/^[\d,]+$/) && // numbers like "1,234"
                     !trimmed.includes('Show this thread') &&
                     !trimmed.includes('Translate') &&
                     !trimmed.includes('Show more') &&
                     !trimmed.includes('Reply') &&
                     !trimmed.includes('Repost') &&
                     !trimmed.includes('Like') &&
                     !trimmed.includes('Bookmark') &&
                     !trimmed.includes('Share');
            });
            
            // Return the first substantial line of text
            tweetText = lines.length > 0 ? lines[0].trim() : null;
          }
          
          // Extract images
          const imageSelectors = [
            'img[src*="pbs.twimg.com"]', // Twitter's image CDN
            'img[src*="media"]', // Media images
            'img[alt*="Image"]', // Images with alt text
            'img[data-testid="tweetPhoto"]', // Tweet photos
            'img[src*="twimg"]', // Any Twitter image
            'img[src*="http"]' // Any external image
          ];
          
          const images = [];
          for (const selector of imageSelectors) {
            const imgElements = tweet.querySelectorAll(selector);
            for (const img of imgElements) {
              const src = img.getAttribute('src');
              if (src && src.startsWith('http') && !src.includes('profile_images')) {
                // Filter out emoji SVGs and other non-image content
                if (src.includes('emoji/v2/svg/') || 
                    src.includes('emoji/v2/72x72/') ||
                    src.includes('emoji/v2/color/') ||
                    src.includes('emoji/v2/') ||
                    src.endsWith('.svg') ||
                    src.includes('abs-0.twimg.com/emoji')) {
                  continue;
                }
                
                // Only include actual image files
                if (src.includes('pbs.twimg.com/media/') || 
                    src.includes('format=jpg') || 
                    src.includes('format=png') ||
                    src.includes('format=webp')) {
                  // Get the highest quality version of the image
                  let highQualityUrl = src;
                  if (src.includes('pbs.twimg.com')) {
                    // Twitter images can have different sizes, try to get the largest
                    highQualityUrl = src.replace(/&name=\w+/, '&name=large');
                  }
                  images.push({
                    url: highQualityUrl,
                    alt: img.getAttribute('alt') || '',
                    width: img.getAttribute('width') || '',
                    height: img.getAttribute('height') || ''
                  });
                }
              }
            }
          }
          
          // Remove duplicates
          const uniqueImages = images.filter((img, index, self) => 
            index === self.findIndex(t => t.url === img.url)
          );
          
          return {
            text: tweetText,
            images: uniqueImages
          };
        }, tweets[i]);
        
        const tweetText = tweetData.text;
        const tweetImages = tweetData.images;
        
        // Additional text-based filtering for promotional content
        // Skip this check for Telegram requests since user provides direct link
        if (!options.targetSpecificTweet && tweetText) {
          const promotionalKeywords = [
            'upgrade to premium', 'subscribe now', 'limited offer', 'click here',
            'visit our website', 'download now', 'get discount', 'special deal',
            'buy now', 'order today', 'free trial', 'register to', 'sign up',
            'webinar', 'sponsored', 'advertisement', 'promoted'
          ];
          
          const isPromotional = promotionalKeywords.some(keyword => 
            tweetText.toLowerCase().includes(keyword.toLowerCase())
          );
          
          if (isPromotional) {
            log(`Tweet ${i + 1} contains promotional keywords, skipping: "${tweetText.substring(0, 50)}..."`, profileId);
            continue;
          }
        }
        
        if (tweetText && tweetText.length > 10) {
          validTweets.push({ 
            element: tweets[i], 
            text: tweetText,
            images: tweetImages
          });
          log(`Tweet ${i + 1} extracted text: "${tweetText.substring(0, 100)}${tweetText.length > 100 ? '...' : ''}"`, profileId);
          if (tweetImages.length > 0) {
            log(`Tweet ${i + 1} has ${tweetImages.length} images`, profileId);
          }
        } else {
          log(`Tweet ${i + 1} had no valid text content`, profileId);
        }
      } catch (err) {
        log(`Error extracting text from tweet ${i + 1}: ${err.message}`, profileId);
        continue;
      }
    }

    if (validTweets.length === 0) {
      throw new Error('No valid tweets with text content found');
    }

    // Select a random valid tweet
    const randomIndex = Math.floor(Math.random() * validTweets.length);
    const selectedTweet = validTweets[randomIndex];
    
    // Final safety check - verify this isn't an ad before proceeding
    // Skip this check for Telegram requests since user provides direct link
    if (!options.targetSpecificTweet) {
      const isFinalAd = await page.evaluate((tweet) => {
        const tweetText = tweet.innerText || tweet.textContent || '';
        const adKeywords = ['promoted', 'sponsored', 'advertisement', 'upgrade to premium', 'subscribe', 'webinar', 'register to'];
        return adKeywords.some(keyword => tweetText.toLowerCase().includes(keyword.toLowerCase()));
      }, selectedTweet.element);
      
      if (isFinalAd) {
        log(`Final safety check: Selected tweet is promotional content, aborting automation`, profileId);
        throw new Error('Selected tweet is promotional content - safety abort');
      }
    } else {
      log(`Skipping promotional content check for Telegram direct link request`, profileId);
    }
    
    log(`Selected tweet ${randomIndex + 1} of ${validTweets.length} valid tweets.`, profileId);
    log(`Selected tweet full content: "${selectedTweet.text}"`, profileId);

    // Double-check: Re-extract text from the selected tweet element to ensure accuracy
    const verifiedTweetText = await page.evaluate((tweet) => {
      const textSelectors = [
        'div[data-testid="tweetText"]',
        '[data-testid="tweetText"]',
        '.css-1dbjc4n .css-901oao',
        'span[style*="text-overflow"]',
        '.r-37j5jr',
        '[dir="auto"]'
      ];
      
      for (const selector of textSelectors) {
        const textElement = tweet.querySelector(selector);
        if (textElement && textElement.innerText.trim().length > 10) {
          return textElement.innerText.trim();
        }
      }
      
      // Fallback to filtered content
      const allText = tweet.innerText || tweet.textContent || '';
      const lines = allText.split('\n').filter(line => {
        const trimmed = line.trim();
        return trimmed.length > 10 && 
               !trimmed.match(/^\d+[hms]$/) && 
               !trimmed.match(/^[\d,]+$/) && 
               !trimmed.includes('Show this thread') &&
               !trimmed.includes('Translate') &&
               !trimmed.includes('Show more') &&
               !trimmed.includes('Reply') &&
               !trimmed.includes('Repost') &&
               !trimmed.includes('Like') &&
               !trimmed.includes('Bookmark') &&
               !trimmed.includes('Share');
      });
      
      return lines.length > 0 ? lines[0].trim() : '';
    }, selectedTweet.element);

    // Use the verified text if it's different and more accurate
    if (verifiedTweetText && verifiedTweetText.length > 10 && verifiedTweetText !== selectedTweet.text) {
      log(`Verified tweet text differs from initial extraction`, profileId);
      log(`Initial: "${selectedTweet.text}"`, profileId);
      log(`Verified: "${verifiedTweetText}"`, profileId);
      selectedTweet.text = verifiedTweetText;
    }

    log(`Final tweet text for ${actionType}: "${selectedTweet.text}"`, profileId);

    // Execute the specified action
    log(`About to execute ${actionType.toUpperCase()} action - final confirmation`, profileId);
    let actionResult;
    switch (actionType) {
      case 'like':
        log(`Entering LIKE action execution`, profileId);
        actionResult = await executeLikeAction(page, selectedTweet.element, profileId, options);
        break;
      case 'retweet':
        log(`Entering RETWEET action execution`, profileId);
        actionResult = await executeRetweetAction(page, selectedTweet.element, profileId, options);
        break;
              case 'comment':
          log(`Entering COMMENT action execution`, profileId);
          actionResult = await executeCommentAction(page, selectedTweet.element, profile, profileId, selectedTweet.text, selectedTweet.images, options);
          break;
      default:
        throw new Error(`Unknown action type: ${actionType}`);
    }
    
    log(`${actionType.toUpperCase()} action completed with status: ${actionResult.status}`, profileId);

    await sleep(3000);

    // Clean up
    await browser.disconnect();
    
    // Stop AdsPower profile
    await fetch(`${ADS_LOCAL_URL}/api/v1/browser/stop?user_id=${profile.adspower_id}`);
    log('AdsPower profile stopped. Automation completed successfully.', profileId);
    
    const result = { 
      success: true, 
      profileId, 
      actionType, 
      actionResult,
      comment: actionResult.comment || null,
      commentUrl: actionResult.commentUrl || null,
      tweet: selectedTweet.text 
    };
    updateScheduleStatus(profileId, 'completed', null, result);
    
    // Send success notification
    await sendNotification(
      `Twitter AI Automation Success - ${profileId}`,
      `Profile: ${profileId}\nAction: ${actionType.toUpperCase()}\nStatus: ${actionResult.status}\nMessage: ${actionResult.message}\n\nTweet: "${selectedTweet.text}"\n${actionResult.comment ? `\nComment: "${actionResult.comment}"` : ''}`
    );

    return result;

  } catch (err) {
    log(`Error in automation: ${err.message}`, profileId);
    updateScheduleStatus(profileId, 'failed', err.message);
    
    // Clean up on error
    if (browser) {
      try {
        await browser.disconnect();
      } catch (cleanupErr) {
        log(`Error during cleanup: ${cleanupErr.message}`, profileId);
      }
    }
    
    // Stop profile on error
    try {
      await fetch(`${ADS_LOCAL_URL}/api/v1/browser/stop?user_id=${profile.adspower_id}`);
    } catch (stopErr) {
      log(`Error stopping profile: ${stopErr.message}`, profileId);
    }
    
    await sendNotification(`Twitter AI Automation Error - ${profileId}`, `Profile: ${profileId}\nAction: ${actionType}\nError occurred: ${err.message}`);
    return { success: false, profileId, actionType, error: err.message };
  }
}

// Schedule checker - runs every minute to check for due profiles
async function checkSchedule() {
  // Check if this is an immediate run (ignore cooldowns for immediate runs)
  const isImmediateRun = currentSchedule && currentSchedule.version === '1.0-immediate';
  
  // Check global execution interval (skip for immediate runs)
  if (!isImmediateRun && !canExecuteNow()) {
    const timeSinceLastExecution = Math.round((new Date().getTime() - lastExecutionTime.getTime()) / 1000 / 60);
    const timeRemaining = MIN_EXECUTION_INTERVAL - timeSinceLastExecution;
    log(`Global cooldown active - ${timeRemaining} minutes remaining until next execution allowed`);
    return;
  }
  
  const nextProfile = getNextScheduledProfile(isImmediateRun);
  
  if (nextProfile) {
    log(`Found scheduled profile ready to run: ${nextProfile.profileId} (${nextProfile.actionType.toUpperCase()})${isImmediateRun ? ' [IMMEDIATE RUN]' : ''}`);
    
    // Find the actual profile data
    const profile = profiles.find(p => p.id === nextProfile.profileId);
    if (profile) {
      // Mark profile as executing to prevent duplicates
      markProfileExecuting(nextProfile.profileId);
      
      // Execute immediately without delay
      log(`Starting automation immediately for ${profile.id}`, profile.id);
      
      try {
        await automateTwitterWithAI(profile, nextProfile.actionType);
      } finally {
        // Always mark execution complete, even if it failed
        markProfileExecutionComplete(nextProfile.profileId);
      }
    } else {
      log(`Profile data not found for ${nextProfile.profileId}`);
      updateScheduleStatus(nextProfile.profileId, 'failed', 'Profile data not found');
    }
  }
}

// Run automation for a random profile with random action (with cooldown checks)
async function runRandomProfileAutomation() {
  // Check global execution interval
  if (!canExecuteNow()) {
    const timeSinceLastExecution = Math.round((new Date().getTime() - lastExecutionTime.getTime()) / 1000 / 60);
    const timeRemaining = MIN_EXECUTION_INTERVAL - timeSinceLastExecution;
    log(`Random execution skipped - global cooldown active (${timeRemaining} minutes remaining)`);
    return;
  }
  
  if (profiles.length === 0) {
    log('No active profiles available for automation');
    return;
  }
  
  // Find available profiles (not in cooldown or executing)
  const availableProfiles = profiles.filter(profile => isProfileAvailable(profile.id));
  
  if (availableProfiles.length === 0) {
    log('No profiles available for random execution - all in cooldown or executing');
    return;
  }
  
  // Select a random available profile and ALWAYS use COMMENT for immediate execution
  const randomIndex = Math.floor(Math.random() * availableProfiles.length);
  const selectedProfile = availableProfiles[randomIndex];
  const randomAction = 'comment'; // ALWAYS comment for immediate execution - as agreed!
  
  log(`Selected random profile: ${selectedProfile.id} for ${randomAction.toUpperCase()} action (immediate execution always uses COMMENT)`);
  
  // Mark profile as executing
  markProfileExecuting(selectedProfile.id);
  
  // Execute immediately without delay
  log(`Starting automation immediately for ${selectedProfile.id}`);
  
  try {
    await automateTwitterWithAI(selectedProfile, randomAction);
  } finally {
    // Always mark execution complete, even if it failed
    markProfileExecutionComplete(selectedProfile.id);
  }
}

// Run automation for all profiles with staggered timing and random actions (disabled to prevent spam)
async function runAllProfilesAutomation() {
  log('Mass profile execution disabled to prevent spam. Use individual scheduling instead.');
  return;
}

// Reset completed profiles to allow them to run again
function resetCompletedProfiles() {
  try {
    if (!fs.existsSync(SCHEDULE_FILE)) {
      log('No schedule file found to reset');
      return;
    }
    
    log('=== RESETTING COMPLETED PROFILES ===');
    
    const scheduleData = JSON.parse(fs.readFileSync(SCHEDULE_FILE, 'utf8'));
    let resetCount = 0;
    
    scheduleData.profiles.forEach(profile => {
      if (profile.completed || profile.status === 'completed' || profile.status === 'failed') {
        // Reset the profile status
        profile.completed = false;
        profile.status = 'scheduled';
        profile.lastUpdated = new Date().toISOString();
        
        // Remove completion/failure data
        delete profile.completedAt;
        delete profile.failedAt;
        delete profile.error;
        delete profile.result;
        delete profile.startedAt;
        
        resetCount++;
        log(`Reset profile ${profile.profileId} (${profile.actionType.toUpperCase()}) - now scheduled for ${new Date(profile.scheduledTime).toLocaleString('en-GB', { timeZone: 'Europe/Berlin', hour12: false })} CET`, profile.profileId);
      }
    });
    
    // Update statistics
    if (scheduleData.statistics) {
      const pending = scheduleData.profiles.filter(p => p.status === 'scheduled').length;
      const running = scheduleData.profiles.filter(p => p.status === 'running').length;
      
      scheduleData.statistics.completed = 0;
      scheduleData.statistics.failed = 0;
      scheduleData.statistics.pending = pending;
      scheduleData.statistics.running = running;
      scheduleData.statistics.lastUpdated = new Date().toISOString();
      
      // Reset completed actions
      scheduleData.statistics.completedActions = {
        comment: 0,
        like: 0,
        retweet: 0
      };
    }
    
    // Save the updated schedule
    fs.writeFileSync(SCHEDULE_FILE, JSON.stringify(scheduleData, null, 2));
    currentSchedule = scheduleData;
    
    // Clear execution tracking to allow immediate re-execution
    recentlyExecutedProfiles.clear();
    
    log(`Successfully reset ${resetCount} completed/failed profiles`);
    
    // Display updated schedule
    displayScheduleSummary();
    
    return resetCount;
    
  } catch (err) {
    log(`Error resetting completed profiles: ${err.message}`);
    return 0;
  }
}

// Initialize profiles on startup
function initializeProfiles() {
  profiles = loadProfiles();
  
  if (profiles.length === 0) {
    log('WARNING: No active profiles found. Please check profiles.json');
    return false;
  }
  
  log(`Initialized with ${profiles.length} active profiles:`);
  profiles.forEach(profile => {
    log(`- ${profile.id} (AdsPower: ${profile.adspower_id})`, profile.id);
  });
  
  return true;
}

// Initialize scheduling system
function initializeScheduling() {
  log('Initializing comprehensive scheduling system with multi-action support');
  
  // Load or create schedule
  currentSchedule = loadOrCreateSchedule();
  
  // Display schedule summary
  displayScheduleSummary();
  
  // Set up schedule checker to run every minute
  const scheduleChecker = new CronJob('* * * * *', checkSchedule, null, true);
  log('Schedule checker started - checking every minute for due profiles');
  
  // Set up schedule recreation every 24 hours
  const scheduleRecreator = new CronJob('0 0 * * *', () => {
    log('24-hour period completed, creating new schedule');
    currentSchedule = createSchedule();
    displayScheduleSummary();
  }, null, true);
  
  return true;
}

// Generate daily report
function generateDailyReport() {
  try {
    if (!currentSchedule) return;
    
    const stats = currentSchedule.statistics || {};
    const actionCounts = stats.actionCounts || {};
    const completedActions = stats.completedActions || {};
    
    const report = `Daily Twitter Automation Report:
- Total Profiles: ${currentSchedule.totalProfiles}
- Completed: ${stats.completed || 0}
- Failed: ${stats.failed || 0}
- Running: ${stats.running || 0}
- Pending: ${stats.pending || 0}

Action Distribution:
- Comments Scheduled: ${actionCounts.comment || 0} (Completed: ${completedActions.comment || 0})
- Likes Scheduled: ${actionCounts.like || 0} (Completed: ${completedActions.like || 0})
- Retweets Scheduled: ${actionCounts.retweet || 0} (Completed: ${completedActions.retweet || 0})

Schedule Information:
- Created: ${new Date(currentSchedule.created).toLocaleString()}
- Expires: ${new Date(currentSchedule.expires).toLocaleString()}
- Last Updated: ${stats.lastUpdated ? new Date(stats.lastUpdated).toLocaleString() : 'N/A'}`;
    
    log('Daily report generated with action breakdown');
    sendNotification('Daily Twitter Automation Report', report);
  } catch (err) {
    log(`Error generating daily report: ${err.message}`);
  }
}

// Scheduling: Main cron job for random profile every 3 hours
const mainJob = new CronJob('0 */3 * * *', runRandomProfileAutomation, null, true, 'America/Los_Angeles');

// Daily report job
const reportJob = new CronJob('59 23 * * *', generateDailyReport, null, true);

// Parse command line arguments
const args = process.argv.slice(2);
let specifiedAction = null;
let targetUrl = null;
let profileId = null;
let delay = null;
let customComment = null;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--action' && i + 1 < args.length) {
    specifiedAction = args[i + 1];
  } else if (args[i] === '--url' && i + 1 < args.length) {
    targetUrl = args[i + 1];
  } else if (args[i] === '--profile' && i + 1 < args.length) {
    profileId = args[i + 1];
  } else if (args[i] === '--delay' && i + 1 < args.length) {
    delay = parseInt(args[i + 1]);
  } else if (args[i] === '--comment' && i + 1 < args.length) {
    customComment = args[i + 1];
  }
}

// Initialize and start
log('=== MULTI-PROFILE TWITTER AI AUTOMATION STARTING ===');
log('Actions available: COMMENT, LIKE, RETWEET');

if (initializeProfiles()) {
  // Initialize comprehensive scheduling system
  initializeScheduling();
  
  log('Multi-profile AI Twitter automation system started successfully!');
  log('- Main scheduler: Every 3 hours (random profile + random action)');
  log('- Schedule checker: Every minute');
  log('- Daily report: 11:59 PM');
  
  // Only run immediately if this is the main automation script, not when imported by Telegram bot
  if (require.main === module) {
    if (specifiedAction) {
      log(`Running immediate execution with specified action: ${specifiedAction}`);
      
      // Apply delay if specified
      if (delay && delay > 0) {
        log(`Waiting ${delay} seconds before execution...`);
        await new Promise(resolve => setTimeout(resolve, delay * 1000));
      }
      
      // Run with specified action
      let targetProfile = null;
      
      if (profileId) {
        // Use specified profile if available
        targetProfile = profiles.find(p => p.id === profileId && isProfileAvailable(p.id));
        if (!targetProfile) {
          log(`Specified profile ${profileId} not found or not available`);
        }
      }
      
      if (!targetProfile) {
        // Use random available profile
        const availableProfiles = profiles.filter(p => isProfileAvailable(p.id));
        if (availableProfiles.length > 0) {
          targetProfile = availableProfiles[Math.floor(Math.random() * availableProfiles.length)];
        }
      }
      
      if (targetProfile) {
        const options = {};
        if (targetUrl) options.targetUrl = targetUrl;
        if (customComment) options.customComment = customComment;
        
        log(`Executing ${specifiedAction} with profile: ${targetProfile.id}`);
        await automateTwitterWithAI(targetProfile, specifiedAction, options);
      } else {
        log('No available profiles for immediate execution');
      }
    } else {
      log('Running immediate test execution (main script)');
      runRandomProfileAutomation();
    }
  } else {
    log('Skipping immediate execution (imported by Telegram bot)');
  }
} else {
  log('Failed to initialize profiles. Automation stopped.');
  process.exit(1);
}

// Export functions for Telegram bot
module.exports = {
  loadProfiles,
  automateTwitterWithAI,
  log,
  isProfileAvailable,
  markProfileExecuting,
  markProfileExecutionComplete,
  getRandomActionType,
  ACTION_TYPES
};



