/**
 * Admin Components for Billing and Subscription Management
 * Super admin interface for managing subscriptions and overrides
 */

'use client';

import React, { useState, useCallback } from 'react';
import { useSubscription, useAccessToken } from './hooks';
import type { SubscriptionTier, OverrideType } from './types';

interface TeamSubscriptionManagerProps {
  teamId: string;
  onClose: () => void;
}

/**
 * Team Subscription Manager Component
 */
export const TeamSubscriptionManager: React.FC<TeamSubscriptionManagerProps> = ({
  teamId,
  onClose,
}) => {
  const { subscription, loading, error, refresh } = useSubscription(teamId);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    tier: subscription?.tier || 'FREE' as SubscriptionTier,
    maxSeats: subscription?.currentSeats || 1,
    maxLocations: subscription?.currentLocations || 1,
    customFeatures: subscription?.enabledFeatures || [],
  });

  const handleSave = async () => {
    try {
      // Call API to update subscription
      const response = await fetch(`/api/admin/subscriptions/${teamId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        await refresh();
        setIsEditing(false);
      }
    } catch (err) {
      console.error('Failed to update subscription:', err);
    }
  };

  if (loading) {
    return <div className="loading">Loading subscription...</div>;
  }

  if (error) {
    return <div className="error">Error: {error}</div>;
  }

  return (
    <div className="team-subscription-manager">
      <div className="team-subscription-manager__header">
        <h3>Manage Team Subscription</h3>
        <button onClick={onClose} className="close-btn">Close</button>
      </div>

      {subscription ? (
        <div className="subscription-details">
          <div className="subscription-details__info">
            <h4>Current Subscription</h4>
            <div className="info-grid">
              <div className="info-item">
                <label>Tier:</label>
                <span className={`tier-badge ${subscription.tier.toLowerCase()}`}>
                  {subscription.tier}
                </span>
              </div>
              <div className="info-item">
                <label>Status:</label>
                <span className={`status-badge ${subscription.status.toLowerCase()}`}>
                  {subscription.status}
                </span>
              </div>
              <div className="info-item">
                <label>Current Seats:</label>
                <span>{subscription.currentSeats}</span>
              </div>
              <div className="info-item">
                <label>Current Locations:</label>
                <span>{subscription.currentLocations}</span>
              </div>
              {subscription.trialEnd && (
                <div className="info-item">
                  <label>Trial Ends:</label>
                  <span>{new Date(subscription.trialEnd).toLocaleDateString()}</span>
                </div>
              )}
              {subscription.currentPeriodEnd && (
                <div className="info-item">
                  <label>Next Billing:</label>
                  <span>{new Date(subscription.currentPeriodEnd).toLocaleDateString()}</span>
                </div>
              )}
            </div>

            <div className="enabled-features">
              <h5>Enabled Features:</h5>
              <div className="feature-tags">
                {subscription.enabledFeatures.map(feature => (
                  <span key={feature} className="feature-tag">
                    {feature.replace(/_/g, ' ')}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {isEditing ? (
            <div className="subscription-editor">
              <h4>Edit Subscription</h4>
              
              <div className="form-field">
                <label htmlFor="tier">Subscription Tier:</label>
                <select
                  id="tier"
                  value={formData.tier}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    tier: e.target.value as SubscriptionTier 
                  }))}
                >
                  <option value="FREE">Free</option>
                  <option value="STARTER">Starter</option>
                  <option value="PROFESSIONAL">Professional</option>
                  <option value="ENTERPRISE">Enterprise</option>
                  <option value="CUSTOM">Custom</option>
                </select>
              </div>

              <div className="form-field">
                <label htmlFor="maxSeats">Max Seats:</label>
                <input
                  id="maxSeats"
                  type="number"
                  min="1"
                  value={formData.maxSeats}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    maxSeats: parseInt(e.target.value) 
                  }))}
                />
              </div>

              <div className="form-field">
                <label htmlFor="maxLocations">Max Locations:</label>
                <input
                  id="maxLocations"
                  type="number"
                  min="0"
                  value={formData.maxLocations}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    maxLocations: parseInt(e.target.value) 
                  }))}
                />
              </div>

              <div className="form-actions">
                <button onClick={() => setIsEditing(false)}>Cancel</button>
                <button onClick={handleSave} className="primary">Save Changes</button>
              </div>
            </div>
          ) : (
            <div className="subscription-actions">
              <button onClick={() => setIsEditing(true)}>Edit Subscription</button>
            </div>
          )}
        </div>
      ) : (
        <div className="no-subscription">
          <p>No subscription found for this team.</p>
          <button onClick={() => setIsEditing(true)}>Create Subscription</button>
        </div>
      )}
    </div>
  );
};

interface BillingOverrideManagerProps {
  teamId: string;
}

/**
 * Billing Override Manager Component
 */
export const BillingOverrideManager: React.FC<BillingOverrideManagerProps> = ({
  teamId,
}) => {
  const [overrides, setOverrides] = useState<any[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createFormData, setCreateFormData] = useState({
    type: 'FEATURE' as OverrideType,
    key: '',
    value: '',
    reason: '',
    expiresAt: '',
  });

  const handleCreateOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const response = await fetch(`/api/admin/subscriptions/${teamId}/overrides`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...createFormData,
          value: JSON.parse(createFormData.value || 'true'),
          expiresAt: createFormData.expiresAt ? new Date(createFormData.expiresAt) : null,
        }),
      });

      if (response.ok) {
        setShowCreateForm(false);
        setCreateFormData({
          type: 'FEATURE',
          key: '',
          value: '',
          reason: '',
          expiresAt: '',
        });
        // Refresh overrides list
      }
    } catch (err) {
      console.error('Failed to create override:', err);
    }
  };

  return (
    <div className="billing-override-manager">
      <div className="billing-override-manager__header">
        <h4>Billing Overrides</h4>
        <button 
          onClick={() => setShowCreateForm(true)}
          className="create-override-btn"
        >
          Create Override
        </button>
      </div>

      {showCreateForm && (
        <form onSubmit={handleCreateOverride} className="override-form">
          <h5>Create Billing Override</h5>
          
          <div className="form-field">
            <label htmlFor="type">Override Type:</label>
            <select
              id="type"
              value={createFormData.type}
              onChange={(e) => setCreateFormData(prev => ({ 
                ...prev, 
                type: e.target.value as OverrideType 
              }))}
            >
              <option value="FEATURE">Feature</option>
              <option value="LIMIT">Limit</option>
              <option value="QUOTA">Quota</option>
              <option value="PRICING">Pricing</option>
            </select>
          </div>

          <div className="form-field">
            <label htmlFor="key">Key:</label>
            <input
              id="key"
              type="text"
              value={createFormData.key}
              onChange={(e) => setCreateFormData(prev => ({ ...prev, key: e.target.value }))}
              placeholder="e.g., max_locations, feature_advanced_analytics"
              required
            />
          </div>

          <div className="form-field">
            <label htmlFor="value">Value (JSON):</label>
            <textarea
              id="value"
              value={createFormData.value}
              onChange={(e) => setCreateFormData(prev => ({ ...prev, value: e.target.value }))}
              placeholder="true, 100, or complex JSON object"
              required
            />
          </div>

          <div className="form-field">
            <label htmlFor="reason">Reason:</label>
            <input
              id="reason"
              type="text"
              value={createFormData.reason}
              onChange={(e) => setCreateFormData(prev => ({ ...prev, reason: e.target.value }))}
              placeholder="Why is this override needed?"
            />
          </div>

          <div className="form-field">
            <label htmlFor="expiresAt">Expires At (optional):</label>
            <input
              id="expiresAt"
              type="datetime-local"
              value={createFormData.expiresAt}
              onChange={(e) => setCreateFormData(prev => ({ ...prev, expiresAt: e.target.value }))}
            />
          </div>

          <div className="form-actions">
            <button type="button" onClick={() => setShowCreateForm(false)}>
              Cancel
            </button>
            <button type="submit">Create Override</button>
          </div>
        </form>
      )}

      <div className="overrides-list">
        {overrides.length === 0 ? (
          <p>No billing overrides found.</p>
        ) : (
          overrides.map((override) => (
            <div key={override.id} className="override-item">
              <div className="override-item__header">
                <span className="override-type">{override.type}</span>
                <button className="delete-btn">Delete</button>
              </div>
              <div className="override-item__content">
                <p><strong>Key:</strong> {override.key}</p>
                <p><strong>Value:</strong> {JSON.stringify(override.value)}</p>
                {override.reason && <p><strong>Reason:</strong> {override.reason}</p>}
                {override.expiresAt && (
                  <p><strong>Expires:</strong> {new Date(override.expiresAt).toLocaleString()}</p>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

interface AccessTokenManagerProps {
  className?: string;
}

/**
 * Access Token Manager Component
 */
export const AccessTokenManager: React.FC<AccessTokenManagerProps> = ({
  className = '',
}) => {
  const [tokens, setTokens] = useState<any[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createFormData, setCreateFormData] = useState({
    type: 'DEMO' as 'DEMO' | 'TRIAL' | 'BETA' | 'ENTERPRISE',
    maxTeams: 1,
    maxLocations: 1,
    maxDurationDays: 14,
    maxUses: 1,
    allowedFeatures: [] as string[],
  });

  const handleCreateToken = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const response = await fetch('/api/admin/access-tokens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createFormData),
      });

      if (response.ok) {
        const newToken = await response.json();
        setTokens(prev => [newToken, ...prev]);
        setShowCreateForm(false);
        setCreateFormData({
          type: 'DEMO',
          maxTeams: 1,
          maxLocations: 1,
          maxDurationDays: 14,
          maxUses: 1,
          allowedFeatures: [],
        });
      }
    } catch (err) {
      console.error('Failed to create access token:', err);
    }
  };

  return (
    <div className={`access-token-manager ${className}`}>
      <div className="access-token-manager__header">
        <h3>Access Token Management</h3>
        <button 
          onClick={() => setShowCreateForm(true)}
          className="create-token-btn"
        >
          Create Token
        </button>
      </div>

      {showCreateForm && (
        <form onSubmit={handleCreateToken} className="token-form">
          <h4>Create Access Token</h4>
          
          <div className="form-field">
            <label htmlFor="tokenType">Token Type:</label>
            <select
              id="tokenType"
              value={createFormData.type}
              onChange={(e) => setCreateFormData(prev => ({ 
                ...prev, 
                type: e.target.value as typeof createFormData.type 
              }))}
            >
              <option value="DEMO">Demo</option>
              <option value="TRIAL">Trial</option>
              <option value="BETA">Beta</option>
              <option value="ENTERPRISE">Enterprise</option>
            </select>
          </div>

          <div className="form-row">
            <div className="form-field">
              <label htmlFor="maxTeams">Max Teams:</label>
              <input
                id="maxTeams"
                type="number"
                min="1"
                value={createFormData.maxTeams}
                onChange={(e) => setCreateFormData(prev => ({ 
                  ...prev, 
                  maxTeams: parseInt(e.target.value) 
                }))}
              />
            </div>

            <div className="form-field">
              <label htmlFor="maxLocations">Max Locations:</label>
              <input
                id="maxLocations"
                type="number"
                min="1"
                value={createFormData.maxLocations}
                onChange={(e) => setCreateFormData(prev => ({ 
                  ...prev, 
                  maxLocations: parseInt(e.target.value) 
                }))}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-field">
              <label htmlFor="maxDurationDays">Duration (days):</label>
              <input
                id="maxDurationDays"
                type="number"
                min="1"
                value={createFormData.maxDurationDays}
                onChange={(e) => setCreateFormData(prev => ({ 
                  ...prev, 
                  maxDurationDays: parseInt(e.target.value) 
                }))}
              />
            </div>

            <div className="form-field">
              <label htmlFor="maxUses">Max Uses:</label>
              <input
                id="maxUses"
                type="number"
                min="1"
                value={createFormData.maxUses}
                onChange={(e) => setCreateFormData(prev => ({ 
                  ...prev, 
                  maxUses: parseInt(e.target.value) 
                }))}
              />
            </div>
          </div>

          <div className="form-actions">
            <button type="button" onClick={() => setShowCreateForm(false)}>
              Cancel
            </button>
            <button type="submit">Create Token</button>
          </div>
        </form>
      )}

      <div className="tokens-list">
        <div className="tokens-list__header">
          <h4>Active Tokens</h4>
        </div>
        
        {tokens.length === 0 ? (
          <p>No access tokens found.</p>
        ) : (
          tokens.map((token) => (
            <div key={token.id} className="token-item">
              <div className="token-item__header">
                <span className={`token-type ${token.type.toLowerCase()}`}>
                  {token.type}
                </span>
                <span className="token-usage">
                  {token.usedCount}/{token.maxUses} uses
                </span>
              </div>
              
              <div className="token-item__content">
                <div className="token-value">
                  <label>Token:</label>
                  <code>{token.token}</code>
                  <button className="copy-btn">Copy</button>
                </div>
                
                <div className="token-details">
                  <p>Max Teams: {token.maxTeams}</p>
                  <p>Max Locations: {token.maxLocations}</p>
                  <p>Duration: {token.maxDurationDays} days</p>
                  <p>Expires: {new Date(token.expiresAt).toLocaleDateString()}</p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
