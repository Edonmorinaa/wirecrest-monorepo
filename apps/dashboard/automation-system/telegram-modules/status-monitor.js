// Status monitoring module for Telegram bot
const fs = require('fs');

class StatusMonitor {
  constructor() {
    this.lastExecutionTime = null;
  }

  // Get system status
  getSystemStatus() {
    try {
      const profiles = this.getAvailableProfiles();
      const availableProfiles = profiles.filter(profile => this.isProfileAvailable(profile.id));
      
      let status = `*🤖 Bot Status*

📊 *Profiles:*
• Total: ${profiles.length}
• Available: ${availableProfiles.length}
• In Cooldown: ${profiles.length - availableProfiles.length}

⏰ *Schedule:*
• Next Profile: ${this.getNextScheduledProfile()?.profileId || 'None'}
• Schedule Active: ${this.isScheduleActive() ? 'Yes' : 'No'}

🔄 *Recent Activity:*
• Last Execution: ${this.lastExecutionTime ? new Date(this.lastExecutionTime).toLocaleString() : 'None'}`;

      return status;
    } catch (error) {
      return `*🤖 Bot Status*\n\n❌ Error getting status: ${error.message}`;
    }
  }

  // Get available profiles
  getAvailableProfiles() {
    try {
      const profilesData = fs.readFileSync('profiles.json', 'utf8');
      const allProfiles = JSON.parse(profilesData);
      return allProfiles.filter(profile => profile.active);
    } catch (err) {
      return [];
    }
  }

  // Check if profile is available (simplified version)
  isProfileAvailable(profileId) {
    // This would need to be connected to your actual profile availability logic
    return true; // Simplified for now
  }

  // Get next scheduled profile (simplified version)
  getNextScheduledProfile() {
    try {
      if (fs.existsSync('schedule.json')) {
        const scheduleData = JSON.parse(fs.readFileSync('schedule.json', 'utf8'));
        const pendingProfiles = scheduleData.profiles.filter(p => !p.completed && p.status === 'scheduled');
        return pendingProfiles.length > 0 ? pendingProfiles[0] : null;
      }
      return null;
    } catch (err) {
      return null;
    }
  }

  // Check if schedule is active
  isScheduleActive() {
    try {
      if (fs.existsSync('schedule.json')) {
        const scheduleData = JSON.parse(fs.readFileSync('schedule.json', 'utf8'));
        return scheduleData.profiles && scheduleData.profiles.length > 0;
      }
      return false;
    } catch (err) {
      return false;
    }
  }

  // Update last execution time
  updateLastExecutionTime() {
    this.lastExecutionTime = new Date();
  }

  // Get detailed schedule information
  getScheduleDetails() {
    try {
      if (!fs.existsSync('schedule.json')) {
        return 'No schedule file found';
      }

      const scheduleData = JSON.parse(fs.readFileSync('schedule.json', 'utf8'));
      const stats = scheduleData.statistics || {};
      
      return `*📅 Schedule Details*

📊 *Statistics:*
• Total Profiles: ${scheduleData.profiles?.length || 0}
• Completed: ${stats.completed || 0}
• Failed: ${stats.failed || 0}
• Running: ${stats.running || 0}
• Pending: ${stats.pending || 0}

⏰ *Timeline:*
• Created: ${scheduleData.created ? new Date(scheduleData.created).toLocaleString() : 'N/A'}
• Expires: ${scheduleData.expires ? new Date(scheduleData.expires).toLocaleString() : 'N/A'}

🎯 *Action Distribution:*
• Comments: ${stats.actionCounts?.comment || 0} (Completed: ${stats.completedActions?.comment || 0})
• Likes: ${stats.actionCounts?.like || 0} (Completed: ${stats.completedActions?.like || 0})
• Retweets: ${stats.actionCounts?.retweet || 0} (Completed: ${stats.completedActions?.retweet || 0})`;
    } catch (err) {
      return `Error getting schedule details: ${err.message}`;
    }
  }
}

module.exports = StatusMonitor;