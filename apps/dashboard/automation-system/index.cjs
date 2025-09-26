const puppeteer = require('puppeteer-core');
const nodemailer = require('nodemailer');
const CronJob = require('cron').CronJob;
const fs = require('fs');

// Configuration
const ADS_LOCAL_URL = 'http://local.adspower.net:50325';
const PROFILES_CONFIG = 'profiles.json';
const SCHEDULE_FILE = 'schedule.json';
const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY;
const PERPLEXITY_API_URL = 'https://api.perplexity.ai/chat/completions';
const EMAIL_CONFIG = {
  service: 'gmail',
  auth: { user: 'your.email@gmail.com', pass: 'your-app-password' },
  to: 'your.email@gmail.com'
};
const LOG_FILE = 'automation-log.txt';

// Action types
const ACTION_TYPES = ['comment', 'like', 'retweet'];

// Tweet selectors
const TWEET_SELECTORS = [
  'div[data-testid="tweet"]',
  'article[data-testid="tweet"]',
  'div[data-testid="cellInnerDiv"]',
  'article[role="article"]',
  '[data-testid="tweet"]'
];

// Action selectors
const ACTION_SELECTORS = {
  like: [
    'div[data-testid="like"]',
    '[data-testid="like"]',
    'div[aria-label="Like"]',
    'button[aria-label="Like"]'
  ],
  retweet: [
    'div[data-testid="retweet"]',
    '[data-testid="retweet"]',
    'div[aria-label="Repost"]',
    'button[aria-label="Repost"]'
  ],
  reply: [
    'div[data-testid="reply"]',
    '[data-testid="reply"]',
    'div[aria-label="Reply"]',
    'button[aria-label="Reply"]'
  ]
};

// Global variables
let scheduledJobs = new Map();
let profiles = [];

// Helper functions
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function log(message, profileId = 'SYSTEM') {
  const timestamp = new Date().toISOString();
  const entry = `[${timestamp}][${profileId}] ${message}`;
  fs.appendFileSync(LOG_FILE, entry + '\n');
  console.log(entry);
}

function getRandomNumber(min = 10, max = 150) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Select random action type
function getRandomActionType() {
  return ACTION_TYPES[Math.floor(Math.random() * ACTION_TYPES.length)];
}

// Load profiles configuration
function loadProfiles() {
  try {
    if (!fs.existsSync(PROFILES_CONFIG)) {
      throw new Error('profiles.json not found');
    }
    const data = fs.readFileSync(PROFILES_CONFIG, 'utf8');
    const config = JSON.parse(data);
    return config.profiles.filter(profile => profile.active);
  } catch (err) {
    log(`Error loading profiles: ${err.message}`);
    return [];
  }
}

// Generate random time within next 24 hours
function generateRandomTime() {
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  
  const minTime = now.getTime() + (60 * 60 * 1000); // 1 hour from now
  const maxTime = tomorrow.getTime();
  
  const randomTime = new Date(minTime + Math.random() * (maxTime - minTime));
  return randomTime;
}

// Create 24-hour schedule for all profiles with random actions
function create24HourSchedule() {
  log('Creating new 24-hour schedule with random actions');
  
  const schedule = {
    created: new Date().toISOString(),
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    profiles: []
  };
  
  // Select a random profile for immediate execution (1 minute delay)
  const randomProfileIndex = Math.floor(Math.random() * profiles.length);
  
  profiles.forEach((profile, index) => {
    let scheduledTime;
    let actionType;
    
    if (index === randomProfileIndex) {
      // CRITICAL: Schedule this random profile to run after 1 minute with COMMENT action
      // This ensures the first action is ALWAYS a comment as agreed
      scheduledTime = new Date(Date.now() + 60 * 1000); // 1 minute from now
      actionType = 'comment'; // ALWAYS comment for immediate execution - NEVER change this!
      log(`Selected profile ${profile.id} for immediate COMMENT execution (1 minute delay)`, profile.id);
    } else {
      // Use the original random time generation for other profiles
      scheduledTime = generateRandomTime();
      actionType = getRandomActionType(); // Random action for non-immediate profiles
    }
    
    schedule.profiles.push({
      profileId: profile.id,
      adspower_id: profile.adspower_id,
      scheduledTime: scheduledTime.toISOString(),
      actionType: actionType,
      status: 'scheduled',
      completed: false,
      isImmediateExecution: index === randomProfileIndex // Flag to identify the immediate profile
    });
    
    const cetTime = scheduledTime.toLocaleString('en-GB', { 
      timeZone: 'Europe/Berlin', 
      year: 'numeric', 
      month: '2-digit', 
      day: '2-digit', 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
    log(`Scheduled ${profile.id} for ${actionType.toUpperCase()} at ${cetTime} CET`, profile.id);
  });
  
  // Save schedule to file
  fs.writeFileSync(SCHEDULE_FILE, JSON.stringify(schedule, null, 2));
  log(`Schedule created for ${schedule.profiles.length} profiles`);
  
  return schedule;
}


// Load existing schedule or create new one
function loadOrCreateSchedule() {
  try {
    if (fs.existsSync(SCHEDULE_FILE)) {
      const data = fs.readFileSync(SCHEDULE_FILE, 'utf8');
      const schedule = JSON.parse(data);
      
      const expiryTime = new Date(schedule.expires);
      const now = new Date();
      
      if (now > expiryTime) {
        log('Existing schedule expired, creating new one');
        return create24HourSchedule();
      } else {
        log('Loading existing schedule');
        return schedule;
      }
    } else {
      log('No existing schedule found, creating new one');
      return create24HourSchedule();
    }
  } catch (err) {
    log(`Error loading schedule: ${err.message}`);
    return create24HourSchedule();
  }
}

// Update schedule status
function updateScheduleStatus(profileId, status, error = null, result = null) {
  try {
    const data = fs.readFileSync(SCHEDULE_FILE, 'utf8');
    const schedule = JSON.parse(data);
    
    const profileSchedule = schedule.profiles.find(p => p.profileId === profileId);
    if (profileSchedule) {
      profileSchedule.status = status;
      profileSchedule.completed = status === 'completed' || status === 'failed';
      profileSchedule.completedAt = new Date().toISOString();
      if (error) profileSchedule.error = error;
      if (result) profileSchedule.result = result;
    }
    
    fs.writeFileSync(SCHEDULE_FILE, JSON.stringify(schedule, null, 2));
  } catch (err) {
    log(`Error updating schedule: ${err.message}`);
  }
}

// Generate comment using Perplexity API
async function generateComment(tweetText, persona, profileId) {
  try {
    const prompt = `Based on this tweet: "${tweetText}"

Create a thoughtful, engaging comment that would fit naturally in a Twitter conversation. Keep it under 280 characters, make it relevant to the tweet content, and maintain a conversational tone. Avoid being overly promotional or robotic.`;

    const response = await fetch(PERPLEXITY_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${PERPLEXITY_API_KEY}`
      },
      body: JSON.stringify({
        model: 'sonar',
        messages: [
          { role: 'system', content: persona },
          { role: 'user', content: prompt }
        ],
        max_tokens: 150,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const comment = data.choices[0].message.content.trim();
    const cleanComment = comment.replace(/^["']|["']$/g, '');
    
    log(`Generated comment: "${cleanComment}"`, profileId);
    return cleanComment;
  } catch (err) {
    log(`Error generating comment: ${err.message}`, profileId);
    return "Interesting perspective! Thanks for sharing.";
  }
}

// Send email notification
async function sendNotification(subject, body) {
  try {
    // Temporarily disable email notifications due to invalid credentials
    log(`Email notification disabled: ${subject} - ${body}`);
    return;
    
    const transporter = nodemailer.createTransporter(EMAIL_CONFIG);
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

// Wait for any selector
async function waitForAnySelector(page, selectors, timeout = 10000) {
  for (let i = 0; i < selectors.length; i++) {
    try {
      await page.waitForSelector(selectors[i], { timeout: timeout / selectors.length });
      return selectors[i];
    } catch (err) {
      continue;
    }
  }
  throw new Error('None of the selectors found');
}

// Check if logged in
async function checkLoginStatus(page) {
  try {
    const loginIndicators = [
      'div[data-testid="SideNav_NewTweet_Button"]',
      'a[aria-label="Home"]',
      'div[data-testid="primaryColumn"]',
      'nav[aria-label="Primary"]'
    ];
    
    for (const selector of loginIndicators) {
      const element = await page.$(selector);
      if (element) return true;
    }
    
    const url = page.url();
    if (url.includes('/login') || url.includes('/i/flow/login')) {
      return false;
    }
    
    return false;
  } catch (err) {
    return false;
  }
}

// Execute LIKE action - improved version
async function executeLikeAction(page, tweet, profileId) {
  try {
    // Scroll tweet into view first
    await tweet.scrollIntoView({ behavior: 'smooth', block: 'center' });
    await sleep(1500);
    
    // Find like button with better targeting
    let likeButton = null;
    const likeSelectors = [
      '[data-testid="like"]',
      '[aria-label*="like" i]',
      '[role="button"][aria-label*="like" i]'
    ];
    
    for (const selector of likeSelectors) {
      const buttons = await tweet.$$(selector);
      if (buttons.length > 0) {
        likeButton = buttons[0];
        break;
      }
    }
    
    if (!likeButton) {
      throw new Error('Like button not found');
    }
    
    // Check if already liked
    const isLiked = await page.evaluate((button) => {
      const testId = button.getAttribute('data-testid');
      const ariaPressed = button.getAttribute('aria-pressed');
      return testId === 'unlike' || ariaPressed === 'true';
    }, likeButton);
    
    if (isLiked) {
      log('Tweet already liked, skipping', profileId);
      return { success: true, message: 'Already liked' };
    }
    
    // Ensure button is clickable
    await page.waitForFunction(
      (button) => {
        const rect = button.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0 && button.offsetParent !== null;
      },
      {},
      likeButton
    );
    
    // Click with better precision
    const buttonBox = await likeButton.boundingBox();
    if (buttonBox) {
      await page.mouse.click(
        buttonBox.x + buttonBox.width / 2,
        buttonBox.y + buttonBox.height / 2
      );
    } else {
      await likeButton.click();
    }
    
    log('Tweet liked successfully', profileId);
    await sleep(2000);
    return { success: true, message: 'Tweet liked' };
    
  } catch (err) {
    throw new Error(`Like action failed: ${err.message}`);
  }
}

// Execute RETWEET action - improved version
async function executeRetweetAction(page, tweet, profileId) {
  try {
    // Scroll tweet into view first
    await tweet.scrollIntoView({ behavior: 'smooth', block: 'center' });
    await sleep(1500);
    
    // Find retweet button with better targeting
    let retweetButton = null;
    const retweetSelectors = [
      '[data-testid="retweet"]',
      '[aria-label*="repost" i]',
      '[role="button"][aria-label*="repost" i]'
    ];
    
    for (const selector of retweetSelectors) {
      const buttons = await tweet.$$(selector);
      if (buttons.length > 0) {
        retweetButton = buttons[0];
        break;
      }
    }
    
    if (!retweetButton) {
      throw new Error('Retweet button not found');
    }
    
    // Ensure button is clickable
    await page.waitForFunction(
      (button) => {
        const rect = button.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0 && button.offsetParent !== null;
      },
      {},
      retweetButton
    );
    
    // Click with better precision
    const buttonBox = await retweetButton.boundingBox();
    if (buttonBox) {
      await page.mouse.click(
        buttonBox.x + buttonBox.width / 2,
        buttonBox.y + buttonBox.height / 2
      );
    } else {
      await retweetButton.click();
    }
    
    log('Retweet button clicked', profileId);
    await sleep(3000);
    
    // Handle confirmation dialog with improved selectors
    const confirmSelectors = [
      '[data-testid="retweetConfirm"]',
      '[role="menuitem"]',
      'div[role="button"]:has-text("Repost")',
      'div[role="button"] span:has-text("Repost")'
    ];
    
    let confirmClicked = false;
    for (const selector of confirmSelectors) {
      try {
        const confirmButton = await page.waitForSelector(selector, { timeout: 5000 });
        if (confirmButton) {
          await confirmButton.click();
          confirmClicked = true;
          log('Retweet confirmed', profileId);
          break;
        }
      } catch (err) {
        continue;
      }
    }
    
    if (!confirmClicked) {
      log('No confirmation dialog found, assuming direct retweet', profileId);
    }
    
    await sleep(2000);
    return { success: true, message: 'Tweet retweeted' };
    
  } catch (err) {
    throw new Error(`Retweet action failed: ${err.message}`);
  }
}


// Execute COMMENT action (existing functionality)
async function executeCommentAction(page, tweet, profile, profileId, tweetText) {
  try {
    // Click tweet
    await tweet.click();
    await sleep(3000);
    
    // Find reply button
    let replyClicked = false;
    for (const selector of ACTION_SELECTORS.reply) {
      try {
        await page.waitForSelector(selector, { timeout: 3000 });
        await page.click(selector);
        replyClicked = true;
        log('Reply button clicked', profileId);
        break;
      } catch (err) {
        continue;
      }
    }
    
    if (!replyClicked) throw new Error('Reply button not found');
    
    await sleep(2000);

    // Generate AI comment
    const aiComment = await generateComment(tweetText, profile.persona, profileId);

    // Type comment
    const composeSelectors = [
      'div[aria-label="Tweet text"]',
      'div[role="textbox"]',
      'div[contenteditable="true"]',
      '[data-testid="tweetTextarea_0"]'
    ];
    
    let commentTyped = false;
    for (const selector of composeSelectors) {
      try {
        await page.waitForSelector(selector, { timeout: 3000 });
        await page.click(selector);
        await sleep(500);
        await page.type(selector, aiComment, { delay: 50 });
        commentTyped = true;
        log(`Comment typed: "${aiComment}"`, profileId);
        break;
      } catch (err) {
        continue;
      }
    }
    
    if (!commentTyped) throw new Error('Could not type comment');

    await sleep(3000);
    
    // Post comment
    const postSelectors = [
      'div[data-testid="tweetButton"]',
      '[data-testid="tweetButton"]',
      'div[data-testid="tweetButtonInline"]'
    ];
    
    let postClicked = false;
    for (const selector of postSelectors) {
      try {
        await page.waitForSelector(selector, { timeout: 3000 });
        const isEnabled = await page.evaluate((sel) => {
          const button = document.querySelector(sel);
          return button && !button.disabled;
        }, selector);
        
        if (isEnabled) {
          await page.click(selector);
          postClicked = true;
          log('Comment posted successfully', profileId);
          break;
        }
      } catch (err) {
        continue;
      }
    }
    
    if (!postClicked) {
      log('Could not post comment', profileId);
      return { success: false, message: 'Comment typed but not posted', comment: aiComment };
    }

    await sleep(3000);
    return { success: true, message: 'Comment posted', comment: aiComment };
    
  } catch (err) {
    throw new Error(`Comment action failed: ${err.message}`);
  }
}

// Core automation function with action selection
async function automateProfileWithAction(profileId) {
  let browser;
  
  try {
    log('Starting scheduled automation', profileId);
    updateScheduleStatus(profileId, 'running');

    // Find profile data and scheduled action
    const profile = profiles.find(p => p.id === profileId);
    if (!profile) {
      throw new Error('Profile not found');
    }

    // Get scheduled action type
    const scheduleData = JSON.parse(fs.readFileSync(SCHEDULE_FILE, 'utf8'));
    const profileSchedule = scheduleData.profiles.find(p => p.profileId === profileId);
    const actionType = profileSchedule?.actionType || 'like';

    log(`Executing ${actionType.toUpperCase()} action`, profileId);

    // Start AdsPower profile
    const startUrl = `${ADS_LOCAL_URL}/api/v1/browser/start?user_id=${profile.adspower_id}`;
    const startResponse = await fetch(startUrl);
    if (!startResponse.ok) throw new Error(`Failed to start profile: ${startResponse.statusText}`);
    const startData = await startResponse.json();
    if (startData.code !== 0) throw new Error(`AdsPower error: ${startData.msg}`);
    const wsEndpoint = startData.data.ws.puppeteer;
    log('AdsPower profile started', profileId);

    // Connect Puppeteer
    browser = await puppeteer.connect({ 
      browserWSEndpoint: wsEndpoint, 
      defaultViewport: null 
    });
    const page = await browser.newPage();
    log('Puppeteer connected', profileId);

    // Navigate to X.com
    await page.goto('https://x.com/home', { waitUntil: 'networkidle2' });
    log(`Navigated to: ${page.url()}`, profileId);

    // Check login status
    const isLoggedIn = await checkLoginStatus(page);
    if (!isLoggedIn) {
      throw new Error('Not logged in to X.com');
    }
    log('Login verified', profileId);

    // Wait and scroll
    await sleep(3000);
    
    await page.evaluate(async () => {
      return new Promise((resolve) => {
        let totalScrolled = 0;
        const scrollStep = 200;
        const maxScroll = 2000;
        
        function scrollPage() {
          if (totalScrolled < maxScroll) {
            window.scrollBy(0, scrollStep);
            totalScrolled += scrollStep;
            setTimeout(scrollPage, 300);
          } else {
            resolve();
          }
        }
        scrollPage();
      });
    });
    log('Scrolled timeline', profileId);

    await sleep(2000);

    // Find tweets
    const workingSelector = await waitForAnySelector(page, TWEET_SELECTORS, 15000);
    const tweets = await page.$$(workingSelector);
    
    if (tweets.length === 0) {
      throw new Error('No tweets found');
    }
    
    log(`Found ${tweets.length} tweets`, profileId);

    // Filter valid tweets and get text for comments
    let validTweets = [];
    for (let i = 0; i < Math.min(tweets.length, 10); i++) {
      try {
        // Check if this is an ad or promotional content first
        const isAd = await page.evaluate((tweet) => {
          // Check for ad indicators
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
        }, tweets[i]);
        
        if (isAd) {
          log(`Tweet ${i + 1} detected as ad/promotional content, skipping`, profileId);
          continue;
        }
        
        // Check for external links
        const hasExternalLinks = await page.evaluate((tweet) => {
          const links = tweet.querySelectorAll('a[href]');
          for (const link of links) {
            const href = link.getAttribute('href');
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
        
        let tweetText = '';
        
        // Only extract text if we need it for comments
        if (actionType === 'comment') {
          tweetText = await page.evaluate((tweet) => {
            const textSelectors = [
              'div[data-testid="tweetText"]',
              '[data-testid="tweetText"]',
              '.css-1dbjc4n .css-901oao',
              '.r-37j5jr',
              '[dir="auto"]'
            ];
            
            for (const selector of textSelectors) {
              const textElement = tweet.querySelector(selector);
              if (textElement && textElement.innerText.trim().length > 10) {
                return textElement.innerText.trim();
              }
            }
            return null;
          }, tweets[i]);
          
          // Additional text-based filtering for promotional content
          if (tweetText) {
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
            validTweets.push({ element: tweets[i], text: tweetText });
          }
        } else {
          // For likes and retweets, we don't need text content but still need to verify it's not an ad
          validTweets.push({ element: tweets[i], text: '' });
        }
      } catch (err) {
        continue;
      }
    }

    if (validTweets.length === 0) {
      throw new Error('No valid tweets found');
    }

    // Select random tweet
    const randomIndex = Math.floor(Math.random() * validTweets.length);
    const selectedTweet = validTweets[randomIndex];
    
    if (selectedTweet.text) {
      log(`Selected tweet: "${selectedTweet.text}"`, profileId);
    } else {
      log(`Selected tweet #${randomIndex + 1} for ${actionType}`, profileId);
    }

    // Execute the scheduled action
    let actionResult;
    switch (actionType) {
      case 'like':
        actionResult = await executeLikeAction(page, selectedTweet.element, profileId);
        break;
      case 'retweet':
        actionResult = await executeRetweetAction(page, selectedTweet.element, profileId);
        break;
      case 'comment':
        actionResult = await executeCommentAction(page, selectedTweet.element, profile, profileId, selectedTweet.text);
        break;
      default:
        throw new Error(`Unknown action type: ${actionType}`);
    }

    await sleep(3000);

    // Cleanup
    await browser.disconnect();
    await fetch(`${ADS_LOCAL_URL}/api/v1/browser/stop?user_id=${profile.adspower_id}`);
    log('Profile stopped successfully', profileId);
    
    updateScheduleStatus(profileId, 'completed', null, actionResult);
    
    return {
      success: true,
      profileId,
      actionType,
      actionResult,
      tweetText: selectedTweet.text || 'N/A'
    };

  } catch (err) {
    log(`Error: ${err.message}`, profileId);
    updateScheduleStatus(profileId, 'failed', err.message);
    
    // Cleanup on error
    if (browser) {
      try {
        await browser.disconnect();
      } catch (cleanupErr) {
        log(`Cleanup error: ${cleanupErr.message}`, profileId);
      }
    }
    
    try {
      const profile = profiles.find(p => p.id === profileId);
      if (profile) {
        await fetch(`${ADS_LOCAL_URL}/api/v1/browser/stop?user_id=${profile.adspower_id}`);
      }
    } catch (stopErr) {
      log(`Stop error: ${stopErr.message}`, profileId);
    }
    
    return {
      success: false,
      profileId,
      error: err.message
    };
  }
}

// Schedule individual profile
function scheduleProfile(profileSchedule) {
  const scheduledTime = new Date(profileSchedule.scheduledTime);
  const now = new Date();
  
  if (scheduledTime <= now) {
    const delayMs = profileSchedule.isImmediateExecution ? 1000 : 1000;
    log(`Scheduled time passed, running ${profileSchedule.isImmediateExecution ? 'immediately (1 minute profile)' : 'immediately'}`, profileSchedule.profileId);
    setTimeout(() => automateProfileWithAction(profileSchedule.profileId), delayMs);
    return;
  }
  
  const delay = scheduledTime.getTime() - now.getTime();
  
  const timeoutId = setTimeout(() => {
    log(`Executing scheduled ${profileSchedule.actionType} automation`, profileSchedule.profileId);
    automateProfileWithAction(profileSchedule.profileId);
  }, delay);
  
  scheduledJobs.set(profileSchedule.profileId, timeoutId);
  
  const delayMinutes = Math.round(delay / 1000 / 60);
  const executionType = profileSchedule.isImmediateExecution ? ' (IMMEDIATE EXECUTION)' : '';
  
  log(`Scheduled ${profileSchedule.profileId} to ${profileSchedule.actionType.toUpperCase()} in ${delayMinutes} minutes${executionType}`, profileSchedule.profileId);
}


// Initialize scheduling system
function initializeScheduling() {
  log('Initializing 24-hour scheduling system with random actions');
  
  // Clear existing scheduled jobs
  scheduledJobs.forEach((timeoutId, profileId) => {
    clearTimeout(timeoutId);
    log(`Cleared existing schedule for ${profileId}`);
  });
  scheduledJobs.clear();
  
  // Load or create schedule
  const schedule = loadOrCreateSchedule();
  
  // Schedule each profile
  schedule.profiles.forEach(profileSchedule => {
    if (!profileSchedule.completed) {
      scheduleProfile(profileSchedule);
    } else {
      log(`Profile ${profileSchedule.profileId} already completed ${profileSchedule.actionType} for this period`);
    }
  });
  
  // Schedule next 24-hour reset
  const nextReset = new Date(schedule.expires);
  const now = new Date();
  const resetDelay = nextReset.getTime() - now.getTime();
  
  if (resetDelay > 0) {
    setTimeout(() => {
      log('24-hour period expired, reinitializing scheduling system');
      initializeScheduling();
    }, resetDelay);
    
    log(`Next schedule reset in ${Math.round(resetDelay / 1000 / 60 / 60)} hours`);
  } else {
    setTimeout(() => initializeScheduling(), 1000);
  }
}

// Application initialization
async function initializeApplication() {
  log('=== TWITTER AUTOMATION APPLICATION STARTING ===');
  log('Actions available: COMMENT, LIKE, RETWEET');
  
  // Load profiles
  profiles = loadProfiles();
  
  if (profiles.length === 0) {
    log('ERROR: No active profiles found. Please check profiles.json');
    return;
  }
  
  log(`Loaded ${profiles.length} active profiles`);
  
  // Initialize scheduling system
  initializeScheduling();
  
  log('=== APPLICATION INITIALIZATION COMPLETE ===');
}

// Enhanced daily status report
function generateDailyReport() {
  try {
    if (!fs.existsSync(SCHEDULE_FILE)) return;
    
    const data = fs.readFileSync(SCHEDULE_FILE, 'utf8');
    const schedule = JSON.parse(data);
    
    const completed = schedule.profiles.filter(p => p.status === 'completed').length;
    const failed = schedule.profiles.filter(p => p.status === 'failed').length;
    const pending = schedule.profiles.filter(p => !p.completed).length;
    
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
    
    const report = `Daily Twitter Automation Report:
- Total Profiles: ${schedule.profiles.length}
- Completed: ${completed}
- Failed: ${failed}
- Pending: ${pending}

Action Distribution:
- Comments Scheduled: ${actionCounts.comment} (Completed: ${completedActions.comment})
- Likes Scheduled: ${actionCounts.like} (Completed: ${completedActions.like})
- Retweets Scheduled: ${actionCounts.retweet} (Completed: ${completedActions.retweet})

- Schedule Created: ${new Date(schedule.created).toLocaleString()}
- Schedule Expires: ${new Date(schedule.expires).toLocaleString()}`;
    
    log('Daily report generated with action breakdown');
    sendNotification('Daily Twitter Automation Report', report);
  } catch (err) {
    log(`Error generating daily report: ${err.message}`);
  }
}

// Schedule daily report at 11:59 PM
const reportJob = new CronJob('59 23 * * *', generateDailyReport, null, true);

// Start the application
// TEMPORARILY DISABLED SCHEDULER FOR MANUAL TESTING
// initializeApplication();
console.log('Scheduler disabled for manual testing');
