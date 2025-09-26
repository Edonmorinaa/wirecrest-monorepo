const fs = require('fs');

// Simple logging function for Telegram bot
function log(message, profileId = 'TELEGRAM') {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}][${profileId}] - ${message}`;
  console.log(logEntry);
}

// Load profiles from file
function loadProfiles() {
  try {
    const profilesData = fs.readFileSync('profiles.json', 'utf8');
    return JSON.parse(profilesData);
  } catch (error) {
    console.error('Error loading profiles:', error);
    return [];
  }
}

// Export only what Telegram bot needs
module.exports = {
  loadProfiles,
  log
}; 