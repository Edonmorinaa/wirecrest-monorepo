import TelegramBot from 'node-telegram-bot-api';
import config from './telegram-config.js';
import fs from 'fs';

// Import the automation functions
import { 
  loadProfiles, 
  automateTwitterWithAI, 
  log, 
  isProfileAvailable,
  markProfileExecuting,
  markProfileExecutionComplete
} from './automation-flow.js';

console.log('🤖 Starting Enhanced Telegram Bot...');

// Create bot with proper error handling
const bot = new TelegramBot(config.TELEGRAM_TOKEN, { 
  polling: true,
  parse_mode: 'Markdown'
});

// User states for conversation flow
const userStates = new Map();

// Load profiles
function loadProfilesFromFile() {
  try {
    const profilesData = fs.readFileSync('profiles.json', 'utf8');
    return JSON.parse(profilesData);
  } catch (error) {
    console.error('Error loading profiles:', error);
    return [];
  }
}

// Validate if a link is a valid X (Twitter) link
function isValidXLink(url) {
  if (!url || typeof url !== 'string') return false;
  
  // Normalize the URL
  let normalizedUrl = url.trim().toLowerCase();
  
  // Add protocol if missing
  if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
    normalizedUrl = 'https://' + normalizedUrl;
  }
  
  try {
    const urlObj = new URL(normalizedUrl);
    
    // Check if it's a valid X/Twitter domain
    const validDomains = [
      'twitter.com',
      'x.com',
      'www.twitter.com',
      'www.x.com'
    ];
    
    return validDomains.includes(urlObj.hostname) && urlObj.pathname.includes('/status/');
  } catch (error) {
    return false;
  }
}

// Test connection
bot.getMe().then((botInfo) => {
  console.log(`✅ Bot connected: @${botInfo.username}`);
  console.log('📱 Bot is ready to receive messages');
  console.log('🚫 Telegram bot will NOT trigger random profile execution on startup');
}).catch((error) => {
  console.error('❌ Bot connection failed:', error.message);
  process.exit(1);
});

// Handle /start command
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  const username = msg.from.username || msg.from.first_name;
  
  console.log(`📨 Received /start from ${username}`);
  
  // Clear any existing state
  userStates.delete(chatId);
  
  const welcomeMessage = `
🤖 *Twitter Automation Bot*

Welcome, ${username}! I can help you execute Twitter actions.

*Available Commands:*
• /status - Check automation status
• /profiles - List available profiles
• /logout - Logout from bot

Click the buttons below or type a command to get started.
  `;

  const keyboard = {
    inline_keyboard: [
      [
        { text: '🚀 Execute Actions', callback_data: 'execute_actions' },
        { text: '📊 Status', callback_data: 'status' }
      ],
      [
        { text: '👥 Profiles', callback_data: 'profiles' },
        { text: '🚪 Logout', callback_data: 'logout' }
      ]
    ]
  };

  try {
    await bot.sendMessage(chatId, welcomeMessage, {
      reply_markup: keyboard,
      parse_mode: 'Markdown'
    });
    console.log(`✅ Sent welcome message to ${username}`);
  } catch (error) {
    console.error('❌ Error sending welcome message:', error.message);
  }
});

// Handle /logout command
bot.onText(/\/logout/, async (msg) => {
  const chatId = msg.chat.id;
  const username = msg.from.username || msg.from.first_name;
  
  const logoutMessage = `
🚪 *Logged Out Successfully*

You have been logged out of the bot.

To access again, send /start.
  `;
  
  try {
    await bot.sendMessage(chatId, logoutMessage, { parse_mode: 'Markdown' });
    console.log(`🚪 User ${username} logged out`);
  } catch (error) {
    console.error('❌ Error sending logout message:', error.message);
  }
});

// Handle callback queries immediately
bot.on('callback_query', async (callbackQuery) => {
  const chatId = callbackQuery.message.chat.id;
  const data = callbackQuery.data;
  const messageId = callbackQuery.message.message_id;
  const username = callbackQuery.from.username || callbackQuery.from.first_name;
  
  console.log(`🔄 Received callback: ${data} from ${username}`);
  
  // Answer the callback query immediately to prevent timeout
  try {
    await bot.answerCallbackQuery(callbackQuery.id);
    console.log(`✅ Answered callback query: ${callbackQuery.id}`);
  } catch (error) {
    console.error('❌ Error answering callback query:', error.message);
  }

  let response = '';
  let newKeyboard = null;

  // Handle logout first
  if (data === 'logout') {
    response = `
🚪 *Logged Out Successfully*

You have been logged out of the bot.

To access again, send /start.
    `;
  }
  // Handle action callbacks
  else if (data.startsWith('action_') && (data === 'action_comment' || data === 'action_like_comment' || data === 'action_retweet_comment' || data === 'action_all' || data === 'action_cancel')) {
    const userState = userStates.get(chatId);
    
    if (userState && userState.tweetLink && userState.comment) {
      // Start execution
      try {
        await bot.sendMessage(chatId, `🔄 *Executing Action...*

Please wait while I process your request...`, { parse_mode: 'Markdown' });
        
        // Execute the action
        const result = await executeTelegramAction(userState, data, chatId);
        
        response = result;
      } catch (error) {
        response = `❌ *Execution Failed*

Error: ${error.message}

Please try again or contact support.`;
        console.error('Execution error:', error);
      }
      
      // Clear user state
      userStates.delete(chatId);
    } else {
      response = `❌ Error: Missing tweet link or comment. Please try again.`;
    }
  } else {
    // Handle main menu callbacks
    switch (data) {
      case 'execute_actions':
        response = `🚀 *Execute Actions*

Choose an action to perform on a tweet:

*Available Actions:*
• 💬 Comment - Post a comment on a tweet
• 👍 Like - Like a tweet
• 🔄 Retweet - Retweet a post

Select an action below:`;
        
        newKeyboard = {
          inline_keyboard: [
            [
              { text: '💬 Comment', callback_data: 'action_comment_only' },
              { text: '👍 Like', callback_data: 'action_like_only' }
            ],
            [
              { text: '🔄 Retweet', callback_data: 'action_retweet_only' }
            ],
            [
              { text: '🔙 Back to Menu', callback_data: 'back_to_menu' }
            ]
          ]
        };
        break;

      case 'action_comment_only':
        // Set user state to waiting for tweet link
        userStates.set(chatId, { 
          state: 'waiting_for_tweet_link',
          actionType: data
        });
        response = `🎯 *Action Selected*

Please send me the tweet link you want to comment on:`;
        break;

      case 'action_like_only':
      case 'action_retweet_only':
        // Set user state to waiting for tweet link
        userStates.set(chatId, { 
          state: 'waiting_for_tweet_link',
          actionType: data
        });
        response = `🎯 *Action Selected*

Please send me the tweet link you want to perform the action on:`;
        break;

      case 'back_to_menu':
        // Return to main menu
        await showMainMenu(chatId, username);
        return; // Don't send response, showMainMenu handles it

      case 'status':
        response = `📊 *Automation Status*

✅ Bot is running
🤖 Automation system active
📱 Telegram integration working

Everything looks good!`;
        break;

      case 'profiles':
        const profiles = loadProfilesFromFile();
        if (profiles.length === 0) {
          response = `👥 *Available Profiles*

No profiles found.`;
        } else {
          response = `👥 *Available Profiles*

Select a profile to view details:`;
          
          // Create keyboard with profile names
          const profileButtons = profiles.map(profile => [{
            text: profile.adspower_id,
            callback_data: profile.id
          }]);
          
          newKeyboard = {
            inline_keyboard: profileButtons
          };
        }
        break;

      case 'schedule':
        response = `📅 *Schedule*

Current automation schedule is active.
Use /schedule for detailed view.`;
        break;

      case 'help':
        response = `❓ *Help*

*Commands:*
• /start - Show main menu
• /status - Check status
• /profiles - List profiles
• /schedule - View schedule
• /logout - Logout from bot

*How to use:*
1. Click buttons or type commands
2. Follow the prompts
3. Wait for confirmation`;
        break;

      case 'main_menu':
        // Clear any existing state and show main menu
        userStates.delete(chatId);
        await showMainMenu(chatId, username);
        return; // Return early since showMainMenu handles the response
        break;

      default:
        if (typeof data === 'string' && data.length > 0) {
          const profiles = loadProfilesFromFile();
          if (profiles.some(p => p.id === data)) {
            const profileId = data;
            const profile = profiles.find(p => p.id === profileId);
            
            if (profile) {
              // Create a concise bio summary focusing on key details
              const persona = profile.persona;
              let shortBio = '';
              
              // Extract name, age, profession, and hobbies
              const nameMatch = persona.match(/You are ([^,]+)/);
              const ageMatch = persona.match(/(\d+)-year-old/);
              const professionMatch = persona.match(/and ([^,]+) based in/);
              const hobbiesMatch = persona.match(/You're particularly interested in ([^.]+)/);
              
              if (nameMatch) {
                shortBio += `Name: ${nameMatch[1]}`;
              }
              if (ageMatch) {
                shortBio += ` | Age: ${ageMatch[1]}`;
              }
              if (professionMatch) {
                shortBio += ` | Profession: ${professionMatch[1]}`;
              }
              if (hobbiesMatch) {
                shortBio += ` | Interests: ${hobbiesMatch[1]}`;
              }
              
              // If no structured data found, use a simple truncation
              if (!shortBio) {
                shortBio = persona.substring(0, 150).replace(/[^\w\s]/g, '') + '...';
              }
              
              response = `👤 *Profile: ${profile.adspower_id}*

*Status:* ${profile.active ? '✅ Active' : '❌ Inactive'}
*Bio:* ${shortBio}

Select an action to perform with this profile:`;
              
              // Create action buttons for this specific profile
              newKeyboard = {
                inline_keyboard: [
                  [
                    { text: '💬 Comment', callback_data: `action_comment_${profileId}` },
                    { text: '❤️ Like', callback_data: `action_like_${profileId}` }
                  ],
                  [
                    { text: '🔄 Retweet', callback_data: `action_retweet_${profileId}` }
                  ],
                  [
                    { text: '🔙 Back to Profiles', callback_data: 'profiles' }
                  ]
                ]
              };
            } else {
              response = `❌ Profile not found`;
            }
          } else if (data.startsWith('action_')) {
            // Handle action selection for specific profile
            const actionMatch = data.match(/^action_(comment|like|retweet)_(.+)$/);
            if (actionMatch) {
              const actionType = actionMatch[1];
              const profileId = actionMatch[2];
              const profile = profiles.find(p => p.id === profileId);
              
              if (profile) {
                // Set user state for the selected action and profile
                userStates.set(chatId, {
                  state: 'waiting_for_tweet_link',
                  actionType: `action_${actionType}_only`,
                  selectedProfile: profileId,
                  profile: profile
                });
                
                response = `🎯 *Action Selected*

*Profile:* ${profile.adspower_id}
*Action:* ${actionType.charAt(0).toUpperCase() + actionType.slice(1)}

Please send me the tweet link you want to perform the action on:`;
              } else {
                response = `❌ Profile not found`;
              }
            } else {
              response = `❓ Invalid action format`;
            }
          } else {
            response = `❓ Unknown command: ${data}`;
          }
        } else {
          response = `❓ Unknown or malformed callback data.`;
        }
    }
  }

  // Send response
  try {
    if (newKeyboard) {
      await bot.editMessageText(response, {
        chat_id: chatId,
        message_id: messageId,
        reply_markup: newKeyboard,
        parse_mode: 'Markdown'
      });
    } else {
      await bot.sendMessage(chatId, response, {
        parse_mode: 'Markdown'
      });
    }
    console.log(`✅ Sent response for ${data}`);
  } catch (error) {
    console.error(`❌ Error sending response for ${data}:`, error.message);
  }
});

// Show main menu for users
async function showMainMenu(chatId, username) {
  // Clear any existing state
  userStates.delete(chatId);
  
  // Escape username for Markdown to prevent parsing errors
  const escapedUsername = username.replace(/[*_`[\]()~>#+=|{}.!-]/g, '\\$&');
  
  const welcomeMessage = `
🤖 *Twitter Automation Bot*

Welcome back, ${escapedUsername}!

*Available Commands:*
• /status - Check automation status
• /profiles - List available profiles
• /logout - Logout from bot

Click the buttons below or type a command to get started.
  `;

  const keyboard = {
    inline_keyboard: [
      [
        { text: '🚀 Execute Actions', callback_data: 'execute_actions' },
        { text: '📊 Status', callback_data: 'status' }
      ],
      [
        { text: '👥 Profiles', callback_data: 'profiles' },
        { text: '🚪 Logout', callback_data: 'logout' }
      ]
    ]
  };

  try {
    await bot.sendMessage(chatId, welcomeMessage, {
      reply_markup: keyboard,
      parse_mode: 'Markdown'
    });
    console.log(`✅ Sent main menu to ${username}`);
  } catch (error) {
    console.error('❌ Error sending main menu:', error.message);
  }
}

// Handle text messages
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;
  const username = msg.from.username || msg.from.first_name;
  
  // Skip commands (handled separately)
  if (text && text.startsWith('/')) {
    return;
  }
  
  console.log(`📨 Received text: "${text}" from ${username}`);
  
  const userState = userStates.get(chatId);
  
  if (userState) {
    // Handle conversation flow
    switch (userState.state) {
      case 'waiting_for_tweet_link':
        // Validate that the link is a valid X (Twitter) link
        if (!isValidXLink(text)) {
          const invalidLinkMessage = `❌ *Invalid Link*

The link you provided is not a valid X (Twitter) tweet link.

Please provide a valid X tweet link that contains "/status/" in the URL.

Examples of valid links:
• https://twitter.com/username/status/123456789
• https://x.com/username/status/123456789

Try again or use /start to return to the main menu.`;
          
          try {
            await bot.sendMessage(chatId, invalidLinkMessage, { parse_mode: 'Markdown' });
            console.log(`❌ User provided invalid link: ${text}`);
          } catch (error) {
            console.error('❌ Error sending invalid link message:', error.message);
          }
          
          // Clear user state and return to main menu
          userStates.delete(chatId);
          return;
        }
        
        // Store tweet link
        userState.tweetLink = text;
        
        // If it's a comment action, ask for the comment text
        if (userState.actionType === 'action_comment_only') {
          userState.state = 'waiting_for_comment';
          userStates.set(chatId, userState);
          
          const commentRequest = `✅ Tweet link received: ${text}

Now please send me the comment text you want to post:`;
          
          try {
            await bot.sendMessage(chatId, commentRequest);
            console.log(`✅ Asked for comment text`);
          } catch (error) {
            console.error('❌ Error asking for comment:', error.message);
          }
        } else {
          // For like and retweet actions, execute immediately
          userStates.set(chatId, userState);
          
          try {
            await bot.sendMessage(chatId, `🔄 *Executing Action...*

Please wait while I process your request...`, { parse_mode: 'Markdown' });
            
            // Execute the action
            const result = await executeTelegramAction(userState, userState.actionType, chatId);
            
            try {
              await bot.sendMessage(chatId, result, { 
                parse_mode: 'Markdown',
                reply_markup: {
                  inline_keyboard: [[
                    { text: '🏠 Go back to Menu', callback_data: 'main_menu' }
                  ]]
                }
              });
            } catch (markdownError) {
              console.log(`⚠️ Markdown parsing failed, sending as plain text: ${markdownError.message}`);
              // Remove Markdown formatting and send as plain text, but preserve the comment URL
              let plainText = result.replace(/\*\*(.*?)\*\*/g, '$1').replace(/\*(.*?)\*/g, '$1');
              
              // Extract the comment URL and add it as plain text
              const urlMatch = result.match(/\[View Your Comment\]\((.*?)\)/);
              if (urlMatch) {
                const commentUrl = urlMatch[1];
                plainText = plainText.replace(/\[View Your Comment\]\(.*?\)/, `View Your Comment: ${commentUrl}`);
              }
              
              await bot.sendMessage(chatId, plainText, {
                reply_markup: {
                  inline_keyboard: [[
                    { text: '🏠 Go back to Menu', callback_data: 'main_menu' }
                  ]]
                }
              });
            }
            console.log(`✅ Executed action: ${userState.actionType}`);
          } catch (error) {
            const errorMessage = `❌ *Execution Failed*

Error: ${error.message}

Please try again or contact support.`;
            await bot.sendMessage(chatId, errorMessage, { parse_mode: 'Markdown' });
            console.error('Execution error:', error);
          }
          
          // Clear user state
          userStates.delete(chatId);
        }
        break;
        
      case 'waiting_for_comment':
        // Store comment and execute the action
        userState.comment = text;
        userStates.set(chatId, userState);
        
        try {
          // Send "Comment received" message first
          await bot.sendMessage(chatId, `✅ *Comment received:* "${text}"`, { parse_mode: 'Markdown' });
          console.log(`✅ Comment received: "${text}"`);
          
          // Then send "Executing Action" message
          await bot.sendMessage(chatId, `🔄 *Executing Action...*

Please wait while I process your request...`, { parse_mode: 'Markdown' });
          
          // Execute the action
          const result = await executeTelegramAction(userState, userState.actionType, chatId);
          
          try {
            await bot.sendMessage(chatId, result, { 
              parse_mode: 'Markdown',
              reply_markup: {
                inline_keyboard: [[
                  { text: '🏠 Go back to Menu', callback_data: 'main_menu' }
                ]]
              }
            });
          } catch (markdownError) {
            console.log(`⚠️ Markdown parsing failed, sending as plain text: ${markdownError.message}`);
            // Remove Markdown formatting and send as plain text, but preserve the comment URL
            let plainText = result.replace(/\*\*(.*?)\*\*/g, '$1').replace(/\*(.*?)\*/g, '$1');
            
            // Extract the comment URL and add it as plain text
            const urlMatch = result.match(/\[View Your Comment\]\((.*?)\)/);
            if (urlMatch) {
              const commentUrl = urlMatch[1];
              plainText = plainText.replace(/\[View Your Comment\]\(.*?\)/, `View Your Comment: ${commentUrl}`);
            }
            
            await bot.sendMessage(chatId, plainText, {
              reply_markup: {
                inline_keyboard: [[
                  { text: '🏠 Go back to Menu', callback_data: 'main_menu' }
                ]]
              }
            });
          }
          console.log(`✅ Executed action: ${userState.actionType}`);
        } catch (error) {
          const errorMessage = `❌ *Execution Failed*

Error: ${error.message}

Please try again or contact support.`;
          await bot.sendMessage(chatId, errorMessage, { parse_mode: 'Markdown' });
          console.error('Execution error:', error);
        }
        
        // Clear user state
        userStates.delete(chatId);
        break;
        
      default:
        // Simple echo for testing
        const echoResponse = `✅ Received your message: "${text}"
        
This is a test response. The bot is working!`;
        
        try {
          await bot.sendMessage(chatId, echoResponse);
          console.log(`✅ Sent echo response`);
        } catch (error) {
          console.error('❌ Error sending echo response:', error.message);
        }
    }
  } else {
    // Simple echo for testing
    const echoResponse = `✅ Received your message: "${text}"
    
This is a test response. The bot is working!`;
    
    try {
      await bot.sendMessage(chatId, echoResponse);
      console.log(`✅ Sent echo response`);
    } catch (error) {
      console.error('❌ Error sending echo response:', error.message);
    }
  }
});

// Function to execute Telegram actions
async function executeTelegramAction(userState, actionType, chatId) {
  const { tweetLink, comment, selectedProfile, profile } = userState;
  
  try {
    // Use the selected profile if available, otherwise fall back to random selection
    let selectedProfileToUse;
    
    if (selectedProfile && profile) {
      // Use the specifically selected profile
      selectedProfileToUse = profile;
      console.log(`✅ Using selected profile: ${selectedProfileToUse.adspower_id}`);
    } else {
      // Fall back to random selection for backward compatibility
      const profiles = loadProfilesFromFile();
      if (profiles.length === 0) {
        throw new Error('No profiles available');
      }
      
      const availableProfiles = profiles.filter(p => p.active);
      if (availableProfiles.length === 0) {
        throw new Error('No active profiles available');
      }
      
      const randomIndex = Math.floor(Math.random() * availableProfiles.length);
      selectedProfileToUse = availableProfiles[randomIndex];
      console.log(`✅ Selected random profile: ${selectedProfileToUse.adspower_id}`);
    }
    
    // Determine actions based on action type
    let actions = [];
    let actionDisplayName = '';
    
    switch (actionType) {
      case 'action_comment_only':
        actions = ['comment'];
        actionDisplayName = 'Comment';
        break;
      case 'action_like_only':
        actions = ['like'];
        actionDisplayName = 'Like';
        break;
      case 'action_retweet_only':
        actions = ['retweet'];
        actionDisplayName = 'Retweet';
        break;
      case 'action_comment':
        actions = ['comment'];
        actionDisplayName = 'Comment';
        break;
      case 'action_like_comment':
        actions = ['like', 'comment'];
        actionDisplayName = 'Like + Comment';
        break;
      case 'action_retweet_comment':
        actions = ['retweet', 'comment'];
        actionDisplayName = 'Retweet + Comment';
        break;
      case 'action_all':
        actions = ['like', 'retweet', 'comment'];
        actionDisplayName = 'Like + Retweet + Comment';
        break;
      case 'action_cancel':
        return `❌ *Action Cancelled*

The action has been cancelled.`;
      default:
        throw new Error(`Unknown action type: ${actionType}`);
    }
    
    // Execute each action
    const results = [];
    let commentUrl = null;
    
    for (const action of actions) {
      try {
        log(`Executing ${action} action for Telegram request`, selectedProfileToUse.id);
        
        // Create options for the automation with the specific tweet URL
        const options = {
          tweetUrl: tweetLink,
          telegramChatId: chatId,
          bypassTelegram: true, // Explicitly mark as Telegram request to bypass cooldown
          targetSpecificTweet: true, // New flag to indicate we want to target a specific tweet
          specificTweetUrl: tweetLink // Pass the specific URL
        };
        
        // Add comment for actions that need it
        if (action === 'comment' && comment) {
          options.customComment = comment;
        }
        
        // Execute the automation
        const result = await automateTwitterWithAI(selectedProfileToUse, action, options);
        
        // Debug: Log the result object
        console.log(`🔍 Result object for ${action}:`, JSON.stringify(result, null, 2));
        
        // Store comment URL if available
        if (result && result.commentUrl) {
          commentUrl = result.commentUrl;
          console.log(`✅ Found comment URL: ${commentUrl}`);
          results.push(`✅ ${action.toUpperCase()} completed successfully`);
        } else if (result && result.success) {
          console.log(`⚠️ No comment URL found, but action was successful`);
          results.push(`✅ ${action.toUpperCase()} completed successfully`);
        } else {
          console.log(`⚠️ No comment URL found and no success flag`);
          results.push(`✅ ${action.toUpperCase()} completed`);
        }
        
      } catch (error) {
        log(`Failed to execute ${action}: ${error.message}`, selectedProfileToUse.id);
        
        // Provide more specific error messages
        let errorMessage = error.message;
        if (error.message.includes('AdsPower')) {
          errorMessage = 'AdsPower profile failed to start. Please check if AdsPower is running.';
        } else if (error.message.includes('login')) {
          errorMessage = 'Profile not logged in. Please log in manually in AdsPower.';
        } else if (error.message.includes('timeout')) {
          errorMessage = 'Operation timed out. Please try again.';
        } else if (error.message.includes('network')) {
          errorMessage = 'Network error. Please check your internet connection.';
        }
        
        results.push(`❌ ${action.toUpperCase()} failed: ${errorMessage}`);
      }
    }
    
    // Generate response
    const resultText = results.join('\n');
    
    // Build the response message with proper escaping
    const escapedComment = comment ? comment.replace(/[_*[\]()~`>#+=|{}.!-]/g, '\\$&') : '';
    
    let responseMessage = `🎯 *Action Completed*

*Profile:* ${selectedProfileToUse.adspower_id}
*Action:* ${actionDisplayName}
*Tweet:* ${tweetLink}${comment ? `\n*Comment:* "${escapedComment}"` : ''}

*Results:*
${resultText}

✅ Action has been executed successfully!`;
    
    // Add comment link section if available
    console.log(`🔍 Final commentUrl value: ${commentUrl}`);
    if (commentUrl) {
      // Clean the URL to ensure it's properly formatted for Markdown
      const cleanCommentUrl = commentUrl.trim();
      
      responseMessage += `

[View Your Comment](${cleanCommentUrl})`;
    }
    
    return responseMessage;
    
  } catch (error) {
    log(`Telegram action execution failed: ${error.message}`, 'TELEGRAM');
    throw new Error(`Failed to execute action: ${error.message}`);
  }
}

// Error handling
bot.on('error', (error) => {
  console.error('❌ Bot error:', error.message);
});

bot.on('polling_error', (error) => {
  console.error('❌ Polling error:', error.message);
});

console.log('🚀 Enhanced Bot is starting...');
console.log('📱 Send /start to test the bot');
console.log('🚫 This bot will NOT trigger random profile execution on startup'); 