#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

// Configuration files
const CONFIG_FILE = 'twitter-automation-config.json';
const STATUS_FILE = 'twitter-automation-status.json';

// Load configuration
function loadConfig() {
  try {
    const configPath = path.join(process.cwd(), CONFIG_FILE);
    if (fs.existsSync(configPath)) {
      const data = fs.readFileSync(configPath, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error loading config:', error);
  }
  return null;
}

// Update status
function updateStatus(status, details = {}) {
  try {
    const statusPath = path.join(process.cwd(), STATUS_FILE);
    const currentStatus = fs.existsSync(statusPath) 
      ? JSON.parse(fs.readFileSync(statusPath, 'utf8'))
      : { actionsCompleted: 0, actionsFailed: 0 };
    
    const newStatus = {
      ...currentStatus,
      status,
      lastActivity: new Date().toISOString(),
      ...details
    };
    
    fs.writeFileSync(statusPath, JSON.stringify(newStatus, null, 2));
  } catch (error) {
    console.error('Error updating status:', error);
  }
}

// Start automation
function startAutomation() {
  console.log('Starting Twitter Automation...');
  
  const config = loadConfig();
  if (!config) {
    console.error('No configuration found. Please configure the automation first.');
    updateStatus('error', { error: 'No configuration found' });
    process.exit(1);
  }
  
  if (!config.enabled) {
    console.log('Automation is disabled in configuration.');
    updateStatus('stopped', { error: 'Automation disabled' });
    process.exit(0);
  }
  
  updateStatus('running', { startedAt: new Date().toISOString() });
  
  // Start the automation-flow.js with appropriate parameters
  const automationScript = path.join(process.cwd(), 'automation-flow.js');
  
  if (!fs.existsSync(automationScript)) {
    console.error('automation-flow.js not found');
    updateStatus('error', { error: 'automation-flow.js not found' });
    process.exit(1);
  }
  
  // Prepare arguments for automation-flow.js
  const args = ['automation-flow.js'];
  
  // Add configuration-based arguments
  if (config.actions.like) args.push('--enable-like');
  if (config.actions.retweet) args.push('--enable-retweet');
  if (config.actions.comment) args.push('--enable-comment');
  
  // Add targeting keywords
  if (config.targeting.keywords && config.targeting.keywords.length > 0) {
    args.push('--keywords', config.targeting.keywords.join(','));
  }
  
  // Add limits
  args.push('--max-actions-per-day', config.limits.maxActionsPerDay.toString());
  args.push('--max-actions-per-profile', config.limits.maxActionsPerProfile.toString());
  args.push('--cooldown-minutes', config.limits.cooldownMinutes.toString());
  
  // Add safety settings
  if (config.safety.avoidControversialTopics) args.push('--avoid-controversial');
  if (config.safety.avoidPoliticalContent) args.push('--avoid-political');
  if (config.safety.avoidSpamAccounts) args.push('--avoid-spam');
  args.push('--max-actions-per-hour', config.safety.maxActionsPerHour.toString());
  
  console.log('Starting automation with args:', args);
  
  // Spawn the automation process
  const automationProcess = spawn('node', args, {
    cwd: process.cwd(),
    stdio: ['pipe', 'pipe', 'pipe'],
    detached: false
  });
  
  // Handle process events
  automationProcess.stdout.on('data', (data) => {
    const output = data.toString();
    console.log('Automation output:', output);
    
    // Update status based on output
    if (output.includes('completed successfully')) {
      updateStatus('running', { 
        actionsCompleted: (loadStatus()?.actionsCompleted || 0) + 1 
      });
    } else if (output.includes('failed') || output.includes('error')) {
      updateStatus('running', { 
        actionsFailed: (loadStatus()?.actionsFailed || 0) + 1 
      });
    }
  });
  
  automationProcess.stderr.on('data', (data) => {
    const error = data.toString();
    console.error('Automation error:', error);
    
    if (error.includes('fatal') || error.includes('critical')) {
      updateStatus('error', { error });
    }
  });
  
  automationProcess.on('close', (code) => {
    console.log(`Automation process exited with code ${code}`);
    if (code === 0) {
      updateStatus('stopped', { stoppedAt: new Date().toISOString() });
    } else {
      updateStatus('error', { error: `Process exited with code ${code}` });
    }
  });
  
  automationProcess.on('error', (error) => {
    console.error('Failed to start automation process:', error);
    updateStatus('error', { error: error.message });
  });
  
  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('Received SIGINT, stopping automation...');
    automationProcess.kill('SIGTERM');
    updateStatus('stopped', { stoppedAt: new Date().toISOString() });
    process.exit(0);
  });
  
  process.on('SIGTERM', () => {
    console.log('Received SIGTERM, stopping automation...');
    automationProcess.kill('SIGTERM');
    updateStatus('stopped', { stoppedAt: new Date().toISOString() });
    process.exit(0);
  });
}

// Stop automation
function stopAutomation() {
  console.log('Stopping Twitter Automation...');
  
  // Find and kill automation processes
  const { exec } = require('child_process');
  
  if (process.platform === 'win32') {
    // Windows: Find and kill Node.js processes running automation-flow.js
    exec('tasklist /FI "IMAGENAME eq node.exe" /FO CSV', (error, stdout) => {
      if (error) {
        console.error('Error finding processes:', error);
        return;
      }
      
      const lines = stdout.split('\n').slice(1);
      lines.forEach(line => {
        if (line.includes('node.exe')) {
          const match = line.match(/"node\.exe","(\d+)"/);
          if (match) {
            const pid = match[1];
            exec(`wmic process where "ProcessId=${pid}" get CommandLine /format:list`, (err, output) => {
              if (!err && output.includes('automation-flow.js')) {
                exec(`taskkill /PID ${pid} /F`, (killErr) => {
                  if (killErr) {
                    console.error(`Error killing process ${pid}:`, killErr);
                  } else {
                    console.log(`Killed automation process ${pid}`);
                  }
                });
              }
            });
          }
        }
      });
    });
  } else {
    // Unix-like systems: Use pkill
    exec('pkill -f "automation-flow.js"', (error) => {
      if (error) {
        console.log('No automation processes found to kill');
      } else {
        console.log('Automation processes killed');
      }
    });
  }
  
  updateStatus('stopped', { stoppedAt: new Date().toISOString() });
  console.log('Twitter Automation stopped');
}

// Get status
function getStatus() {
  try {
    const statusPath = path.join(process.cwd(), STATUS_FILE);
    if (fs.existsSync(statusPath)) {
      const data = fs.readFileSync(statusPath, 'utf8');
      const status = JSON.parse(data);
      console.log('Current status:', status);
      return status;
    } else {
      console.log('No status file found');
      return null;
    }
  } catch (error) {
    console.error('Error reading status:', error);
    return null;
  }
}

// Load status helper
function loadStatus() {
  try {
    const statusPath = path.join(process.cwd(), STATUS_FILE);
    if (fs.existsSync(statusPath)) {
      const data = fs.readFileSync(statusPath, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error loading status:', error);
  }
  return null;
}

// Main command handling
const command = process.argv[2];

switch (command) {
  case 'start':
    startAutomation();
    break;
  case 'stop':
    stopAutomation();
    break;
  case 'status':
    getStatus();
    break;
  default:
    console.log('Twitter Automation Wrapper');
    console.log('Usage:');
    console.log('  node twitter-automation-wrapper.js start  - Start automation');
    console.log('  node twitter-automation-wrapper.js stop   - Stop automation');
    console.log('  node twitter-automation-wrapper.js status - Show status');
    break;
}
