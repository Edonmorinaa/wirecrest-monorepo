const fs = require('fs');
const path = require('path');

console.log('🔄 Regenerating schedule with new 30-40 minute session settings...');

try {
  // Delete existing schedule file
  const scheduleFile = 'schedule.json';
  if (fs.existsSync(scheduleFile)) {
    fs.unlinkSync(scheduleFile);
    console.log('🗑️ Deleted existing schedule file');
  }

  // Import and run the automation flow to create new schedule
  const automationFlow = require('./automation-flow.js');
  
  // The automation flow should automatically create a new schedule when loaded
  console.log('✅ Schedule regenerated successfully!');
  
  // Read the new schedule
  if (fs.existsSync(scheduleFile)) {
    const scheduleData = fs.readFileSync(scheduleFile, 'utf8');
    const newSchedule = JSON.parse(scheduleData);
    
    console.log(`📊 Total profiles: ${newSchedule.profiles.length}`);
    
    // Show action distribution
    const actionCounts = {
      comment: newSchedule.profiles.filter(p => p.actionType === 'comment').length,
      like: newSchedule.profiles.filter(p => p.actionType === 'like').length,
      retweet: newSchedule.profiles.filter(p => p.actionType === 'retweet').length
    };
    
    console.log('📈 Action distribution:');
    console.log(`   Comments: ${actionCounts.comment}`);
    console.log(`   Likes: ${actionCounts.like}`);
    console.log(`   Retweets: ${actionCounts.retweet}`);
    
    // Show next few scheduled runs
    const now = new Date();
    const upcoming = newSchedule.profiles
      .filter(p => new Date(p.scheduledTime) > now)
      .slice(0, 5);
    
    console.log('\n⏰ Next 5 scheduled runs:');
    upcoming.forEach((profile, index) => {
      const timeUntil = Math.round((new Date(profile.scheduledTime) - now) / 1000 / 60);
      const timeStr = new Date(profile.scheduledTime).toLocaleString('en-GB', { 
        timeZone: 'Europe/Berlin',
        hour: '2-digit',
        minute: '2-digit'
      });
      console.log(`   ${index + 1}. ${profile.profileId} - ${profile.actionType} at ${timeStr} (in ${timeUntil}m)`);
    });
    
    console.log('\n🎯 New session settings:');
    console.log('   • Session duration: 30-40 minutes per profile');
    console.log('   • Target engagements: 15-30 per session');
    console.log('   • Actions: Likes, Retweets, Comments');
    console.log('   • Frequency: Once per day per profile');
    console.log('   • Total daily activity: 5.5-7.3 hours across all profiles');
    
  } else {
    console.log('❌ New schedule file was not created');
  }
  
} catch (error) {
  console.error('❌ Error regenerating schedule:', error.message);
  process.exit(1);
}
