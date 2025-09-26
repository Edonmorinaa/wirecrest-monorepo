/**
 * Event-Driven Workflow Example
 * 
 * This example demonstrates how to use the new event-driven architecture
 * to replace manual sync routes with automated workflows.
 */

import { MarketPlatform } from '../src/supabase/models';

// Example: Triggering a workflow when a team updates their Google Place ID
async function updateGooglePlaceId(teamId: string, newPlaceId: string) {
  try {
    console.log(`Updating Google Place ID for team ${teamId} to ${newPlaceId}`);
    
    // Option 1: Update market identifier (recommended)
    // This will automatically trigger the full workflow
    const response = await fetch('/api/market-identifier', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        teamId: teamId,
        platform: MarketPlatform.GOOGLE_MAPS,
        identifier: newPlaceId
      })
    });

    const result = await response.json();
    
    if (result.success) {
      console.log('Workflow triggered successfully:', result.message);
      if (result.triggeredWorkflow) {
        console.log('Full workflow started (cleanup + new profile creation)');
      } else {
        console.log('Market identifier updated (no workflow needed)');
      }
    } else {
      console.error('Failed to update market identifier:', result.message);
    }

  } catch (error) {
    console.error('Error updating Google Place ID:', error);
  }
}

// Example: Manually triggering a workflow with old identifier cleanup
async function manualWorkflowTrigger(
  teamId: string, 
  platform: MarketPlatform, 
  newIdentifier: string,
  oldIdentifier?: string
) {
  try {
    console.log(`Manually triggering workflow for team ${teamId}`);
    
    // Option 2: Direct workflow trigger
    const response = await fetch('/api/trigger-workflow', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        teamId,
        platform,
        identifier: newIdentifier,
        oldIdentifier // Will trigger cleanup if provided
      })
    });

    const result = await response.json();
    
    if (result.success) {
      console.log('Workflow triggered:', result.message);
    } else {
      console.error('Failed to trigger workflow:', result.error);
    }

  } catch (error) {
    console.error('Error triggering workflow:', error);
  }
}

// Example: Real-time monitoring with Server-Sent Events
function monitorWorkflowProgress(teamId: string) {
  console.log(`Starting real-time monitoring for team ${teamId}`);
  
  const eventSource = new EventSource(`/api/events/${teamId}`);
  
  // Connection events
  eventSource.addEventListener('connected', (event) => {
    const data = JSON.parse(event.data);
    console.log('✅ Connected to real-time updates:', data.message);
  });

  eventSource.addEventListener('ping', (event) => {
    // Keep-alive ping - usually ignored
    // console.log('📡 Ping received');
  });

  // Workflow events
  eventSource.addEventListener('market_identifier_change', (event) => {
    const data = JSON.parse(event.data);
    console.log(`🔄 Market identifier changed from ${data.oldIdentifier} to ${data.newIdentifier}`);
  });

  eventSource.addEventListener('business_profile_created', (event) => {
    const data = JSON.parse(event.data);
    console.log(`🏢 Business profile created: ${data.businessProfileId}`);
    console.log(`   Platform: ${data.platform}`);
    console.log(`   Identifier: ${data.identifier}`);
  });

  eventSource.addEventListener('review_scraping', (event) => {
    const data = JSON.parse(event.data);
    console.log(`📝 Review scraping ${data.status}: Job ${data.jobId}`);
    
    if (data.status === 'queued') {
      console.log('   ⏳ Review scraping job queued');
    } else if (data.status === 'started') {
      console.log('   🚀 Review scraping started');
    } else if (data.status === 'completed') {
      console.log('   ✅ Review scraping completed');
    } else if (data.status === 'failed') {
      console.log('   ❌ Review scraping failed:', data.error);
    }
  });

  eventSource.addEventListener('overview_processing', (event) => {
    const data = JSON.parse(event.data);
    console.log(`📊 Overview processing ${data.status}`);
    
    if (data.status === 'started') {
      console.log('   🔄 Processing business overview...');
    } else if (data.status === 'completed') {
      console.log('   ✅ Overview processing completed');
      console.log('   🎉 Workflow finished successfully!');
    } else if (data.status === 'failed') {
      console.log('   ❌ Overview processing failed:', data.error);
    }
  });

  // Error handling
  eventSource.addEventListener('error', (event) => {
    console.error('❌ SSE connection error:', event);
  });

  // Return cleanup function
  return () => {
    console.log('🔌 Closing SSE connection');
    eventSource.close();
  };
}

// Example: Complete workflow with monitoring
async function completeWorkflowExample() {
  const teamId = 'demo-team-123';
  const newPlaceId = 'ChIJN1t_tDeuEmsRUsoyG83frY4'; // Example Google Place ID
  const oldPlaceId = 'ChIJrTLr-GyuEmsRBfy61i59si0'; // Previous Place ID
  
  console.log('=== Event-Driven Workflow Example ===\n');
  
  // Step 1: Start monitoring
  console.log('1. Setting up real-time monitoring...');
  const stopMonitoring = monitorWorkflowProgress(teamId);
  
  // Step 2: Wait a moment for connection to establish
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Step 3: Trigger the workflow
  console.log('\n2. Triggering workflow...');
  await updateGooglePlaceId(teamId, newPlaceId);
  
  // Step 4: Let the workflow run for a while
  console.log('\n3. Monitoring workflow progress...');
  console.log('   (This will show real-time updates as they happen)');
  
  // In a real application, you might want to:
  // - Show a progress indicator in the UI
  // - Update the UI state based on events
  // - Handle errors gracefully
  // - Allow users to cancel the workflow
  
  // For demo purposes, we'll monitor for 2 minutes
  setTimeout(() => {
    console.log('\n4. Demo completed - stopping monitoring');
    stopMonitoring();
  }, 120000); // 2 minutes
}

// Example: React-style hook for workflow status
interface WorkflowStatus {
  stage: 'idle' | 'cleanup' | 'creating_profile' | 'scraping_reviews' | 'processing_overview' | 'completed' | 'error';
  message: string;
  timestamp: Date;
  progress: number; // 0-100
}

function createWorkflowStatusTracker(teamId: string) {
  let status: WorkflowStatus = {
    stage: 'idle',
    message: 'Ready',
    timestamp: new Date(),
    progress: 0
  };
  
  const listeners: ((status: WorkflowStatus) => void)[] = [];
  
  const eventSource = new EventSource(`/api/events/${teamId}`);
  
  const updateStatus = (newStatus: Partial<WorkflowStatus>) => {
    status = { ...status, ...newStatus, timestamp: new Date() };
    listeners.forEach(listener => listener(status));
  };
  
  eventSource.addEventListener('market_identifier_change', () => {
    updateStatus({ 
      stage: 'cleanup', 
      message: 'Cleaning up old data...', 
      progress: 10 
    });
  });
  
  eventSource.addEventListener('business_profile_created', () => {
    updateStatus({ 
      stage: 'creating_profile', 
      message: 'Business profile created', 
      progress: 30 
    });
  });
  
  eventSource.addEventListener('review_scraping', (event) => {
    const data = JSON.parse(event.data);
    if (data.status === 'queued') {
      updateStatus({ 
        stage: 'scraping_reviews', 
        message: 'Review scraping queued', 
        progress: 40 
      });
    } else if (data.status === 'started') {
      updateStatus({ 
        stage: 'scraping_reviews', 
        message: 'Scraping reviews...', 
        progress: 60 
      });
    } else if (data.status === 'completed') {
      updateStatus({ 
        stage: 'processing_overview', 
        message: 'Processing overview...', 
        progress: 80 
      });
    } else if (data.status === 'failed') {
      updateStatus({ 
        stage: 'error', 
        message: `Review scraping failed: ${data.error}`, 
        progress: 0 
      });
    }
  });
  
  eventSource.addEventListener('overview_processing', (event) => {
    const data = JSON.parse(event.data);
    if (data.status === 'completed') {
      updateStatus({ 
        stage: 'completed', 
        message: 'Workflow completed successfully', 
        progress: 100 
      });
    } else if (data.status === 'failed') {
      updateStatus({ 
        stage: 'error', 
        message: `Overview processing failed: ${data.error}`, 
        progress: 0 
      });
    }
  });
  
  return {
    getStatus: () => status,
    subscribe: (listener: (status: WorkflowStatus) => void) => {
      listeners.push(listener);
      return () => {
        const index = listeners.indexOf(listener);
        if (index > -1) listeners.splice(index, 1);
      };
    },
    close: () => eventSource.close()
  };
}

// Example usage in a UI framework
function exampleUIIntegration() {
  const teamId = 'demo-team-123';
  const tracker = createWorkflowStatusTracker(teamId);
  
  // Subscribe to status updates
  const unsubscribe = tracker.subscribe((status) => {
    console.log(`UI Update: ${status.stage} - ${status.message} (${status.progress}%)`);
    
    // In a real UI framework, you would:
    // - Update progress bars
    // - Show/hide loading indicators
    // - Display status messages
    // - Enable/disable buttons
    // - Show error states
  });
  
  // Trigger a workflow
  updateGooglePlaceId(teamId, 'ChIJN1t_tDeuEmsRUsoyG83frY4');
  
  // Cleanup when component unmounts
  setTimeout(() => {
    unsubscribe();
    tracker.close();
  }, 60000);
}

// Export examples for use
export {
  updateGooglePlaceId,
  manualWorkflowTrigger,
  monitorWorkflowProgress,
  completeWorkflowExample,
  createWorkflowStatusTracker,
  exampleUIIntegration
};

// Run the complete example if this file is executed directly
if (require.main === module) {
  completeWorkflowExample().catch(console.error);
} 