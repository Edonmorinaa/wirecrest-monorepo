// Command handler module for Telegram bot
const fs = require('fs');

class CommandHandler {
  constructor(bot, config) {
    this.bot = bot;
    this.config = config;
    this.userSessions = new Map();
    this.rateLimitMap = new Map();
  }

  // Rate limiting
  isRateLimited(userId) {
    const now = Date.now();
    const userRequests = this.rateLimitMap.get(userId) || [];
    
    const recentRequests = userRequests.filter(time => now - time < 60000);
    
    if (recentRequests.length >= this.config.RATE_LIMIT.max_requests_per_minute) {
      return true;
    }
    
    recentRequests.push(now);
    this.rateLimitMap.set(userId, recentRequests);
    return false;
  }

  // Check authorization
  isAuthorizedUser(userId) {
    return this.config.ALLOWED_USERS.length === 0 || this.config.ALLOWED_USERS.includes(userId);
  }

  // Handle start command
  async handleStart(msg) {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    
    if (!this.isAuthorizedUser(userId)) {
      await this.bot.sendMessage(chatId, '❌ You are not authorized to use this bot.');
      return;
    }
    
    if (this.isRateLimited(userId)) {
      await this.bot.sendMessage(chatId, '⏳ Rate limit exceeded. Please wait a moment before trying again.');
      return;
    }
    
    const welcomeMessage = `🤖 *Enhanced Twitter Automation Bot*

Welcome! I can help you manage your Twitter automation system.

*Available Features:*
• �� Execute actions on tweets
• 📊 Check system status
• ⚙️ Manage settings
• 📈 View schedule information

Choose an option from the menu below:`;
    
    await this.bot.sendMessage(chatId, welcomeMessage, { 
      parse_mode: 'Markdown',
      reply_markup: this.createMainMenuKeyboard()
    });
  }

  // Create main menu keyboard
  createMainMenuKeyboard() {
    return {
      inline_keyboard: [
        [
          { text: '🚀 Execute Action', callback_data: 'menu_execute' },
          { text: '📊 Status', callback_data: 'menu_status' }
        ],
        [
          { text: '⚙️ Settings', callback_data: 'menu_settings' },
          { text: '❓ Help', callback_data: 'menu_help' }
        ]
      ]
    };
  }

  // Create action keyboard
  createActionKeyboard() {
    return {
      inline_keyboard: [
        [
          { text: '💬 Comment', callback_data: 'action_comment' },
          { text: '❤️ Like', callback_data: 'action_like' }
        ],
        [
          { text: '🔄 Retweet', callback_data: 'action_retweet' },
          { text: '❌ Cancel', callback_data: 'action_cancel' }
        ]
      ]
    };
  }

  // Create confirmation keyboard
  createConfirmationKeyboard() {
    return {
      inline_keyboard: [
        [
          { text: '✅ Confirm', callback_data: 'confirm_yes' },
          { text: '❌ Cancel', callback_data: 'confirm_no' }
        ]
      ]
    };
  }

  // Handle text messages
  async handleMessage(msg) {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const text = msg.text;
    
    if (!this.isAuthorizedUser(userId)) {
      return;
    }
    
    if (this.isRateLimited(userId)) {
      await this.bot.sendMessage(chatId, '⏳ Rate limit exceeded. Please wait a moment before trying again.');
      return;
    }
    
    // Skip commands
    if (text.startsWith('/')) {
      return;
    }
    
    const session = this.userSessions.get(chatId);
    
    // Check if this looks like a tweet URL
    if (text.includes('twitter.com') || text.includes('x.com')) {
      const validation = this.validateTweetUrl(text);
      
      if (!validation.valid) {
        await this.bot.sendMessage(chatId, `❌ ${validation.error}\n\nPlease send a valid Twitter/X tweet URL.`);
        return;
      }
      
      // Initialize session
      this.userSessions.set(chatId, {
        tweetUrl: text,
        tweetId: validation.tweetId,
        actionType: null,
        comment: null,
        profile: null,
        step: 'action_selection'
      });
      
      await this.bot.sendMessage(
        chatId, 
        '✅ Tweet URL received! Now choose your action:',
        this.createActionKeyboard()
      );
    } else if (session && session.step === 'waiting_for_comment') {
      // Handle comment input
      session.comment = text;
      session.step = 'confirmation';
      
      // Get random available profile
      session.profile = this.getRandomAvailableProfile();
      if (!session.profile) {
        await this.bot.sendMessage(chatId, '❌ No available profiles at the moment. Please try again later.');
        this.userSessions.delete(chatId);
        return;
      }
      
      const summary = this.formatActionSummary(session);
      await this.bot.sendMessage(chatId, summary, {
        parse_mode: 'Markdown',
        reply_markup: this.createConfirmationKeyboard()
      });
    } else {
      await this.bot.sendMessage(chatId, 'Please send me a valid Twitter/X tweet URL to get started.');
    }
  }

  // Validate tweet URL
  validateTweetUrl(url) {
    if (!url || typeof url !== 'string') {
      return { valid: false, error: 'Invalid URL format' };
    }
    
    if (!url.includes('twitter.com') && !url.includes('x.com')) {
      return { valid: false, error: 'URL must be from Twitter/X' };
    }
    
    const tweetId = this.extractTweetId(url);
    if (!tweetId) {
      return { valid: false, error: 'Could not extract tweet ID from URL' };
    }
    
    return { valid: true, tweetId };
  }

  // Extract tweet ID
  extractTweetId(url) {
    try {
      const patterns = [
        /twitter\.com\/\w+\/status\/(\d+)/,
        /x\.com\/\w+\/status\/(\d+)/,
        /twitter\.com\/i\/web\/status\/(\d+)/,
        /x\.com\/i\/web\/status\/(\d+)/
      ];
      
      for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) {
          return match[1];
        }
      }
      
      return null;
    } catch (err) {
      return null;
    }
  }

  // Get random available profile
  getRandomAvailableProfile() {
    try {
      const profilesData = fs.readFileSync('profiles.json', 'utf8');
      const allProfiles = JSON.parse(profilesData);
      const activeProfiles = allProfiles.filter(profile => profile.active);
      
      if (activeProfiles.length === 0) {
        return null;
      }
      
      const randomIndex = Math.floor(Math.random() * activeProfiles.length);
      return activeProfiles[randomIndex];
    } catch (err) {
      return null;
    }
  }

  // Format action summary
  formatActionSummary(session) {
    const actionEmoji = {
      comment: '💬',
      like: '❤️',
      retweet: '🔄'
    };
    
    return `*Action Summary:*
${actionEmoji[session.actionType]} Action: ${session.actionType.toUpperCase()}
🔗 Tweet URL: ${session.tweetUrl}
${session.actionType === 'comment' ? `💭 Comment: "${session.comment}"` : ''}
�� Profile: ${session.profile?.id || 'Auto-selected'}

Ready to execute?`;
  }

  // Get user session
  getSession(chatId) {
    return this.userSessions.get(chatId);
  }

  // Set user session
  setSession(chatId, session) {
    this.userSessions.set(chatId, session);
  }

  // Delete user session
  deleteSession(chatId) {
    this.userSessions.delete(chatId);
  }
}

module.exports = CommandHandler;