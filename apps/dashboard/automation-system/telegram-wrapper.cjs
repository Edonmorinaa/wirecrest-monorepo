#!/usr/bin/env node

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// PID file to track running processes
const PID_FILE = path.join(__dirname, 'telegram.pid');
const STATUS_FILE = path.join(__dirname, 'telegram.status');

class TelegramWrapper {
  constructor() {
    this.process = null;
    this.scriptPath = path.join(__dirname, 'telegram-bot-enhanced.js');
  }

  // Check if bot is running
  isRunning() {
    try {
      if (fs.existsSync(PID_FILE)) {
        const pid = parseInt(fs.readFileSync(PID_FILE, 'utf8'));
        try {
          process.kill(pid, 0); // Check if process exists
          return true;
        } catch (e) {
          // Process doesn't exist, clean up PID file
          this.cleanup();
          return false;
        }
      }
      return false;
    } catch (e) {
      return false;
    }
  }

  // Start bot
  start() {
    if (this.isRunning()) {
      console.log('Telegram bot is already running');
      return false;
    }

    console.log('Starting Telegram bot...');
    
    // Start the bot script
    this.process = spawn('node', [this.scriptPath], {
      stdio: 'pipe',
      detached: true
    });

    // Write PID to file
    fs.writeFileSync(PID_FILE, this.process.pid.toString());
    
    // Update status
    this.updateStatus('running', new Date().toISOString());

    console.log(`Telegram bot started with PID: ${this.process.pid}`);
    return true;
  }

  // Stop bot
  stop() {
    if (!this.isRunning()) {
      console.log('Telegram bot is not running');
      return false;
    }

    try {
      const pid = parseInt(fs.readFileSync(PID_FILE, 'utf8'));
      process.kill(pid, 'SIGTERM');
      
      // Wait a bit then force kill if needed
      setTimeout(() => {
        try {
          process.kill(pid, 'SIGKILL');
        } catch (e) {
          // Process already dead
        }
      }, 5000);

      this.cleanup();
      console.log('Telegram bot stopped');
      return true;
    } catch (e) {
      console.log('Error stopping Telegram bot:', e.message);
      this.cleanup();
      return false;
    }
  }

  // Get status
  status() {
    const isRunning = this.isRunning();
    let status = 'stopped';
    let lastRun = null;
    let nextRun = null;

    if (isRunning) {
      status = 'running';
    }

    // Try to read status file
    try {
      if (fs.existsSync(STATUS_FILE)) {
        const statusData = JSON.parse(fs.readFileSync(STATUS_FILE, 'utf8'));
        lastRun = statusData.lastRun;
        nextRun = statusData.nextRun;
      }
    } catch (e) {
      // Status file doesn't exist or is invalid
    }

    return {
      isRunning,
      status,
      lastRun,
      nextRun
    };
  }

  // Update status file
  updateStatus(status, timestamp) {
    try {
      const statusData = {
        status,
        lastUpdated: timestamp,
        lastRun: status === 'running' ? timestamp : null,
        nextRun: null
      };
      fs.writeFileSync(STATUS_FILE, JSON.stringify(statusData, null, 2));
    } catch (e) {
      console.error('Error updating status:', e.message);
    }
  }

  // Clean up PID and status files
  cleanup() {
    try {
      if (fs.existsSync(PID_FILE)) {
        fs.unlinkSync(PID_FILE);
      }
      this.updateStatus('stopped', new Date().toISOString());
    } catch (e) {
      // Ignore cleanup errors
    }
  }
}

// Main execution
function main() {
  const wrapper = new TelegramWrapper();
  const command = process.argv[2];

  switch (command) {
    case 'start':
      wrapper.start();
      break;
    case 'stop':
      wrapper.stop();
      break;
    case 'status':
      const status = wrapper.status();
      console.log('Status:', status.status);
      console.log('Running:', status.isRunning);
      if (status.lastRun) {
        console.log('Last run:', status.lastRun);
      }
      if (status.nextRun) {
        console.log('Next run:', status.nextRun);
      }
      break;
    default:
      console.log('Usage: node telegram-wrapper.js [start|stop|status]');
      console.log('  start  - Start the Telegram bot');
      console.log('  stop   - Stop the Telegram bot');
      console.log('  status - Show current status');
      break;
  }
}

// Handle process termination
process.on('SIGINT', () => {
  const wrapper = new TelegramWrapper();
  wrapper.stop();
  process.exit(0);
});

process.on('SIGTERM', () => {
  const wrapper = new TelegramWrapper();
  wrapper.stop();
  process.exit(0);
});

if (require.main === module) {
  main();
}

module.exports = TelegramWrapper; 