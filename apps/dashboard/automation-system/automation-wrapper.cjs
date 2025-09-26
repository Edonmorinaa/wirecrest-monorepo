#!/usr/bin/env node

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// PID file to track running processes
const PID_FILE = path.join(__dirname, 'automation.pid');
const STATUS_FILE = path.join(__dirname, 'automation.status');

class AutomationWrapper {
  constructor() {
    this.process = null;
    this.scriptPath = path.join(__dirname, 'automation-flow.cjs'); // Use CommonJS version
  }

  // Check if automation is running
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

  // Start automation
  start(actionType = null, parameters = {}) {
    if (this.isRunning()) {
      console.log('Automation is already running');
      return false;
    }

    console.log(`Starting automation${actionType ? ` with action: ${actionType}` : ''}...`);
    
    // Start the automation script with action parameter if provided
    const args = [this.scriptPath];
    if (actionType) {
      args.push('--action', actionType);
      
      // Add additional parameters
      if (parameters.targetUrl) {
        args.push('--url', parameters.targetUrl);
      }
      if (parameters.profileId) {
        args.push('--profile', parameters.profileId);
      }
      if (parameters.delay) {
        args.push('--delay', parameters.delay);
      }
      if (parameters.comment) {
        args.push('--comment', parameters.comment);
      }
    }
    
    this.process = spawn('node', args, {
      stdio: 'pipe',
      detached: true
    });

    // Write PID to file
    fs.writeFileSync(PID_FILE, this.process.pid.toString());
    
    // Update status
    this.updateStatus('running', new Date().toISOString());

    console.log(`Automation started with PID: ${this.process.pid}`);
    return true;
  }

  // Stop automation
  stop() {
    if (!this.isRunning()) {
      console.log('Automation is not running');
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
      console.log('Automation stopped');
      return true;
    } catch (e) {
      console.log('Error stopping automation:', e.message);
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
  const wrapper = new AutomationWrapper();
  const command = process.argv[2];

  switch (command) {
    case 'start':
      let actionType = null;
      const parameters = {};
      
      // Parse all arguments to find action type and parameters
      for (let i = 3; i < process.argv.length; i += 2) {
        if (i + 1 < process.argv.length) {
          const key = process.argv[i].replace('--', '');
          const value = process.argv[i + 1];
          
          if (key === 'action') {
            actionType = value;
          } else {
            parameters[key] = value;
          }
        }
      }
      
      wrapper.start(actionType, parameters);
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
      console.log('Usage: node automation-wrapper.js [start|stop|status]');
      console.log('  start  - Start the automation');
      console.log('  stop   - Stop the automation');
      console.log('  status - Show current status');
      break;
  }
}

// Handle process termination
process.on('SIGINT', () => {
  const wrapper = new AutomationWrapper();
  wrapper.stop();
  process.exit(0);
});

process.on('SIGTERM', () => {
  const wrapper = new AutomationWrapper();
  wrapper.stop();
  process.exit(0);
});

if (require.main === module) {
  main();
}

module.exports = AutomationWrapper; 