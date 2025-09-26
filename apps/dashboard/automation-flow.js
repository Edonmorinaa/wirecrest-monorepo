const puppeteer = require('puppeteer-core');
const nodemailer = require('nodemailer');
const CronJob = require('cron').CronJob;
const fs = require('fs');
const { initializeActionTracker, logAction } = require('./action-tracker');
const { initializeEnhancedTracker, logEnhancedAction } = require('./enhanced-action-tracker');
const engagementTracker = require('./engagement-tracker.js');

// Configuration
const ADS_LOCAL_URL = 'http://local.adspower.net:50325';
const PROFILES_FILE = 'profiles.json';
const SCHEDULE_FILE = 'schedule.json';
const PERSONA_FILE = 'persona.txt';
const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY';
const PERPLEXITY_API_URL = 'https://api.perplexity.ai/chat/completions';
const UPLOADTHING_TOKEN='eyJhcGlLZXkiOiJza19saXZlXzA4YThkODg2YTk4N2UyNWM2NmZjZmU1MTNkYzVkZDAzYWYxNWY4MjMxNzZmN2MzYmIzNTE4ZTEzNmRmMzAxNzIiLCJhcHBJZCI6Im1tcGxjNW40ZDEiLCJyZWdpb25zIjpbInNlYTEiXX0='
const EMAIL_CONFIG = {
  service: 'gmail',
  auth: { user: 'your.email@gmail.com', pass: 'your-app-password' },
  to: 'your.email@gmail.com'
};
const LOG_FILE = 'automation-log.txt';



// Global variables
let profiles = [];
let scheduledJobs = new Map();
let currentSchedule = null;
let lastExecutionTime = null;
let executingProfiles = new Set(); // Track currently executing profiles
let recentlyExecutedProfiles = new Map(); // Track recently executed profiles with timestamps

// Action types available
const ACTION_TYPES = ['comment', 'like', 'retweet'];

// Minimum time between ANY profile executions (in minutes) - DISABLED for scheduled runs
const MIN_EXECUTION_INTERVAL = 5; // 5 minutes minimum between any profile executions

// Cooldown period for individual profiles (in minutes) - 24 hours between sessions
const PROFILE_COOLDOWN = 60; // 1 hour (60 minutes) between profile sessions

// Cooldown logging system to reduce spam
let lastCooldownLogs = new Map(); // Track last cooldown log time per profile

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
  // Use local timezone instead of UTC
  const now = new Date();
  const timestamp = now.toLocaleString('en-US', { 
    timeZone: 'Europe/Berlin',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).replace(',', '').replace(/\//g, '-');
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
  // For Telegram requests, bypass cooldown
  if (bypassTelegram) {
    return true;
  }
  
  // Check global cooldown between any profile executions
  if (lastExecutionTime && MIN_EXECUTION_INTERVAL > 0) {
    const now = new Date();
    const timeSinceLastExecution = (now.getTime() - lastExecutionTime.getTime()) / (1000 * 60); // in minutes
    
    if (timeSinceLastExecution < MIN_EXECUTION_INTERVAL) {
      const remainingCooldown = Math.round(MIN_EXECUTION_INTERVAL - timeSinceLastExecution);
      log(`Global cooldown active - ${remainingCooldown} minutes remaining until next execution allowed`, 'SYSTEM');
      return false;
    }
  }
  
  return true;
}

// Helper: Check if profile is available for execution
function isProfileAvailable(profileId) {
  // Check if profile is currently executing
  if (executingProfiles.has(profileId)) {
    log(`Profile ${profileId} is currently executing, skipping`, profileId);
    return false;
  }
  
  // Check if profile is already completed in schedule (no retries for failed profiles)
  if (currentSchedule) {
    const profileSchedule = currentSchedule.profiles.find(p => p.profileId === profileId);
    if (profileSchedule && (profileSchedule.status === 'completed' || profileSchedule.status === 'failed')) {
      log(`Profile ${profileId} already completed or failed (status: ${profileSchedule.status}), skipping`, profileId);
      return false;
    }
  }
  
  // Check if profile is in cooldown period - BUT allow scheduled sessions to override cooldown
  const lastExecution = recentlyExecutedProfiles.get(profileId);
  if (lastExecution) {
    const now = new Date();
    const timeSinceExecution = (now.getTime() - lastExecution.getTime()) / (1000 * 60); // in minutes
    
    // Check if this profile has a scheduled session that's due now
    // BUT only allow if no other profiles are available
    if (currentSchedule) {
      const scheduledSessions = currentSchedule.profiles.filter(p => 
        p.profileId === profileId && 
        p.status === 'scheduled' && 
        !p.completed
      );
      
      // If there's a scheduled session due now, check if other profiles are available first
      const dueSessions = scheduledSessions.filter(p => {
        const scheduledTime = new Date(p.scheduledTime);
        const thirtySecondsAgo = new Date(now.getTime() - 30000);
        return scheduledTime <= now && scheduledTime >= thirtySecondsAgo;
      });
      
      if (dueSessions.length > 0) {
        // Check if there are other profiles that haven't been executed recently
        const otherProfiles = currentSchedule.profiles.filter(p => 
          p.profileId !== profileId && 
          p.status === 'scheduled' && 
          !p.completed &&
          !recentlyExecutedProfiles.has(p.profileId)
        );
        
        if (otherProfiles.length === 0) {
          log(`Profile ${profileId} has scheduled session due and no other profiles available, overriding cooldown`, profileId);
          return true;
        } else {
          log(`Profile ${profileId} has scheduled session due but other profiles are available, respecting cooldown`, profileId);
          return false;
        }
      }
    }
    
    if (timeSinceExecution < PROFILE_COOLDOWN) {
      const remainingCooldown = Math.round(PROFILE_COOLDOWN - timeSinceExecution);
      
      // Only log cooldown status once per minute to reduce spam
      const lastCooldownLog = lastCooldownLogs.get(profileId) || 0;
      if (Date.now() - lastCooldownLog > 60000) { // Log once per minute
        log(`Profile ${profileId} in cooldown (${remainingCooldown}m remaining)`, profileId);
        lastCooldownLogs.set(profileId, Date.now());
      }
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
  
  // Show next profile info after completion
  const nextProfile = getNextScheduledProfile();
  if (nextProfile) {
    const scheduledTime = new Date(nextProfile.scheduledTime);
    const timeUntilNext = Math.floor((scheduledTime.getTime() - Date.now()) / (1000 * 60));
    const now = new Date();
    const isDueNow = scheduledTime <= now;
    
    if (isDueNow) {
      log(`Next up: ${nextProfile.profileId} will perform ${nextProfile.actionType.toUpperCase()} (due now)`, 'SYSTEM');
    } else {
      log(`Next scheduled: ${nextProfile.profileId} will perform ${nextProfile.actionType.toUpperCase()} in ${timeUntilNext} minutes`, 'SYSTEM');
    }
  }
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
  
  // Create a better temporal distribution by ensuring action types are spread out
  // First, create time slots with proper spacing
  const timeSlots = [];
  const totalProfiles = profiles.length;
  const minSpacingHours = 2; // Minimum 2 hours between profiles
  const maxSpacingHours = 4; // Maximum 4 hours between profiles
  
  // Create time slots with proper spacing
  for (let i = 0; i < totalProfiles; i++) {
    if (i === 0) {
      // First slot: immediate execution (1 minute)
      timeSlots.push({
        time: new Date(Date.now() + 60 * 1000),
        isImmediate: true,
        actionType: 'comment' // Immediate execution always comments
      });
    } else {
      // Subsequent slots: spaced out properly
      const baseHours = 2 + (i * 2); // Start at 2 hours, add 2 hours per slot
      const randomHours = baseHours + Math.random() * 2; // Add 0-2 hours randomness
      const scheduledTime = new Date(Date.now() + (randomHours * 60 * 60 * 1000));
      
      timeSlots.push({
        time: scheduledTime,
        isImmediate: false,
        actionType: null // Will be assigned based on distribution
      });
    }
  }
  
  // Create balanced action distribution for non-immediate profiles
  const nonImmediateCount = totalProfiles - 1;
  const actionsPerType = Math.ceil(nonImmediateCount / ACTION_TYPES.length);
  
  // Create balanced distribution array
  const actionDistribution = [];
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
  
  // Ensure we don't have too many of the same action type in a row
  // by checking and redistributing if needed
  let distributionIndex = 0;
  let lastActionType = 'comment'; // Start with comment (immediate execution)
  let consecutiveSameAction = 1;
  
  for (let i = 1; i < timeSlots.length; i++) {
    let assignedAction = actionDistribution[distributionIndex] || getRandomActionType();
    
    // Check if this would create too many consecutive same actions
    if (assignedAction === lastActionType) {
      consecutiveSameAction++;
      if (consecutiveSameAction > 2) { // Max 2 consecutive same actions
        // Find a different action type
        const availableActions = ACTION_TYPES.filter(action => action !== lastActionType);
        assignedAction = availableActions[Math.floor(Math.random() * availableActions.length)];
        consecutiveSameAction = 1;
      }
    } else {
      consecutiveSameAction = 1;
    }
    
    timeSlots[i].actionType = assignedAction;
    lastActionType = assignedAction;
    distributionIndex++;
  }
  
  log(`Temporal action distribution created: ${timeSlots.map(slot => `${slot.actionType} at ${slot.time.toLocaleString('en-GB', { timeZone: 'Europe/Berlin', hour12: false })}`).join(', ')}`);
  
  // Create multiple sessions per profile throughout the day
  profiles.forEach((profile, index) => {
    // Generate 6-12 random sessions per profile throughout the day (3-5 min each = 30-40 min total)
    const numSessions = Math.floor(Math.random() * 7) + 6; // 6-12 sessions per day
    const sessions = [];
    
    // Create random session times throughout the day
    for (let sessionIndex = 0; sessionIndex < numSessions; sessionIndex++) {
      // Random time between 6 AM and 11 PM (18 hours)
      const startHour = 6;
      const endHour = 23;
      const randomHour = Math.floor(Math.random() * (endHour - startHour + 1)) + startHour;
      const randomMinute = Math.floor(Math.random() * 60);
      
      const sessionTime = new Date();
      sessionTime.setHours(randomHour, randomMinute, 0, 0);
      
      // Add random delay to spread sessions throughout the day
      const randomDelay = Math.floor(Math.random() * 60); // 0-60 minutes
      sessionTime.setMinutes(sessionTime.getMinutes() + randomDelay);
      
      // Ensure session time is in the future
      if (sessionTime <= new Date()) {
        sessionTime.setDate(sessionTime.getDate() + 1);
      }
      
      sessions.push({
        time: sessionTime,
        sessionNumber: sessionIndex + 1,
        totalSessions: numSessions
      });
    }
    
    // Sort sessions by time
    sessions.sort((a, b) => a.time.getTime() - b.time.getTime());
    
    // Reassign session numbers after sorting (so they appear in chronological order)
    sessions.forEach((session, index) => {
      session.sessionNumber = index + 1;
    });
    
    // Create schedule entries for each session
    sessions.forEach((session, sessionIndex) => {
      const isImmediateExecution = (index === randomProfileIndex && sessionIndex === 0);
      
      const profileSchedule = {
        profileId: profile.id,
        adspower_id: profile.adspower_id,
        scheduledTime: session.time.toISOString(),
        status: 'scheduled',
        completed: false,
        actionType: getRandomActionType(), // Random action for each session
        delayRange: { min: 60, max: 180 }, // Fixed delay range for new multi-session system
        persona: profile.persona.substring(0, 100) + '...', // Truncated for readability
        createdAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
        isImmediateExecution: isImmediateExecution,
        sessionNumber: session.sessionNumber,
        totalSessions: session.totalSessions,
        dailyTotal: {
          timeSpent: 0, // Will be updated during execution
          engagements: 0 // Will be updated during execution
        }
      };
      
      schedule.profiles.push(profileSchedule);
      
      const timeUntil = Math.round((session.time.getTime() - Date.now()) / 1000 / 60);
      const executionType = isImmediateExecution ? ' (IMMEDIATE EXECUTION)' : '';
      const cetTime = session.time.toLocaleString('en-GB', { 
        timeZone: 'Europe/Berlin', 
        year: 'numeric', 
        month: '2-digit', 
        day: '2-digit', 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
      });
      log(`Scheduled ${profile.id} session ${session.sessionNumber}/${session.totalSessions} for ${profileSchedule.actionType.toUpperCase()} in ${timeUntil} minutes at ${cetTime} CET${executionType}`, profile.id);
    });
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
            tweetText: result.tweet?.substring(0, 150) || 'N/A',
            // Add detailed session information
            sessionDuration: result.sessionDuration || null,
            engagementsPerformed: result.engagementsPerformed || null,
            tweetsProcessed: result.tweetsProcessed || null,
            interactionsBreakdown: result.interactionsBreakdown || null
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
    
      // Get current time in CET timezone
  const utcNow = new Date();
  // Convert to CET (UTC+1)
  const cetOffset = 1; // CET is UTC+1
  const now = new Date(utcNow.getTime() + (cetOffset * 60 * 60 * 1000));
  
  // Check global cooldown first (for regular runs only)
    if (!isImmediateRun && !canExecuteNow(false)) {
      log(`Global cooldown active - skipping scheduled profile execution`, 'SYSTEM');
      return null;
    }
    
    // Find profiles that are due and available
    let availableProfiles;
    
    if (isImmediateRun) {
      // For immediate runs, ignore cooldowns but still exclude running profiles
      // Convert scheduled times to CET for comparison
      availableProfiles = currentSchedule.profiles.filter(p => {
        const scheduledTimeUTC = new Date(p.scheduledTime);
        const scheduledTimeCET = new Date(scheduledTimeUTC.getTime() + (cetOffset * 60 * 60 * 1000));
        
        return p.status === 'scheduled' && // No retries for failed profiles
          scheduledTimeCET <= now &&
          !executingProfiles.has(p.profileId); // Still exclude currently executing profiles
      });
      log(`Immediate run: Found ${availableProfiles.length} profiles ready (ignoring cooldowns)`);
    } else {
      // For regular runs, check availability and cooldowns
          // STRICT TIME ENFORCEMENT: Only start profiles that are EXACTLY due now (within 30 seconds of scheduled time)
    const thirtySecondsAgo = new Date(now.getTime() - 30000); // 30 seconds ago
          // Convert scheduled times to CET for comparison
      availableProfiles = currentSchedule.profiles.filter(p => {
        const scheduledTimeUTC = new Date(p.scheduledTime);
        const scheduledTimeCET = new Date(scheduledTimeUTC.getTime() + (cetOffset * 60 * 60 * 1000));
        
        return p.status === 'scheduled' && // No retries for failed profiles
          scheduledTimeCET <= now &&
          scheduledTimeCET >= thirtySecondsAgo && // Only start if scheduled within last 30 seconds
          !executingProfiles.has(p.profileId) && // Double-check not executing
          isProfileAvailable(p.profileId);
      });
      
      // For multi-session profiles, allow next sessions even if previous sessions are completed
      availableProfiles = availableProfiles.filter(p => {
        const profileSchedule = currentSchedule.profiles.find(s => s.profileId === p.profileId);
        // Allow if status is not completed, OR if it's a multi-session profile with more sessions available
        if (profileSchedule && profileSchedule.status === 'completed') {
          // Check if this profile has more scheduled sessions
          const allSessionsForProfile = currentSchedule.profiles.filter(s => s.profileId === p.profileId);
          const remainingSessions = allSessionsForProfile.filter(s => s.status === 'scheduled' && !s.completed);
          if (remainingSessions.length > 0) {
            log(`Profile ${p.profileId} has ${remainingSessions.length} remaining sessions, allowing execution`, 'SYSTEM');
            return true;
          }
          return false;
        }
        return true; // Allow scheduled profiles only (no failed profiles)
      });
      
      // Additional check: respect global cooldown between executions
      if (availableProfiles.length > 0 && !canExecuteNow(false)) {
        log(`Global cooldown active - skipping scheduled profile execution`, 'SYSTEM');
        availableProfiles = [];
      }
    }
    
    // If no profiles are due now, get the next upcoming profile for display purposes
    if (availableProfiles.length === 0) {
      // Convert scheduled times to CET for comparison
      const upcomingProfiles = currentSchedule.profiles.filter(p => {
        const scheduledTimeUTC = new Date(p.scheduledTime);
        const scheduledTimeCET = new Date(scheduledTimeUTC.getTime() + (cetOffset * 60 * 60 * 1000));
        
        return !p.completed && 
          p.status === 'scheduled' && 
          scheduledTimeCET > now;
      }).sort((a, b) => {
        const aTimeUTC = new Date(a.scheduledTime);
        const bTimeUTC = new Date(b.scheduledTime);
        return aTimeUTC.getTime() - bTimeUTC.getTime();
      });
      
      return upcomingProfiles.length > 0 ? upcomingProfiles[0] : null;
    }
    
    // Return the earliest scheduled available profile
    // PRIORITIZE different profiles over retries of the same profile
    const recentlyExecuted = Array.from(recentlyExecutedProfiles.keys());
    
    // First, try to find profiles that haven't been executed recently (different profiles)
    const differentProfiles = availableProfiles.filter(p => !recentlyExecuted.includes(p.profileId));
    
    if (differentProfiles.length > 0) {
      log(`Found ${differentProfiles.length} different profiles available, prioritizing over retries`, 'SYSTEM');
      return differentProfiles[0];
    }
    
    // Only if no different profiles are available, allow scheduled sessions of recently executed profiles
    const retryProfiles = availableProfiles.filter(p => {
      if (recentlyExecuted.includes(p.profileId)) {
        const scheduledSessions = currentSchedule.profiles.filter(s => 
          s.profileId === p.profileId && 
          s.status === 'scheduled' && 
          !s.completed
        );
        
        // Allow if there are scheduled sessions due now
        const dueSessions = scheduledSessions.filter(s => {
          const scheduledTime = new Date(s.scheduledTime);
          const thirtySecondsAgo = new Date(now.getTime() - 30000);
          return scheduledTime <= now && scheduledTime >= thirtySecondsAgo;
        });
        
        if (dueSessions.length > 0) {
          log(`No different profiles available, allowing scheduled session for ${p.profileId}`, 'SYSTEM');
          return true;
        }
        return false;
      }
      return true;
    });
    
    const filteredProfiles = retryProfiles;
    
    if (filteredProfiles.length === 0) {
      log(`All available profiles were recently executed, skipping`, 'SYSTEM');
      return null;
    }
    
    return filteredProfiles[0];
    
  } catch (err) {
    log(`Error getting next scheduled profile: ${err.message}`);
    return null;
  }
}

// Helper: Display schedule summary
function displayScheduleSummary() {
  if (!currentSchedule) return;
  
  // Get current time in CET timezone
  const utcNow = new Date();
  const cetOffset = 1; // CET is UTC+1
  const now = new Date(utcNow.getTime() + (cetOffset * 60 * 60 * 1000));
  
  // Convert scheduled times to CET for comparison
  const upcoming = currentSchedule.profiles.filter(p => {
    const scheduledTimeUTC = new Date(p.scheduledTime);
    const scheduledTimeCET = new Date(scheduledTimeUTC.getTime() + (cetOffset * 60 * 60 * 1000));
    
    return !p.completed && scheduledTimeCET > now;
  }).slice(0, 5);
  
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
          "delay_range": { "min": 60, "max": 180 }
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
  // Use longer delays for more realistic behavior
  const min = profile.delay_range?.min || 60; // 60 minutes minimum
  const max = profile.delay_range?.max || 120; // 120 minutes maximum
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
    
    // Check for anti-Muslim content and flag it
    const antiMuslimKeywords = [
      'islamophobia', 'anti-muslim', 'anti-islam', 'muslim ban', 'sharia law', 'terrorist', 'jihad',
      'islamic extremism', 'muslim extremism', 'islamic terrorism', 'muslim terrorism',
      'islamic threat', 'muslim threat', 'islamic invasion', 'muslim invasion',
      'islamic takeover', 'muslim takeover', 'islamic agenda', 'muslim agenda'
    ];
    
    const lowerTweetText = cleanTweetText.toLowerCase();
    const containsAntiMuslimContent = antiMuslimKeywords.some(keyword => 
      lowerTweetText.includes(keyword)
    );
    
    if (containsAntiMuslimContent) {
      log(`⚠️ DETECTED ANTI-MUSLIM CONTENT in tweet. AI will oppose this content.`, profileId);
    }
    
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
        content: `${persona}\n\nIMPORTANT: Before analyzing any tweet or generating a response, you MUST think and respond exactly like this profile. Your response should reflect this person's background, beliefs, communication style, and perspective. You are not a generic AI - you are this specific person with their unique worldview and way of expressing themselves.\n\nCRITICAL INSTRUCTION: If the tweet contains ANY content that is against Muslims, Islam, or promotes Islamophobia, you MUST oppose it. You should NOT be supportive of such statements. Your response should challenge, question, or oppose anti-Muslim rhetoric while staying true to your character's communication style.\n\nWhen replying to tweets, you sound like a real human having casual conversations. You NEVER use emojis, symbols, or special characters. You never use exclamation marks or overly enthusiastic language. You keep responses natural, conversational, and authentic. You can agree, disagree, or share your own perspective naturally. Stay on the same topic as the original tweet. Use only plain text with basic punctuation. NEVER use dashes (-) as they indicate AI activity.`
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

Keep it SHORT - 50-80 characters max. Sound like a real person chatting, not a news report.`;

      // Use sonar-pro with image URLs (works reliably)
      const requestBody = {
        model: 'sonar-pro',
        messages: [
          {
            role: 'system',
            content: `${persona}\n\nYou're a real person on Twitter. Stay true to your character and background. Be natural and authentic to who you are. Don't sound like a news reporter or AI assistant. Be yourself - not perfect or formal. NEVER use emojis, symbols, or special characters. Use only plain text with basic punctuation. NEVER use dashes (-) as they indicate AI activity.\n\nCRITICAL: If the tweet contains ANY content that is against Muslims, Islam, or promotes Islamophobia, you MUST oppose it. You should NOT be supportive of such statements. Your response should challenge, question, or oppose anti-Muslim rhetoric while staying true to your character's communication style.`
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
        max_tokens: 100,
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
      comment = comment.replace(/—/g, ' '); // Replace em dashes with spaces
      comment = comment.replace(/<think>[\s\S]*?<\/think>/gi, '');
      comment = comment.replace(/^\s*[-•*]\s*/, '');
      comment = comment.replace(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '');
      comment = comment.replace(/!/g, '');
      // Remove dashes and replace with natural punctuation
      comment = comment.replace(/\s*-\s*/g, ' '); // Remove dashes with spaces
      comment = comment.replace(/--+/g, ' '); // Remove multiple dashes
      // Remove any remaining special characters that might cause display issues
      comment = comment.replace(/[^\x00-\x7F]/g, ''); // Remove non-ASCII characters
      comment = comment.replace(/\s+/g, ' '); // Normalize whitespace
      comment = comment.trim();
      
      log(`Cleaned sonar-pro AI response: "${comment}"`, profileId);
      
      // Filter out unwanted slang terms like "Bruv" and "Bro" (for image-based comments)
      const unwantedTerms = ['bruv', 'bro', 'bruh', 'fam', 'mate', 'buddy', 'dude'];
      const lowerCommentImage = comment.toLowerCase();
      const containsUnwantedTerm = unwantedTerms.some(term => lowerCommentImage.includes(term));
      
      if (containsUnwantedTerm) {
        log(`Filtered out unwanted term in sonar-pro comment: "${comment}"`, profileId);
        // Replace with more natural alternatives
        const naturalAlternatives = [
          "yeah that makes sense",
          "not sure about this one",
          "happens to me too",
          "pretty accurate", 
          "never thought of it that way",
          "interesting take",
          "could be right",
          "same here",
          "lol yeah",
          "idk about that",
          "same tbh",
          "facts", 
          "never thought of it like that",
          "interesting",
          "could be",
          "same"
        ];
        comment = naturalAlternatives[Math.floor(Math.random() * naturalAlternatives.length)];
        log(`Replaced with natural alternative: "${comment}"`, profileId);
      }
      
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
        let naturalFallbacks;
        
        // Use opposition fallbacks if anti-Muslim content is detected
        if (containsAntiMuslimContent) {
          naturalFallbacks = [
            "this is wrong",
            "not cool",
            "disagree with this",
            "this is problematic",
            "not buying this",
            "this is messed up",
            "strongly disagree",
            "this is dangerous"
          ];
        } else {
          naturalFallbacks = [
            "yeah that makes sense",
            "not sure about this one",
            "happens to me too",
            "pretty accurate", 
            "never thought of it that way",
            "interesting take",
            "could be right",
            "same here"
          ];
        }
        
        comment = naturalFallbacks[Math.floor(Math.random() * naturalFallbacks.length)];
        log('Replaced bot-like sonar-pro response with natural fallback', profileId);
      }
      
      // No truncation - use the AI response as-is
      
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

Keep it SHORT - 50-80 characters max. Sound like a real person chatting, not a news report.`;

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
            content: `${persona}\n\nYou're a real person on Twitter. Stay true to your character and background. Be natural and authentic to who you are. Don't sound like a news reporter or AI assistant. Be yourself - not perfect or formal. NEVER use emojis, symbols, or special characters. Use only plain text with basic punctuation. NEVER use dashes (-) as they indicate AI activity.\n\nCRITICAL: If the tweet contains ANY content that is against Muslims, Islam, or promotes Islamophobia, you MUST oppose it. You should NOT be supportive of such statements. Your response should challenge, question, or oppose anti-Muslim rhetoric while staying true to your character's communication style.`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 100,
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
    comment = comment.replace(/—/g, ' '); // Replace em dashes with spaces
    comment = comment.replace(/<think>[\s\S]*?<\/think>/gi, ''); // Remove thinking tags
    comment = comment.replace(/^\s*[-•*]\s*/, ''); // Remove bullet points
    comment = comment.replace(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, ''); // Remove any emojis
    comment = comment.replace(/!/g, ''); // Remove exclamation marks
    // Remove dashes and replace with natural punctuation
    comment = comment.replace(/\s*-\s*/g, ' '); // Remove dashes with spaces
    comment = comment.replace(/--+/g, ' '); // Remove multiple dashes
    // Remove any remaining special characters that might cause display issues
    comment = comment.replace(/[^\x00-\x7F]/g, ''); // Remove non-ASCII characters
    comment = comment.replace(/\s+/g, ' '); // Normalize whitespace
    comment = comment.trim();
    
    log(`Cleaned AI response: "${comment}"`, profileId);
    
    // Filter out unwanted slang terms like "Bruv" and "Bro"
    const unwantedTerms = ['bruv', 'bro', 'bruh', 'fam', 'mate', 'buddy', 'dude'];
    const lowerCommentText = comment.toLowerCase();
    const containsUnwantedTerm = unwantedTerms.some(term => lowerCommentText.includes(term));
    
    if (containsUnwantedTerm) {
      log(`Filtered out unwanted term in comment: "${comment}"`, profileId);
      // Replace with more natural alternatives
      const naturalAlternatives = [
        "yeah that makes sense",
        "not sure about this one",
        "happens to me too",
        "pretty accurate", 
        "never thought of it that way",
        "interesting take",
        "could be right",
        "same here",
        "lol yeah",
        "idk about that",
        "same tbh",
        "facts", 
        "never thought of it like that",
        "interesting",
        "could be",
        "same"
      ];
      comment = naturalAlternatives[Math.floor(Math.random() * naturalAlternatives.length)];
      log(`Replaced with natural alternative: "${comment}"`, profileId);
    }
    
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
      let naturalFallbacks;
      
      // Use opposition fallbacks if anti-Muslim content is detected
      if (containsAntiMuslimContent) {
        naturalFallbacks = [
          "this is wrong",
          "not cool",
          "disagree with this",
          "this is problematic",
          "not buying this",
          "this is messed up",
          "strongly disagree",
          "this is dangerous"
        ];
      } else {
        naturalFallbacks = [
          "lol yeah",
          "idk about that",
          "same tbh",
          "facts", 
          "never thought of it like that",
          "interesting",
          "could be",
          "same"
        ];
      }
      
      comment = naturalFallbacks[Math.floor(Math.random() * naturalFallbacks.length)];
      log('Replaced bot-like response with natural fallback', profileId);
    }
    
    // Enhanced relevance validation for text-only (skip for Sonar Pro with images)
    const tweetWords = cleanTweetText.toLowerCase().split(/\W+/).filter(word => word.length > 2);
    const commentWords = comment.toLowerCase().split(/\W+/).filter(word => word.length > 2);
    
    const sharedWords = tweetWords.filter(tweetWord => 
      commentWords.some(commentWord => 
        commentWord.includes(tweetWord) || tweetWord.includes(commentWord)
      )
    );
    
    const relevanceScore = sharedWords.length / Math.min(tweetWords.length, 10);
    log(`Relevance score: ${relevanceScore.toFixed(2)} (${sharedWords.length} shared / ${Math.min(tweetWords.length, 10)} tweet words)`, profileId);
    
    // Skip relevance check for Sonar Pro responses (with images) since they're already contextually relevant
    if (imageUrls.length > 0) {
      log('Skipping relevance check for Sonar Pro response (with image analysis)', profileId);
    } else {
      // Only apply relevance check for very obviously unrelated responses (text-only)
      if (relevanceScore === 0 && sharedWords.length === 0 && comment.length < 10) {
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
    }
    
                          // No truncation - use the AI response as-is
    
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
    
    // Get tweet text if available
    let tweetText = options.tweetText || 'unknown';
    
    // Log action for tracking
    logAction(profileId, 'like', tweetText, null, true);
    logEnhancedAction(profileId, 'like', tweetText, null, true, null, null, {
      executionTime: Date.now() - (options.startTime || Date.now()),
      browserSession: options.profileId || profileId
    });
    
    // Log to engagement tracker for Actions History
    log(`Debug: Checking engagement logging conditions (like action) - engagementTracker: ${!!engagementTracker}, specificTweetUrl: ${!!options.specificTweetUrl}`, profileId);
    if (engagementTracker && options.specificTweetUrl) {
      try {
        const details = {
          tweetText: tweetText,
          username: 'unknown', // Will be filled by tweet alert system if available
          keyword: 'unknown', // Will be filled by tweet alert system if available
          customComment: null,
          isAI: false,
          commentUrl: null,
          error: null
        };
        log(`Debug: Calling engagementTracker.logEngagement (like action) with URL: ${options.specificTweetUrl}`, profileId);
        engagementTracker.logEngagement(options.specificTweetUrl, 'like', options.profileId || profileId, details, true);
        log(`Engagement logged to Actions History for tweet: ${options.specificTweetUrl}`, profileId);
      } catch (error) {
        log(`Failed to log engagement to Actions History: ${error.message}`, profileId);
      }
    } else {
      log(`Debug: Skipping engagement logging (like action) - engagementTracker: ${!!engagementTracker}, specificTweetUrl: ${!!options.specificTweetUrl}`, profileId);
    }
    
    return { action: 'like', status: 'success', message: 'Tweet liked successfully' };
    
  } catch (err) {
    log(`Error in like action: ${err.message}`, profileId);
    throw err;
  }
}

// Execute RETWEET action
async function executeRetweetAction(page, tweet, profileId, tweetText, options = {}) {
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
    
    // Get tweet text if available
    let finalTweetText = options.tweetText || tweetText || 'unknown';
    
    // Log action for tracking
    logAction(profileId, 'retweet', finalTweetText, null, true);
    logEnhancedAction(profileId, 'retweet', finalTweetText, null, true, null, null, {
      executionTime: Date.now() - (options.startTime || Date.now()),
      browserSession: options.profileId || profileId
    });
    
    // Log to engagement tracker for Actions History
    log(`Debug: Checking engagement logging conditions (retweet action) - engagementTracker: ${!!engagementTracker}, specificTweetUrl: ${!!options.specificTweetUrl}`, profileId);
    if (engagementTracker && options.specificTweetUrl) {
      try {
        const details = {
          tweetText: finalTweetText,
          username: 'unknown', // Will be filled by tweet alert system if available
          keyword: 'unknown', // Will be filled by tweet alert system if available
          customComment: null,
          isAI: false,
          commentUrl: null,
          error: null
        };
        log(`Debug: Calling engagementTracker.logEngagement (retweet action) with URL: ${options.specificTweetUrl}`, profileId);
        engagementTracker.logEngagement(options.specificTweetUrl, 'retweet', options.profileId || profileId, details, true);
        log(`Engagement logged to Actions History for tweet: ${options.specificTweetUrl}`, profileId);
      } catch (error) {
        log(`Failed to log engagement to Actions History: ${error.message}`, profileId);
      }
    } else {
      log(`Debug: Skipping engagement logging (retweet action) - engagementTracker: ${!!engagementTracker}, specificTweetUrl: ${!!options.specificTweetUrl}`, profileId);
    }
    
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
      
      // Extract images from the tweet
      log(`Extracting images from tweet...`, profileId);
      const extractedImageUrls = await extractImageUrls(page, tweetElement);
      if (extractedImageUrls.length > 0) {
        log(`Found ${extractedImageUrls.length} images in tweet`, profileId);
        extractedImageUrls.forEach((img, index) => {
          log(`Image ${index + 1}: ${img.url} (alt: "${img.alt}")`, profileId);
        });
        imageUrls = extractedImageUrls; // Update the imageUrls parameter
      } else {
        log(`No images found in tweet`, profileId);
      }
      
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
        
        // Log to engagement tracker for Actions History
        log(`Debug: Checking engagement logging conditions - engagementTracker: ${!!engagementTracker}, specificTweetUrl: ${!!options.specificTweetUrl}`, profileId);
        if (engagementTracker && options.specificTweetUrl) {
          try {
            const details = {
              tweetText: options.tweetText || tweetText || 'unknown',
              username: 'unknown', // Will be filled by tweet alert system if available
              keyword: 'unknown', // Will be filled by tweet alert system if available
              customComment: aiComment,
              isAI: true,
              commentUrl: commentUrl,
              error: null
            };
            log(`Debug: Calling engagementTracker.logEngagement with URL: ${options.specificTweetUrl}`, profileId);
            engagementTracker.logEngagement(options.specificTweetUrl, 'comment', options.profileId || profileId, details, true);
            log(`Engagement logged to Actions History for tweet: ${options.specificTweetUrl}`, profileId);
          } catch (error) {
            log(`Failed to log engagement to Actions History: ${error.message}`, profileId);
          }
        } else {
          log(`Debug: Skipping engagement logging - engagementTracker: ${!!engagementTracker}, specificTweetUrl: ${!!options.specificTweetUrl}`, profileId);
        }
        
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
          
          if (currentTweetText && currentTweetText.length > 10) {
            // More precise matching - check for significant overlap
            const originalWords = tweetText.toLowerCase().split(/\W+/).filter(w => w.length > 3);
            const currentWords = currentTweetText.toLowerCase().split(/\W+/).filter(w => w.length > 3);
            const sharedWords = originalWords.filter(word => currentWords.includes(word));
            const similarity = sharedWords.length / Math.max(originalWords.length, currentWords.length);
            
            // Require at least 60% similarity for a match
            if (similarity >= 0.6) {
              targetTweet = allTweets[i];
              log(`✅ Found target tweet to click (similarity: ${similarity.toFixed(2)}): "${currentTweetText.substring(0, 50)}..."`, profileId);
              break;
            }
          }
        } catch (searchErr) {
          continue;
        }
      }
      
      if (!targetTweet) {
        log(`Could not find tweet with sufficient similarity to: "${tweetText.substring(0, 50)}..."`, profileId);
        log(`Searched through ${allTweets.length} tweets but none matched the 60% similarity threshold`, profileId);
        
        // Try scrolling to find the tweet
        log(`Attempting to scroll and search for the tweet...`, profileId);
        await page.evaluate(() => window.scrollBy(0, 500));
        await sleep(2000);
        
        const scrollTweets = await page.$$('article[data-testid="tweet"]');
        log(`Found ${scrollTweets.length} tweets after scrolling`, profileId);
        
        for (let i = 0; i < scrollTweets.length; i++) {
          try {
            const scrollTweetText = await page.evaluate((el) => {
              const textElement = el.querySelector('[data-testid="tweetText"]');
              return textElement ? textElement.innerText.trim() : null;
            }, scrollTweets[i]);
            
            if (scrollTweetText && scrollTweetText.length > 10) {
              const originalWords = tweetText.toLowerCase().split(/\W+/).filter(w => w.length > 3);
              const scrollWords = scrollTweetText.toLowerCase().split(/\W+/).filter(w => w.length > 3);
              const sharedWords = originalWords.filter(word => scrollWords.includes(word));
              const similarity = sharedWords.length / Math.max(originalWords.length, scrollWords.length);
              
              if (similarity >= 0.6) {
                targetTweet = scrollTweets[i];
                log(`✅ Found target tweet after scrolling (similarity: ${similarity.toFixed(2)}): "${scrollTweetText.substring(0, 50)}..."`, profileId);
                break;
              }
            }
          } catch (scrollErr) {
            continue;
          }
        }
        
        if (!targetTweet) {
          throw new Error(`Could not find tweet with text: "${tweetText.substring(0, 50)}..." after scrolling`);
        }
      }
      
      // Click the found tweet to open it for replying
      log(`Clicking found tweet to open for replying...`, profileId);
      
      // Click on the tweet container, not on links within it
      let clickSuccess = false;
      
      try {
                 // More precise clicking - click directly on the tweet text element
         await page.evaluate((tweetElement) => {
           // Find the tweet text element specifically
           const tweetTextElement = tweetElement.querySelector('[data-testid="tweetText"]');
           if (tweetTextElement) {
             // Click directly on the tweet text, not the container
             tweetTextElement.click();
           } else {
             // Try alternative selectors for tweet text
             const alternativeSelectors = [
               '.css-1dbjc4n .css-901oao',
               'span[style*="text-overflow"]',
               '.r-37j5jr',
               '[dir="auto"]'
             ];
             
             let clicked = false;
             for (const selector of alternativeSelectors) {
               const textElement = tweetElement.querySelector(selector);
               if (textElement) {
                 textElement.click();
                 clicked = true;
                 break;
               }
             }
             
             if (!clicked) {
               // Fallback to clicking on the tweet container
               const tweetContainer = tweetElement.closest('article[data-testid="tweet"]');
               if (tweetContainer) {
                 tweetContainer.click();
               } else {
                 tweetElement.click();
               }
             }
           }
         }, targetTweet);
        
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
            
            if (retryText && retryText.length > 10) {
              // More precise matching for retry
              const originalWords = tweetText.toLowerCase().split(/\W+/).filter(w => w.length > 3);
              const retryWords = retryText.toLowerCase().split(/\W+/).filter(w => w.length > 3);
              const sharedWords = originalWords.filter(word => retryWords.includes(word));
              const similarity = sharedWords.length / Math.max(originalWords.length, retryWords.length);
              
              // Require at least 60% similarity for a match
              if (similarity >= 0.6) {
                retryTarget = retryTweet;
                log(`Found tweet for retry (similarity: ${similarity.toFixed(2)}): "${retryText.substring(0, 30)}..."`, profileId);
                break;
              }
            }
          } catch (retrySearchErr) {
            continue;
          }
        }
        
        if (retryTarget) {
          try {
            // More precise clicking for retry - click directly on the tweet text element
            await page.evaluate((tweetElement) => {
              // Find the tweet text element specifically
              const tweetTextElement = tweetElement.querySelector('[data-testid="tweetText"]');
              if (tweetTextElement) {
                // Click directly on the tweet text, not the container
                tweetTextElement.click();
              } else {
                // Fallback to clicking on the tweet container
                const tweetContainer = tweetElement.closest('article[data-testid="tweet"]');
                if (tweetContainer) {
                  tweetContainer.click();
                } else {
                  tweetElement.click();
                }
              }
            }, retryTarget);
            
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
          
          // Check if one text is contained within the other (handles truncation)
          const isContained = clickedTweetText.toLowerCase().includes(tweetText.toLowerCase()) || 
                             tweetText.toLowerCase().includes(clickedTweetText.toLowerCase());
          
          if (similarity < 0.2 && !isContained) {
            // This is a completely different tweet - critical error!
            log(`CRITICAL ERROR: Clicked wrong tweet! Similarity: ${similarity.toFixed(2)}`, profileId);
            log(`Original selected: "${tweetText}"`, profileId);
            log(`Actually opened: "${clickedTweetText}"`, profileId);
            
            // Try to find and click the correct tweet again
            log(`Attempting to find and click the correct tweet...`, profileId);
            const correctTweet = await page.evaluate((targetText) => {
              const tweets = document.querySelectorAll('article[data-testid="tweet"]');
              for (const tweet of tweets) {
                const tweetText = tweet.innerText || tweet.textContent || '';
                if (tweetText.includes(targetText.substring(0, 20))) {
                  return tweet;
                }
              }
              return null;
            }, tweetText);
            
            if (correctTweet) {
              log(`Found correct tweet, attempting to click it...`, profileId);
              try {
                await correctTweet.click();
                await sleep(2000);
                
                // Re-verify the tweet text after clicking the correct one
                const reVerifiedText = await page.evaluate(() => {
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
                
                if (reVerifiedText && reVerifiedText.length > 10) {
                  const reVerifiedWords = reVerifiedText.toLowerCase().split(/\W+/).filter(w => w.length > 3);
                  const originalWords = tweetText.toLowerCase().split(/\W+/).filter(w => w.length > 3);
                  const reVerifiedSimilarity = originalWords.filter(word => reVerifiedWords.includes(word)).length / Math.max(originalWords.length, reVerifiedWords.length);
                  
                  // Check if one text is contained within the other (handles truncation)
                  const isContained = reVerifiedText.toLowerCase().includes(tweetText.toLowerCase()) || 
                                     tweetText.toLowerCase().includes(reVerifiedText.toLowerCase());
                  
                  if (reVerifiedSimilarity > 0.3 || isContained) {
                    log(`Successfully clicked correct tweet after retry! Similarity: ${reVerifiedSimilarity.toFixed(2)}, Contained: ${isContained}`, profileId);
                    log(`Correct tweet text: "${reVerifiedText}"`, profileId);
                    finalTweetText = reVerifiedText;
                  } else {
                    throw new Error(`Still wrong tweet after retry. Similarity: ${reVerifiedSimilarity.toFixed(2)}`);
                  }
                } else {
                  throw new Error('Could not verify correct tweet text after retry');
                }
              } catch (retryError) {
                log(`Retry failed: ${retryError.message}`, profileId);
                throw new Error(`Tweet mismatch: Selected "${tweetText.substring(0, 50)}..." but opened "${clickedTweetText.substring(0, 50)}...". This would result in an inappropriate response.`);
              }
            } else {
              throw new Error(`Tweet mismatch: Selected "${tweetText.substring(0, 50)}..." but opened "${clickedTweetText.substring(0, 50)}...". This would result in an inappropriate response.`);
            }
          } else {
            // Minor difference, probably just truncation or formatting
            const isContained = clickedTweetText.toLowerCase().includes(tweetText.toLowerCase()) || 
                               tweetText.toLowerCase().includes(clickedTweetText.toLowerCase());
            log(`Tweet text updated after clicking (minor difference, similarity: ${similarity.toFixed(2)}, contained: ${isContained})`, profileId);
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
        
        // Get tweet text from options or use the one passed to the function
        const finalTweetText = options.tweetText || tweetText || 'unknown';
        
        // Log action for tracking
        logAction(profileId, 'comment', finalTweetText, commentUrl, true, aiComment);
    logEnhancedAction(profileId, 'comment', finalTweetText, null, true, aiComment, null, {
      commentUrl: commentUrl,
      executionTime: Date.now() - (options.startTime || Date.now()),
      browserSession: options.profileId || profileId
    });
        
        // Log to engagement tracker for Actions History
        log(`Debug: Checking engagement logging conditions (text-based path) - engagementTracker: ${!!engagementTracker}, specificTweetUrl: ${!!options.specificTweetUrl}`, profileId);
        if (engagementTracker && options.specificTweetUrl) {
          try {
            const details = {
              tweetText: finalTweetText,
              username: 'unknown', // Will be filled by tweet alert system if available
              keyword: 'unknown', // Will be filled by tweet alert system if available
              customComment: aiComment,
              isAI: true,
              commentUrl: commentUrl,
              error: null
            };
            log(`Debug: Calling engagementTracker.logEngagement (text-based path) with URL: ${options.specificTweetUrl}`, profileId);
            engagementTracker.logEngagement(options.specificTweetUrl, 'comment', options.profileId || profileId, details, true);
            log(`Engagement logged to Actions History for tweet: ${options.specificTweetUrl}`, profileId);
          } catch (error) {
            log(`Failed to log engagement to Actions History: ${error.message}`, profileId);
          }
        } else {
          log(`Debug: Skipping engagement logging (text-based path) - engagementTracker: ${!!engagementTracker}, specificTweetUrl: ${!!options.specificTweetUrl}`, profileId);
        }
        
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
  
  // Initialize session tracking variables
  let actualDuration = 0;
  let interactionsPerformed = 0;
  let tweetsProcessed = 0;
  let likesGiven = 0;
  let retweetsGiven = 0;
  let bookmarksAdded = 0;
  
  try {
    log(`Starting automation for profile: ${profileId}`, profileId);
    updateScheduleStatus(profileId, 'running');

    // Check if this is a Telegram request (bypass cooldown)
    const isTelegramRequest = options.telegramChatId || options.bypassTelegram || options.targetSpecificTweet;
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
    
    while (!navigationSuccess && retryCount < maxRetries) {
      try {
        await page.goto('https://x.com/home', { 
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

    // Check if this is a Telegram request - skip human-like behavior for direct execution
    if (isTelegramRequest) {
      log('Telegram request detected - skipping human-like behavior simulation for direct execution', profileId);
    } else {
      // REALISTIC HUMAN-LIKE TWITTER SESSION SIMULATION
      log('Starting realistic human-like Twitter session simulation...', profileId);
      
      // Session configuration - simulate 3-5 minute session (part of daily 30-40 minute total)
      const sessionDuration = Math.floor(Math.random() * 120000) + 180000; // 3-5 minutes in ms
      const startTime = Date.now();
      const endTime = startTime + sessionDuration;
      
      log(`Session duration: ${Math.round(sessionDuration / 1000 / 60)} minutes (part of daily 30-40 minute total)`, profileId);
      
      // Human-like behavior parameters for 3-8 engagements per session (part of daily 15-30 total)
      const targetEngagements = Math.floor(Math.random() * 6) + 3; // 3-8 engagements per session
      const tweetCount = targetEngagements * 3; // Process 3x more tweets than engagements
      const interactionChance = 0.4; // 40% chance to interact with any tweet
      const likeChance = 0.25; // 25% chance to like
      const retweetChance = 0.08; // 8% chance to retweet
      const bookmarkChance = 0.07; // 7% chance to bookmark
      
      tweetsProcessed = 0;
      interactionsPerformed = 0;
      likesGiven = 0;
      retweetsGiven = 0;
      bookmarksAdded = 0;
      let processedTweetTexts = new Set(); // Track processed tweets to avoid duplicates
      let consecutiveNoNewTweets = 0; // Track consecutive scrolls without new tweets
      
      log(`Target: ${targetEngagements} engagements (${tweetCount} tweets to process)`, profileId);
      
      // Main session loop - ensure minimum session time for realistic behavior
      const minimumSessionTime = 180000; // 3 minutes minimum
      const sessionStartTime = Date.now();
      
      while (Date.now() < endTime) {
        // Continue scrolling and doing random engagements for the full session time
        // More aggressive scrolling to get new content (200-800px)
        const scrollDistance = Math.floor(Math.random() * 601) + 200;
        
        await page.evaluate((distance) => {
          window.scrollBy(0, distance);
        }, scrollDistance);
        
        log(`Session simulation: Scrolled ${scrollDistance}px to get new content`, profileId);
        
        // Longer pause after scroll to let new content load (2-5 seconds)
        const scrollPause = Math.floor(Math.random() * 3000) + 2000;
        await sleep(scrollPause);
        
               // Use the exact same tweet detection method as the main action
         await sleep(2000); // Wait for tweets to load
         
         // Use the same approach as main action: waitForAnySelector + page.$$
         const workingSelector = await waitForAnySelector(page, TWEET_SELECTORS, 15000);
         const tweets = await page.$$(workingSelector);
         
         if (tweets.length === 0) {
           log(`Session simulation: No tweets found using selector: ${workingSelector}`, profileId);
           consecutiveNoNewTweets++;
           
           // If we haven't found tweets for 3 consecutive scrolls, scroll more aggressively
           if (consecutiveNoNewTweets >= 3) {
             log(`Session simulation: No tweets for ${consecutiveNoNewTweets} scrolls, scrolling more aggressively...`, profileId);
             await page.evaluate(() => {
               window.scrollBy(0, 1000); // Force a bigger scroll
             });
             await sleep(2000); // Wait longer for content to load
             consecutiveNoNewTweets = 0; // Reset counter
           }
           
           visibleTweets = [];
         } else {
           log(`Session simulation: Found ${tweets.length} tweets using selector: ${workingSelector}`, profileId);
           consecutiveNoNewTweets = 0; // Reset counter when we find tweets
           
           // Process tweets the same way as main action
           visibleTweets = [];
           for (let i = 0; i < Math.min(tweets.length, 5); i++) {
             try {
               // Extract text from tweet using the same method as main action
               const tweetData = await page.evaluate((tweet) => {
                 const textSelectors = [
                   'div[data-testid="tweetText"]',
                   '[data-testid="tweetText"]',
                   '.css-1dbjc4n .css-901oao',
                   'span[style*="text-overflow"]',
                   '.r-37j5jr',
                   '[dir="auto"]'
                 ];
                 
                 let tweetText = null;
                 for (const selector of textSelectors) {
                   const element = tweet.querySelector(selector);
                   if (element && element.innerText && element.innerText.trim().length > 3) {
                     tweetText = element.innerText.trim();
                     break;
                   }
                 }
                 
                 return {
                   text: tweetText,
                   hasText: !!tweetText
                 };
               }, tweets[i]);
               
               if (tweetData.hasText) {
                 // Skip if we've already processed this tweet text
                 const tweetKey = tweetData.text.substring(0, 50);
                 if (!processedTweetTexts.has(tweetKey)) {
                   processedTweetTexts.add(tweetKey);
                   visibleTweets.push({
                     index: i,
                     text: tweetData.text.substring(0, 100),
                     element: tweets[i]
                   });
                 }
               }
             } catch (error) {
               log(`Session simulation: Error processing tweet ${i}: ${error.message}`, profileId);
             }
           }
         }
         
         if (visibleTweets && visibleTweets.length > 0) {
          // Process each visible tweet
          for (const tweet of visibleTweets) {
            if (Date.now() >= endTime || tweetsProcessed >= tweetCount) break;
            
            tweetsProcessed++;
            log(`Tweet ${tweetsProcessed}/${tweetCount}: "${tweet.text.substring(0, 50)}..."`, profileId);
            
                       // Random reading time (2-6 seconds) - more realistic
             const readingTime = Math.floor(Math.random() * 4000) + 2000;
             await sleep(readingTime);
            
            // Decide whether to interact with this tweet
            if (Math.random() < interactionChance) {
              interactionsPerformed++;
              
              // Choose interaction type
              const interactionRoll = Math.random();
              
              if (interactionRoll < likeChance) {
                // Like the tweet
                try {
                  await page.evaluate((tweetElement) => {
                    const likeButton = tweetElement.querySelector('[data-testid="like"]');
                    if (likeButton) {
                      likeButton.click();
                    }
                  }, tweet.element);
                  likesGiven++;
                  log(`  → LIKED tweet ${tweetsProcessed}`, profileId);
                } catch (error) {
                  log(`  → Failed to like tweet: ${error.message}`, profileId);
                }
              } else if (interactionRoll < likeChance + retweetChance) {
                // Retweet the tweet
                try {
                  // Click retweet button
                  await page.evaluate((tweetElement) => {
                    const retweetButton = tweetElement.querySelector('[data-testid="retweet"]');
                    if (retweetButton) {
                      retweetButton.click();
                    }
                  }, tweet.element);
                  
                  // Wait for retweet dialog to appear
                  await sleep(1000);
                  
                  // Click "Repost" to confirm retweet
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
                      await page.waitForSelector(selector, { timeout: 2000 });
                      await page.click(selector);
                      repostClicked = true;
                      log(`  → Repost confirmation clicked using: ${selector}`, profileId);
                      break;
                    } catch (err) {
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
                        log('  → Repost clicked using text search', profileId);
                      }
                    } catch (err) {
                      log(`  → Alternative repost method failed: ${err.message}`, profileId);
                    }
                  }
                  
                  if (repostClicked) {
                    retweetsGiven++;
                    log(`  → RETWEETED tweet ${tweetsProcessed}`, profileId);
                  } else {
                    log(`  → Failed to confirm retweet - dialog may still be open`, profileId);
                  }
                } catch (error) {
                  log(`  → Failed to retweet: ${error.message}`, profileId);
                }
              } else if (interactionRoll < likeChance + retweetChance + bookmarkChance) {
                // Bookmark the tweet
                try {
                  await page.evaluate((tweetElement) => {
                    const bookmarkButton = tweetElement.querySelector('[data-testid="bookmark"]');
                    if (bookmarkButton) {
                      bookmarkButton.click();
                    }
                  }, tweet.element);
                  bookmarksAdded++;
                  log(`  → BOOKMARKED tweet ${tweetsProcessed}`, profileId);
                } catch (error) {
                  log(`  → Failed to bookmark: ${error.message}`, profileId);
                }
              }
              
              // Pause after interaction (1-4 seconds)
              const interactionPause = Math.floor(Math.random() * 3000) + 1000;
              await sleep(interactionPause);
            }
            
            // Random idle time (0.5-2 seconds)
            const idleTime = Math.floor(Math.random() * 1500) + 500;
            await sleep(idleTime);
                   }
         } else {
           // No visible tweets found, just continue scrolling
           log(`No visible tweets found, continuing to scroll...`, profileId);
         }
         
         // Random longer pause between tweet batches (1-3 seconds) - more realistic
         if (tweetsProcessed % 3 === 0) {
           const batchPause = Math.floor(Math.random() * 2000) + 1000;
           log(`Batch pause: ${Math.round(batchPause / 1000)}s`, profileId);
           await sleep(batchPause);
         }
       }
      
      actualDuration = Math.round((Date.now() - startTime) / 1000);
      log(`Session completed in ${Math.round(actualDuration / 60)} minutes: ${interactionsPerformed} engagements performed (${tweetsProcessed} tweets processed)`, profileId);
      log(`Interactions: ${interactionsPerformed} total (${likesGiven} likes, ${retweetsGiven} retweets, ${bookmarksAdded} bookmarks)`, profileId);
      
      // Final pause before main action
      await sleep(Math.floor(Math.random() * 3000) + 2000);
    }

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
        tweet: selectedTweet.text,
        // Add detailed session information
        sessionDuration: Math.round(actualDuration / 60),
        engagementsPerformed: interactionsPerformed,
        tweetsProcessed: tweetsProcessed,
        interactionsBreakdown: {
          likes: likesGiven,
          retweets: retweetsGiven,
          bookmarks: bookmarksAdded
        }
      };
      updateScheduleStatus(profileId, 'completed', null, result);
      
      return result;
    }

    // After session simulation, scroll to find fresh content for main action
    log(`Session simulation completed, scrolling to find fresh content for main action...`, profileId);
    
    // Scroll a few times to get new content
    for (let i = 0; i < 3; i++) {
      const scrollDistance = Math.floor(Math.random() * 500) + 300;
      await page.evaluate((distance) => {
        window.scrollBy(0, distance);
      }, scrollDistance);
      log(`Main action scroll ${i + 1}/3: ${scrollDistance}px`, profileId);
      await sleep(1000);
    }
    
    // Wait for new content to load
    await sleep(2000);
    
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
          
          // Extract text with better validation
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
          
          // Validate tweet text quality - reject corrupted or invalid text
          if (tweetText) {
            // Check for corrupted/encoded text patterns
            const corruptedPatterns = [
              /ð[€ðð"ð"ðð„ð']/, // The specific corrupted pattern from the crash
              /[ð€ðð"ð"ðð„ð']/, // Any similar corrupted characters
              /[^\x00-\x7F]/, // Non-ASCII characters that might be corrupted
              /[^\w\s\.,!?@#$%^&*()_+\-=\[\]{}|\\:";'<>\/]/ // Only allow common readable characters
            ];
            
            // Check if text contains too many corrupted characters
            const corruptedCharCount = (tweetText.match(/[^\x00-\x7F]/g) || []).length;
            const totalCharCount = tweetText.length;
            const corruptedRatio = corruptedCharCount / totalCharCount;
            
            // Reject if more than 30% of characters are corrupted
            if (corruptedRatio > 0.3) {
              tweetText = null;
            }
            
            // Reject if text is too short or too long
            if (tweetText && (tweetText.length < 10 || tweetText.length > 500)) {
              tweetText = null;
            }
            
            // Reject if text contains only special characters or numbers
            if (tweetText && !/[a-zA-Z]/.test(tweetText)) {
              tweetText = null;
            }
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
            'webinar', 'sponsored', 'advertisement', 'promoted', 'get started'
          ];
          
          // More precise promotional content detection with minimum threshold
          const promotionalMatches = promotionalKeywords.filter(keyword => {
            const lowerText = tweetText.toLowerCase();
            const lowerKeyword = keyword.toLowerCase();
            
            // Use word boundaries to avoid false positives
            const wordBoundaryRegex = new RegExp(`\\b${lowerKeyword.replace(/\s+/g, '\\s+')}\\b`);
            return wordBoundaryRegex.test(lowerText);
          });
          
          // Only reject if there are multiple promotional keywords or very obvious ones
          const obviousPromotionalKeywords = ['sponsored', 'advertisement', 'promoted', 'upgrade to premium'];
          const hasObviousPromotional = obviousPromotionalKeywords.some(keyword => 
            promotionalMatches.includes(keyword)
          );
          
          if (hasObviousPromotional || promotionalMatches.length >= 2) {
            log(`Tweet ${i + 1} contains promotional keywords (${promotionalMatches.join(', ')}), skipping: "${tweetText.substring(0, 50)}..."`, profileId);
            continue;
          }
        }
        
        if (tweetText && tweetText.length > 10) {
          // Additional quality checks before accepting the tweet
          const hasReadableText = /[a-zA-Z]/.test(tweetText);
          const hasReasonableLength = tweetText.length >= 10 && tweetText.length <= 500;
          const hasNoExcessiveSpecialChars = (tweetText.match(/[^\w\s\.,!?@#$%^&*()_+\-=\[\]{}|\\:";'<>\/]/g) || []).length < tweetText.length * 0.3;
          
          if (hasReadableText && hasReasonableLength && hasNoExcessiveSpecialChars) {
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
            log(`Tweet ${i + 1} failed quality checks - text: "${tweetText.substring(0, 50)}..."`, profileId);
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
      log('No valid tweets found on first attempt, scrolling more to find tweets...', profileId);
      
      // Try additional scrolling to find tweets
      let scrollAttempts = 0;
      const maxScrollAttempts = 20; // Increased to allow more scrolling
      
      while (validTweets.length === 0 && scrollAttempts < maxScrollAttempts) {
        scrollAttempts++;
        log(`Scroll attempt ${scrollAttempts}/${maxScrollAttempts} to find tweets...`, profileId);
        
        // Scroll down more
        await page.evaluate(() => {
          window.scrollBy(0, 800);
        });
        
        await sleep(3000);
        
        // Try to find tweets again
        const newTweets = await page.$$(workingSelector);
        log(`Found ${newTweets.length} additional tweets on scroll attempt ${scrollAttempts}`, profileId);
        
        // Process the new tweets
        for (let i = 0; i < Math.min(newTweets.length, 10); i++) {
          try {
            // Check if this is an ad or promotional content first
            if (!options.targetSpecificTweet) {
              const isAd = await page.evaluate((tweet) => {
                const adIndicators = [
                  '[data-testid="promotedIndicator"]',
                  '[aria-label*="Promoted"]',
                  '[data-testid="socialContext"]',
                  '.r-1tl8opc',
                  '[data-testid="placementTracking"]'
                ];
                
                for (const indicator of adIndicators) {
                  if (tweet.querySelector(indicator)) {
                    return true;
                  }
                }
                
                const tweetText = tweet.innerText || tweet.textContent || '';
                const promotionalPatterns = [
                  /promoted/i, /sponsored/i, /advertisement/i, /register.*webinar/i,
                  /sign up.*free/i, /upgrade.*premium/i, /subscribe.*now/i, /limited.*offer/i,
                  /click.*link/i, /visit.*website/i, /download.*app/i, /get.*discount/i,
                  /special.*deal/i, /buy.*now/i, /order.*today/i, /save.*\d+%/i,
                  /free.*trial/i, /learn.*more/i, /register.*to/i
                ];
                
                return promotionalPatterns.some(pattern => pattern.test(tweetText));
              }, newTweets[i]);
              
              if (isAd) {
                continue;
              }
            }
            
            // Check for external links
            if (!options.targetSpecificTweet) {
              const hasExternalLinks = await page.evaluate((tweet) => {
                const links = tweet.querySelectorAll('a[href]');
                for (const link of links) {
                  const href = link.getAttribute('href');
                  if (href && !href.includes('twitter.com') && !href.includes('x.com') && !href.startsWith('/') && !href.startsWith('#')) {
                    return true;
                  }
                }
                return false;
              }, newTweets[i]);
              
              if (hasExternalLinks) {
                continue;
              }
            }
            
            // Extract text and images
            const tweetData = await page.evaluate((tweet) => {
              const textSelectors = [
                'div[data-testid="tweetText"]',
                '[data-testid="tweetText"]',
                '.css-1dbjc4n .css-901oao',
                'span[style*="text-overflow"]',
                '.r-37j5jr',
                '[dir="auto"]'
              ];
              
              let tweetText = null;
              for (const selector of textSelectors) {
                const textElement = tweet.querySelector(selector);
                if (textElement && textElement.innerText.trim().length > 10) {
                  tweetText = textElement.innerText.trim();
                  break;
                }
              }
              
              if (!tweetText) {
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
                
                tweetText = lines.length > 0 ? lines[0].trim() : null;
              }
              
              const imageSelectors = [
                'img[src*="pbs.twimg.com"]',
                'img[src*="media"]',
                'img[alt*="Image"]',
                'img[data-testid="tweetPhoto"]',
                'img[src*="twimg"]',
                'img[src*="http"]'
              ];
              
              const images = [];
              for (const selector of imageSelectors) {
                const imgElements = tweet.querySelectorAll(selector);
                for (const img of imgElements) {
                  const src = img.getAttribute('src');
                  if (src && src.startsWith('http') && !src.includes('profile_images')) {
                    if (src.includes('emoji/v2/svg/') || 
                        src.includes('emoji/v2/72x72/') ||
                        src.includes('emoji/v2/color/') ||
                        src.includes('emoji/v2/') ||
                        src.endsWith('.svg') ||
                        src.includes('abs-0.twimg.com/emoji')) {
                      continue;
                    }
                    
                    if (src.includes('pbs.twimg.com/media/') || 
                        src.includes('format=jpg') || 
                        src.includes('format=png') ||
                        src.includes('format=webp')) {
                      let highQualityUrl = src;
                      if (src.includes('pbs.twimg.com')) {
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
              
              const uniqueImages = images.filter((img, index, self) => 
                index === self.findIndex(t => t.url === img.url)
              );
              
              return {
                text: tweetText,
                images: uniqueImages
              };
            }, newTweets[i]);
            
            const tweetText = tweetData.text;
            const tweetImages = tweetData.images;
            
            if (!options.targetSpecificTweet && tweetText) {
              const promotionalKeywords = [
                'upgrade to premium', 'subscribe now', 'limited offer', 'click here',
                'visit our website', 'download now', 'get discount', 'special deal',
                'buy now', 'order today', 'free trial', 'register to', 'sign up',
                'webinar', 'sponsored', 'advertisement', 'promoted'
              ];
              
              // More precise promotional content detection with minimum threshold
              const promotionalMatches = promotionalKeywords.filter(keyword => {
                const lowerText = tweetText.toLowerCase();
                const lowerKeyword = keyword.toLowerCase();
                
                // Use word boundaries to avoid false positives
                const wordBoundaryRegex = new RegExp(`\\b${lowerKeyword.replace(/\s+/g, '\\s+')}\\b`);
                return wordBoundaryRegex.test(lowerText);
              });
              
              // Only reject if there are multiple promotional keywords or very obvious ones
              const obviousPromotionalKeywords = ['sponsored', 'advertisement', 'promoted', 'upgrade to premium'];
              const hasObviousPromotional = obviousPromotionalKeywords.some(keyword => 
                promotionalMatches.includes(keyword)
              );
              
              if (hasObviousPromotional || promotionalMatches.length >= 2) {
                continue;
              }
            }
            
            if (tweetText && tweetText.length > 10) {
              validTweets.push({ 
                element: newTweets[i], 
                text: tweetText,
                images: tweetImages
              });
              log(`Found valid tweet on scroll attempt ${scrollAttempts}: "${tweetText.substring(0, 100)}${tweetText.length > 100 ? '...' : ''}"`, profileId);
              break; // Found a valid tweet, no need to continue
            }
          } catch (err) {
            log(`Error processing tweet on scroll attempt ${scrollAttempts}: ${err.message}`, profileId);
            continue;
          }
        }
      }
      
      if (validTweets.length === 0) {
        // Last resort: accept any tweet with basic text content
        log(`No valid tweets found after ${maxScrollAttempts} scroll attempts, accepting any tweet with basic content...`, profileId);
        
        const allTweets = await page.$$(workingSelector);
        for (let i = 0; i < Math.min(allTweets.length, 5); i++) {
          try {
            const tweetText = await page.evaluate((tweet) => {
              const textElement = tweet.querySelector('div[data-testid="tweetText"]');
              return textElement ? textElement.innerText.trim() : null;
            }, allTweets[i]);
            
            if (tweetText && tweetText.length > 10 && /[a-zA-Z]/.test(tweetText)) {
              validTweets.push({
                element: allTweets[i],
                text: tweetText,
                images: []
              });
              log(`Accepted fallback tweet: "${tweetText.substring(0, 100)}..."`, profileId);
              break;
            }
          } catch (err) {
            continue;
          }
        }
        
        if (validTweets.length === 0) {
          log(`No valid tweets found in current batch, continuing to scroll for more tweets...`, profileId);
          // Continue scrolling instead of quitting
          // Don't throw error, just continue the loop
        } else {
          log(`Successfully found ${validTweets.length} fallback tweet(s)`, profileId);
        }
      } else {
        log(`Successfully found ${validTweets.length} valid tweets after ${scrollAttempts} scroll attempts`, profileId);
      }
    }

    // Select a random valid tweet with enhanced validation
    var randomIndex = Math.floor(Math.random() * validTweets.length);
    var selectedTweet = validTweets[randomIndex];
    
    // Enhanced final validation of selected tweet
    if (!selectedTweet || !selectedTweet.text || selectedTweet.text.length < 10) {
      throw new Error('Selected tweet failed final validation - no valid text content');
    }
    
              // Check for corrupted text patterns in the selected tweet (only very obvious corruption)
          const corruptedPatterns = [
            /ð[€ðð"ð"ðð„ð']/, // The specific corrupted pattern from the crash
          ];
          
          const hasCorruptedText = corruptedPatterns.some(pattern => pattern.test(selectedTweet.text));
          if (hasCorruptedText) {
            log(`Selected tweet contains corrupted text pattern, rejecting: "${selectedTweet.text.substring(0, 50)}..."`, profileId);
            throw new Error('Selected tweet contains corrupted text - safety abort');
          }
          
          // Debug: Log the actual tweet text to see what's happening
          log(`DEBUG: Tweet text length: ${selectedTweet.text.length}, content: "${selectedTweet.text}"`, profileId);
          
          // Only interact with English tweets - skip Arabic, Chinese, etc.
          const englishCharCount = (selectedTweet.text.match(/[a-zA-Z]/g) || []).length;
          const tweetLength = selectedTweet.text.length;
          const englishRatio = englishCharCount / tweetLength;
          
          if (englishRatio < 0.3) { // If less than 30% are English letters, skip it
            log(`Selected tweet is not primarily English (${(englishRatio * 100).toFixed(1)}% English), skipping: "${selectedTweet.text.substring(0, 50)}..."`, profileId);
            // Remove this tweet from validTweets and continue searching instead of crashing
            validTweets.splice(randomIndex, 1);
            if (validTweets.length === 0) {
              log(`No more valid tweets available after removing non-English content, continuing to scroll...`, profileId);
              // Continue scrolling instead of crashing
              return; // Exit this function and let the outer loop continue scrolling
            }
            // Select a new random tweet and continue with validation
            const newRandomIndex = Math.floor(Math.random() * validTweets.length);
            const newSelectedTweet = validTweets[newRandomIndex];
            log(`Selected new tweet ${newRandomIndex + 1} of ${validTweets.length} remaining valid tweets.`, profileId);
            // Continue with the new tweet validation
            selectedTweet = newSelectedTweet;
            // Re-run the English check on the new tweet
            const newEnglishCharCount = (selectedTweet.text.match(/[a-zA-Z]/g) || []).length;
            const newTweetLength = selectedTweet.text.length;
            const newEnglishRatio = newEnglishCharCount / newTweetLength;
            if (newEnglishRatio < 0.3) {
              log(`New selected tweet is also not primarily English, continuing to scroll...`, profileId);
              return; // Exit and continue scrolling
            }
          }
          
                    // Only reject if text is completely unreadable, not just has some special characters
          // Count all printable characters (including non-Latin scripts like Arabic, Chinese, etc.)
          const readableCharCount = (selectedTweet.text.match(/[\p{L}\p{N}\s]/gu) || []).length;
          const totalCharCount = selectedTweet.text.length;
          const readabilityRatio = readableCharCount / totalCharCount;
          
          if (readabilityRatio < 0.3) { // Lowered threshold since we now count all languages
            log(`Selected tweet has low readability (${(readabilityRatio * 100).toFixed(1)}%), skipping: "${selectedTweet.text.substring(0, 50)}..."`, profileId);
            // Remove this tweet from validTweets and continue searching instead of crashing
            validTweets.splice(randomIndex, 1);
            if (validTweets.length === 0) {
              log(`No more valid tweets available after removing low readability content, continuing to scroll...`, profileId);
              return; // Exit this function and let the outer loop continue scrolling
            }
            // Select a new random tweet and continue with validation
            const newRandomIndex = Math.floor(Math.random() * validTweets.length);
            const newSelectedTweet = validTweets[newRandomIndex];
            log(`Selected new tweet ${newRandomIndex + 1} of ${validTweets.length} remaining valid tweets.`, profileId);
            selectedTweet = newSelectedTweet;
            // Re-run the readability check on the new tweet
            const newReadableCharCount = (selectedTweet.text.match(/[\p{L}\p{N}\s]/gu) || []).length;
            const newTotalCharCount = selectedTweet.text.length;
            const newReadabilityRatio = newReadableCharCount / newTotalCharCount;
            if (newReadabilityRatio < 0.3) {
              log(`New selected tweet also has low readability, continuing to scroll...`, profileId);
              return; // Exit and continue scrolling
            }
          }
      
      // Check for reasonable text quality
      const hasReadableText = /[a-zA-Z]/.test(selectedTweet.text);
      const hasReasonableLength = selectedTweet.text.length >= 10 && selectedTweet.text.length <= 500;
      const corruptedCharCount = (selectedTweet.text.match(/[^\x00-\x7F]/g) || []).length;
      const corruptedRatio = corruptedCharCount / totalCharCount;
    
    if (!hasReadableText || !hasReasonableLength || corruptedRatio > 0.3) {
      log(`Selected tweet failed quality checks - text: "${selectedTweet.text.substring(0, 50)}..."`, profileId);
      // Remove this tweet from validTweets and continue searching instead of crashing
      validTweets.splice(randomIndex, 1);
      if (validTweets.length === 0) {
        log(`No more valid tweets available after quality check failure, continuing to scroll...`, profileId);
        return; // Exit this function and let the outer loop continue scrolling
      }
      // Select a new random tweet and continue with validation
      const newRandomIndex = Math.floor(Math.random() * validTweets.length);
      const newSelectedTweet = validTweets[newRandomIndex];
      log(`Selected new tweet ${newRandomIndex + 1} of ${validTweets.length} remaining valid tweets.`, profileId);
      selectedTweet = newSelectedTweet;
      // Re-run the quality check on the new tweet
      const newHasReadableText = /[a-zA-Z]/.test(selectedTweet.text);
      const newHasReasonableLength = selectedTweet.text.length >= 10 && selectedTweet.text.length <= 500;
      const newCorruptedCharCount = (selectedTweet.text.match(/[^\x00-\x7F]/g) || []).length;
      const newCorruptedRatio = newCorruptedCharCount / selectedTweet.text.length;
      if (!newHasReadableText || !newHasReasonableLength || newCorruptedRatio > 0.3) {
        log(`New selected tweet also failed quality checks, continuing to scroll...`, profileId);
        return; // Exit and continue scrolling
      }
    }
    
    // Final safety check - verify this isn't an ad before proceeding
    // Skip this check for Telegram requests since user provides direct link
    if (!options.targetSpecificTweet) {
      let attempts = 0;
      const maxAttempts = Math.min(validTweets.length, 5); // Try up to 5 times or until no tweets left
      
      while (attempts < maxAttempts) {
        const isFinalAd = await page.evaluate((tweet) => {
          const tweetText = tweet.innerText || tweet.textContent || '';
          const adKeywords = ['promoted', 'sponsored', 'advertisement', 'upgrade to premium', 'subscribe', 'webinar', 'register to'];
          return adKeywords.some(keyword => tweetText.toLowerCase().includes(keyword.toLowerCase()));
        }, selectedTweet.element);
        
        if (!isFinalAd) {
          log(`Final safety check passed: Selected tweet is not promotional content`, profileId);
          break; // Found a good tweet, exit the loop
        }
        
        attempts++;
        log(`Final safety check: Selected tweet is promotional content (attempt ${attempts}/${maxAttempts}), trying to find another tweet...`, profileId);
        
        // Remove this tweet from validTweets and try again
        validTweets.splice(randomIndex, 1);
        
        if (validTweets.length === 0) {
          log(`No more valid tweets available in current batch, continuing to scroll for more tweets...`, profileId);
          // Continue scrolling to find more tweets instead of quitting
          break; // Exit the promotional content check loop and continue with scrolling
        }
        
        // Select a new random tweet
        randomIndex = Math.floor(Math.random() * validTweets.length);
        selectedTweet = validTweets[randomIndex];
        log(`Selected new tweet ${randomIndex + 1} of ${validTweets.length} remaining valid tweets.`, profileId);
        log(`New selected tweet: "${selectedTweet.text.substring(0, 100)}..."`, profileId);
      }
      
      if (attempts >= maxAttempts) {
        log(`Failed to find non-promotional tweet after ${maxAttempts} attempts, aborting automation`, profileId);
        throw new Error('Could not find non-promotional tweet after multiple attempts');
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
        actionResult = await executeRetweetAction(page, selectedTweet.element, profileId, selectedTweet.text, options);
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
      tweet: selectedTweet.text,
      // Add detailed session information
      sessionDuration: Math.round(actualDuration / 60),
      engagementsPerformed: interactionsPerformed,
      tweetsProcessed: tweetsProcessed,
      interactionsBreakdown: {
        likes: likesGiven,
        retweets: retweetsGiven,
        bookmarks: bookmarksAdded
      }
    };
    updateScheduleStatus(profileId, 'completed', null, result);
    
    // FIX: Mark profile execution as complete to clear the "executing" status
    markProfileExecutionComplete(profileId);
    
    // Send success notification
    await sendNotification(
      `Twitter AI Automation Success - ${profileId}`,
      `Profile: ${profileId}\nAction: ${actionType.toUpperCase()}\nStatus: ${actionResult.status}\nMessage: ${actionResult.message}\n\nTweet: "${selectedTweet.text}"\n${actionResult.comment ? `\nComment: "${actionResult.comment}"` : ''}`
    );

    return result;

  } catch (err) {
    log(`Error in automation: ${err.message}`, profileId);
    updateScheduleStatus(profileId, 'failed', err.message);
    
    // FIX: Mark profile execution as complete even on error to clear the "executing" status
    markProfileExecutionComplete(profileId);
    
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
  
  // Global cooldown disabled for scheduled execution
  // Profiles run according to their individual schedule times
  
  // Check if any profile is currently executing - if so, skip this check
  if (executingProfiles.size > 0) {
    const executingList = Array.from(executingProfiles).join(', ');
    log(`Profiles currently executing: ${executingList}, skipping schedule check`, 'SYSTEM');
    return;
  }
  
  // Check if any profile was recently completed (within last 5 minutes) - but still allow other due profiles to run
  const recentlyCompleted = Array.from(recentlyExecutedProfiles.entries())
    .filter(([profileId, timestamp]) => {
      const timeSinceCompletion = (Date.now() - timestamp.getTime()) / (1000 * 60);
      return timeSinceCompletion < 5; // Check if completed within last 5 minutes
    });
  
  if (recentlyCompleted.length > 0) {
    const completedList = recentlyCompleted.map(([profileId]) => profileId).join(', ');
    log(`Profiles recently completed: ${completedList}, but continuing with schedule check`, 'SYSTEM');
    // Don't return - continue with schedule check to allow other due profiles to run
  }
  
  const nextProfile = getNextScheduledProfile(isImmediateRun);
  
  if (nextProfile) {
    // Get current time in CET timezone
    const utcNow = new Date();
    const cetOffset = 1; // CET is UTC+1
    const now = new Date(utcNow.getTime() + (cetOffset * 60 * 60 * 1000));
    
    const scheduledTime = new Date(nextProfile.scheduledTime);
    const timeDiff = Math.round((now.getTime() - scheduledTime.getTime()) / 1000);
    log(`Found scheduled profile ready to run: ${nextProfile.profileId} (${nextProfile.actionType.toUpperCase()}) - scheduled for ${scheduledTime.toLocaleTimeString()}, started ${timeDiff}s ${timeDiff > 0 ? 'late' : 'early'}${isImmediateRun ? ' [IMMEDIATE RUN]' : ''}`);
    
    // Double-check profile is not already executing
    if (executingProfiles.has(nextProfile.profileId)) {
      log(`Profile ${nextProfile.profileId} is already executing, skipping`, 'SYSTEM');
      return;
    }
    
    // Find the actual profile data
    const profile = profiles.find(p => p.id === nextProfile.profileId);
    if (profile) {
      // Mark profile as executing to prevent duplicates
      markProfileExecuting(nextProfile.profileId);
      
      // Execute immediately without delay
      log(`Starting automation immediately for ${profile.id}`, profile.id);
      
      try {
        await automateTwitterWithAI(profile, nextProfile.actionType);
      } catch (error) {
        // Only mark as failed if the automation function didn't already handle it
        log(`Schedule execution failed for ${nextProfile.profileId}: ${error.message}`, 'SYSTEM');
        updateScheduleStatus(nextProfile.profileId, 'failed', error.message);
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

// DISABLED: Run automation for a random profile with random action (scheduled execution)
// This function is disabled to prevent conflicts with the scheduled system
async function runRandomProfileAutomation() {
  // Global cooldown disabled - profiles run according to schedule
  
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
  } catch (error) {
    // Only mark as failed if the automation function didn't already handle it
    log(`Random execution failed for ${selectedProfile.id}: ${error.message}`, 'SYSTEM');
    updateScheduleStatus(selectedProfile.id, 'failed', error.message);
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
      if (profile.completed || profile.status === 'completed') {
        // Reset only completed profiles (not failed ones)
        profile.completed = false;
        profile.status = 'scheduled';
        profile.lastUpdated = new Date().toISOString();
        
        // Remove completion data
        delete profile.completedAt;
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

// Clean up schedule when profiles are removed
function cleanupRemovedProfiles() {
  try {
    if (!fs.existsSync(SCHEDULE_FILE)) {
      return;
    }
    
    const scheduleData = JSON.parse(fs.readFileSync(SCHEDULE_FILE, 'utf8'));
    const profiles = loadProfiles();
    const validProfileIds = profiles.map(p => p.id);
    
    // Remove schedule entries for profiles that no longer exist
    const originalCount = scheduleData.profiles.length;
    scheduleData.profiles = scheduleData.profiles.filter(profile => 
      validProfileIds.includes(profile.profileId)
    );
    
    const removedCount = originalCount - scheduleData.profiles.length;
    if (removedCount > 0) {
      fs.writeFileSync(SCHEDULE_FILE, JSON.stringify(scheduleData, null, 2));
      log(`Cleaned up ${removedCount} removed profile(s) from schedule`);
    }
  } catch (error) {
    log(`Error cleaning up removed profiles: ${error.message}`);
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
  
  // Clean up any removed profiles from schedule
  cleanupRemovedProfiles();
  
  // Load or create schedule
  currentSchedule = loadOrCreateSchedule();
  
  // Display schedule summary
  displayScheduleSummary();
  
  // Only set up cron jobs if this is the main automation script, not when imported by Telegram bot
  if (require.main === module) {
    // Set up schedule checker to run every minute
    const scheduleChecker = new CronJob('* * * * *', checkSchedule, null, true);
    log('Schedule checker started - checking every minute for due profiles');
    
    // Set up schedule recreation every 24 hours
    const scheduleRecreator = new CronJob('0 0 * * *', () => {
      log('24-hour period completed, creating new schedule');
      currentSchedule = createSchedule();
      displayScheduleSummary();
    }, null, true);
    
      // IMMEDIATE EXECUTION: Start the first available profile immediately
  setTimeout(async () => {
    log('Starting immediate execution of first available profile...');
    const immediateProfile = getNextScheduledProfile(true); // Force immediate run
    if (immediateProfile) {
      log(`Found immediate profile to run: ${immediateProfile.profileId} (${immediateProfile.actionType.toUpperCase()})`);
      // Find the profile object and execute it
      const profile = profiles.find(p => p.id === immediateProfile.profileId);
      if (profile) {
        log(`Starting automation for ${immediateProfile.profileId} with action: ${immediateProfile.actionType}`);
        // Mark as executing to prevent schedule checker from picking it up
        markProfileExecuting(immediateProfile.profileId);
        await automateTwitterWithAI(profile, immediateProfile.actionType);
      } else {
        log(`Profile ${immediateProfile.profileId} not found in profiles list`);
      }
    } else {
      log('No profiles available for immediate execution');
    }
  }, 5000); // Wait 5 seconds after startup to ensure everything is loaded
  } else {
    log('Skipping cron job setup (imported by Telegram bot)');
  }
  
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

// Initialize and start
log('=== MULTI-PROFILE TWITTER AI AUTOMATION STARTING ===');
log('Actions available: COMMENT, LIKE, RETWEET');

// Initialize action trackers
initializeActionTracker();
initializeEnhancedTracker();

if (initializeProfiles()) {
  // Initialize comprehensive scheduling system
  initializeScheduling();
  
  log('Multi-profile AI Twitter automation system started successfully!');
  log('- Main scheduler: DISABLED (random profile execution) - using scheduled system only');
  log('- Schedule checker: Every minute');
  log('- Daily report: 11:59 PM');
  
  // Only set up cron jobs and run immediately if this is the main automation script, not when imported by Telegram bot
  if (require.main === module) {
    // DISABLED: Random profile execution to prevent conflicts with scheduled system
    // const mainJob = new CronJob('0 */3 * * *', runRandomProfileAutomation, null, true, 'America/Los_Angeles');
    
    // Daily report job
    const reportJob = new CronJob('59 23 * * *', generateDailyReport, null, true);
    
    log('Skipping immediate random execution - using scheduled system only');
    // runRandomProfileAutomation(); // DISABLED to prevent conflicts
  } else {
    log('Skipping immediate execution and cron jobs (imported by Telegram bot)');
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
  initializeProfiles,
  initializeScheduling,
  ACTION_TYPES
};



