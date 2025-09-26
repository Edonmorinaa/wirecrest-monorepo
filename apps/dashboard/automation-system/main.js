const { startTelegramBot } = require('./telegram-bot.js');
const { initializeProfiles, initializeScheduling } = require('./automation-flow.js');

// Start both systems
async function startAllServices() {
  console.log('🚀 Starting Twitter Automation + Telegram Bot...');
  
  try {
    // Initialize the automation system
    if (initializeProfiles()) {
      initializeScheduling();
      console.log('✅ Automation system started');
    } else {
      console.log('❌ Failed to initialize automation system');
      process.exit(1);
    }
    
    // Start the Telegram bot
    startTelegramBot();
    console.log('✅ Telegram bot started');
    
    console.log('🎉 All services are running!');
    console.log('- Automation: Checking schedule every minute');
    console.log('- Telegram Bot: Ready to receive commands');
    
  } catch (error) {
    console.error('❌ Error starting services:', error.message);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down gracefully...');
  process.exit(0);
});

// Start everything
startAllServices(); 