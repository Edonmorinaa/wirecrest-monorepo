/**
 * Super Admin Billing Management Page
 */

'use client';

import React, { useState } from 'react';
import { SuperRole } from '@prisma/client';
import { RoleGuard } from '@/components/guards/RoleGuard';
import { 
  AccessTokenManager,
  cleanupExpiredData,
  TeamSubscriptionManager,
} from '@wirecrest/billing';

interface TeamSubscription {
  id: string;
  teamId: string;
  tier: string;
  status: string;
  currentSeats: number;
  currentLocations: number;
  team: {
    name: string;
    slug: string;
  };
}

export default function BillingAdminPage() {
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'subscriptions' | 'tokens' | 'analytics'>('subscriptions');
  const [subscriptions, setSubscriptions] = useState<TeamSubscription[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSelectTeam = (teamId: string) => {
    setSelectedTeamId(teamId);
  };

  const handleCloseTeamManager = () => {
    setSelectedTeamId(null);
  };

  const handleCleanupExpired = async () => {
    setLoading(true);
    try {
      const result = await cleanupExpiredData();
      if (result.success) {
        alert(`Cleanup complete: ${result.deleted.tokens} tokens, ${result.deleted.overrides} overrides, ${result.deleted.redemptions} redemptions deleted`);
      }
    } catch (error) {
      console.error('Failed to cleanup expired data:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderSubscriptionsTab = () => (
    <div className="subscriptions-tab">
      <div className="subscriptions-tab__header">
        <h3>Team Subscriptions</h3>
        <button 
          onClick={handleCleanupExpired}
          disabled={loading}
          className="cleanup-btn"
        >
          {loading ? 'Cleaning...' : 'Cleanup Expired'}
        </button>
      </div>

      <div className="subscriptions-grid">
        {subscriptions.map((subscription) => (
          <div key={subscription.id} className="subscription-card">
            <div className="subscription-card__header">
              <h4>{subscription.team.name}</h4>
              <span className={`tier-badge ${subscription.tier.toLowerCase()}`}>
                {subscription.tier}
              </span>
            </div>
            
            <div className="subscription-card__content">
              <div className="subscription-info">
                <span>Status: <strong>{subscription.status}</strong></span>
                <span>Seats: <strong>{subscription.currentSeats}</strong></span>
                <span>Locations: <strong>{subscription.currentLocations}</strong></span>
              </div>
              
              <button 
                onClick={() => handleSelectTeam(subscription.teamId)}
                className="manage-btn"
              >
                Manage
              </button>
            </div>
          </div>
        ))}
      </div>

      {selectedTeamId && (
        <div className="modal-overlay">
          <div className="modal-content">
            <TeamSubscriptionManager
              teamId={selectedTeamId}
              onClose={handleCloseTeamManager}
            />
          </div>
        </div>
      )}
    </div>
  );

  const renderTokensTab = () => (
    <div className="tokens-tab">
      <AccessTokenManager />
    </div>
  );

  const renderAnalyticsTab = () => (
    <div className="analytics-tab">
      <div className="analytics-grid">
        <div className="analytics-card">
          <h4>Subscription Overview</h4>
          <div className="analytics-stats">
            <div className="stat">
              <span className="stat-label">Total Subscriptions</span>
              <span className="stat-value">124</span>
            </div>
            <div className="stat">
              <span className="stat-label">Active Trials</span>
              <span className="stat-value">18</span>
            </div>
            <div className="stat">
              <span className="stat-label">Paid Subscriptions</span>
              <span className="stat-value">89</span>
            </div>
          </div>
        </div>

        <div className="analytics-card">
          <h4>Revenue Metrics</h4>
          <div className="analytics-stats">
            <div className="stat">
              <span className="stat-label">Monthly Recurring Revenue</span>
              <span className="stat-value">$12,450</span>
            </div>
            <div className="stat">
              <span className="stat-label">Average Revenue Per User</span>
              <span className="stat-value">$89</span>
            </div>
            <div className="stat">
              <span className="stat-label">Churn Rate</span>
              <span className="stat-value">3.2%</span>
            </div>
          </div>
        </div>

        <div className="analytics-card">
          <h4>Usage Statistics</h4>
          <div className="analytics-stats">
            <div className="stat">
              <span className="stat-label">API Calls (30d)</span>
              <span className="stat-value">2.1M</span>
            </div>
            <div className="stat">
              <span className="stat-label">Data Refreshes (30d)</span>
              <span className="stat-value">45K</span>
            </div>
            <div className="stat">
              <span className="stat-label">Active Locations</span>
              <span className="stat-value">567</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <RoleGuard requireRole={SuperRole.ADMIN}>
      <div className="billing-admin">
        <div className="billing-admin__header">
          <h1>Billing & Subscription Management</h1>
          <p>Manage subscriptions, access tokens, and billing analytics</p>
        </div>

        <div className="billing-admin__tabs">
          <button 
            className={`tab ${activeTab === 'subscriptions' ? 'active' : ''}`}
            onClick={() => setActiveTab('subscriptions')}
          >
            Subscriptions
          </button>
          <button 
            className={`tab ${activeTab === 'tokens' ? 'active' : ''}`}
            onClick={() => setActiveTab('tokens')}
          >
            Access Tokens
          </button>
          <button 
            className={`tab ${activeTab === 'analytics' ? 'active' : ''}`}
            onClick={() => setActiveTab('analytics')}
          >
            Analytics
          </button>
        </div>

        <div className="billing-admin__content">
          {activeTab === 'subscriptions' && renderSubscriptionsTab()}
          {activeTab === 'tokens' && renderTokensTab()}
          {activeTab === 'analytics' && renderAnalyticsTab()}
        </div>
      </div>

      <style jsx>{`
        .billing-admin {
          padding: 2rem;
          min-height: 100vh;
        }

        .billing-admin__header h1 {
          margin: 0 0 0.5rem 0;
          color: #1a1a1a;
        }

        .billing-admin__header p {
          margin: 0 0 2rem 0;
          color: #666;
        }

        .billing-admin__tabs {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 2rem;
          border-bottom: 1px solid #e0e0e0;
        }

        .tab {
          padding: 0.75rem 1.5rem;
          border: none;
          background: none;
          color: #666;
          cursor: pointer;
          border-bottom: 2px solid transparent;
          transition: all 0.2s;
        }

        .tab:hover {
          color: #1a1a1a;
        }

        .tab.active {
          color: #007bff;
          border-bottom-color: #007bff;
        }

        .billing-admin__content {
          background: #fff;
          border-radius: 8px;
          padding: 2rem;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .subscriptions-tab__header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
        }

        .subscriptions-tab__header h3 {
          margin: 0;
          color: #1a1a1a;
        }

        .cleanup-btn {
          padding: 0.5rem 1rem;
          background: #f8f9fa;
          border: 1px solid #dee2e6;
          border-radius: 4px;
          cursor: pointer;
          transition: background-color 0.2s;
        }

        .cleanup-btn:hover:not(:disabled) {
          background: #e9ecef;
        }

        .cleanup-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .subscriptions-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 1.5rem;
        }

        .subscription-card {
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          padding: 1.5rem;
          transition: box-shadow 0.2s;
        }

        .subscription-card:hover {
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }

        .subscription-card__header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }

        .subscription-card__header h4 {
          margin: 0;
          color: #1a1a1a;
        }

        .tier-badge {
          padding: 0.25rem 0.75rem;
          border-radius: 20px;
          font-size: 0.8rem;
          font-weight: 600;
          text-transform: uppercase;
        }

        .tier-badge.free {
          background: #f8f9fa;
          color: #6c757d;
        }

        .tier-badge.starter {
          background: #e3f2fd;
          color: #1976d2;
        }

        .tier-badge.professional {
          background: #e8f5e8;
          color: #2e7d32;
        }

        .tier-badge.enterprise {
          background: #fff3e0;
          color: #f57c00;
        }

        .subscription-info {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          margin-bottom: 1rem;
        }

        .subscription-info span {
          font-size: 0.9rem;
          color: #666;
        }

        .manage-btn {
          width: 100%;
          padding: 0.75rem;
          background: #007bff;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          transition: background-color 0.2s;
        }

        .manage-btn:hover {
          background: #0056b3;
        }

        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .modal-content {
          background: white;
          border-radius: 8px;
          padding: 2rem;
          max-width: 600px;
          width: 90%;
          max-height: 90vh;
          overflow-y: auto;
        }

        .analytics-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 2rem;
        }

        .analytics-card {
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          padding: 1.5rem;
        }

        .analytics-card h4 {
          margin: 0 0 1.5rem 0;
          color: #1a1a1a;
        }

        .analytics-stats {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .stat {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .stat-label {
          color: #666;
          font-size: 0.9rem;
        }

        .stat-value {
          font-weight: 600;
          font-size: 1.1rem;
          color: #1a1a1a;
        }
      `}</style>
    </RoleGuard>
  );
}
