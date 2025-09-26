# Telegram Bot for Twitter Automation

This Telegram bot allows clients to request Twitter actions through a simple chat interface.

## Setup Instructions

### 1. Create a Telegram Bot
1. Message @BotFather on Telegram
2. Send `/newbot`
3. Choose a name for your bot
4. Choose a username (must end in 'bot')
5. Copy the bot token

### 2. Configure the Bot
```bash
npm run setup
```
Follow the prompts to enter your bot token and allowed users.

### 3. Install Dependencies
```bash
npm install
```

### 4. Start the System
```bash
npm start
```

## How to Use

### For Clients:
1. Find your bot on Telegram
2. Send `/start` to begin
3. Send a tweet URL (e.g., `https://twitter.com/user/status/123456789`)
4. Choose an action (Comment, Like, or Retweet)
5. For comments, provide your comment text
6. Confirm the action

### Available Commands:
- `/start` - Initialize the bot
- Send tweet URL - Start an action request

### Features:
- ✅ Comment on tweets with custom text
- ✅ Like tweets
- ✅ Retweet posts
- ✅ Automatic profile selection
- ✅ Real-time status updates
- ✅ Error handling and logging

## Security Features:
- User authorization (optional)
- Rate limiting
- Input validation
- Error logging

## Configuration:
Edit `telegram-config.js` to modify:
- Bot token
- Allowed users
- Rate limits
- Bot settings 