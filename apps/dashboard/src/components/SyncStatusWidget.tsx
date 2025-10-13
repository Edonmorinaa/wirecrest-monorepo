'use client';

/**
 * Sync Status Widget
 * Displays real-time sync status for team's review scraping
 */

import { useEffect, useState } from 'react';
import { ScraperApiClient } from '@/services/scraper-api';

interface SyncStatusWidgetProps {
  teamId: string;
}

export function SyncStatusWidget({ teamId }: SyncStatusWidgetProps) {
  const [status, setStatus] = useState<any>(null);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchStatus() {
      try {
        setLoading(true);
        const [statusData, schedulesData] = await Promise.all([
          ScraperApiClient.getSyncStatus(teamId),
          ScraperApiClient.getSchedules(teamId),
        ]);
        setStatus(statusData);
        setSchedules(schedulesData);
        setError(null);
      } catch (err: any) {
        console.error('Error fetching sync status:', err);
        setError(err.message || 'Failed to load sync status');
      } finally {
        setLoading(false);
      }
    }

    fetchStatus();

    // Refresh every 30 seconds
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, [teamId]);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            <div className="h-4 bg-gray-200 rounded w-4/6"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4 text-red-600">Sync Status</h3>
        <p className="text-sm text-red-500">{error}</p>
      </div>
    );
  }

  const formatDate = (date: Date | string | null) => {
    if (!date) return 'Never';
    return new Date(date).toLocaleString();
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { color: string; text: string }> = {
      completed: { color: 'bg-green-100 text-green-800', text: 'Completed' },
      running: { color: 'bg-blue-100 text-blue-800', text: 'Running' },
      pending: { color: 'bg-yellow-100 text-yellow-800', text: 'Pending' },
      failed: { color: 'bg-red-100 text-red-800', text: 'Failed' },
    };
    const badge = badges[status] || { color: 'bg-gray-100 text-gray-800', text: status };
    return (
      <span className={`px-2 py-1 text-xs rounded-full ${badge.color}`}>
        {badge.text}
      </span>
    );
  };

  const getPlatformIcon = (platform: string) => {
    const icons: Record<string, string> = {
      google_reviews: '🗺️',
      facebook: '📘',
      tripadvisor: '🌍',
      booking: '🏨',
    };
    return icons[platform] || '📊';
  };

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Sync Status</h3>
          <span className="text-sm text-gray-500">
            {status?.activeSchedules || 0} active schedules
          </span>
        </div>

        {/* Active Schedules */}
        {schedules.length > 0 && (
          <div className="mb-6">
            <h4 className="text-sm font-medium text-gray-700 mb-3">Scheduled Syncs</h4>
            <div className="space-y-3">
              {schedules.map((schedule) => (
                <div
                  key={schedule.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">{getPlatformIcon(schedule.platform)}</span>
                    <div>
                      <div className="text-sm font-medium text-gray-900 capitalize">
                        {schedule.platform.replace('_', ' ')} - {schedule.scheduleType}
                      </div>
                      <div className="text-xs text-gray-500">
                        Every {schedule.intervalHours} hours
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    {schedule.lastRunAt && (
                      <div className="text-xs text-gray-500">
                        Last: {formatDate(schedule.lastRunAt)}
                      </div>
                    )}
                    {schedule.nextRunAt && (
                      <div className="text-xs text-blue-600 font-medium">
                        Next: {formatDate(schedule.nextRunAt)}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Syncs */}
        {status?.recentSyncs && status.recentSyncs.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">Recent Activity</h4>
            <div className="space-y-2">
              {status.recentSyncs.slice(0, 5).map((sync: any) => (
                <div
                  key={sync.id}
                  className="flex items-center justify-between p-2 border-l-4 border-blue-500 bg-gray-50 rounded"
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-xl">{getPlatformIcon(sync.platform)}</span>
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {sync.platform.replace('_', ' ')}
                      </div>
                      <div className="text-xs text-gray-500">
                        {formatDate(sync.startedAt)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    {getStatusBadge(sync.status)}
                    {sync.status === 'completed' && (
                      <div className="text-xs text-gray-600">
                        <span className="font-medium text-green-600">{sync.reviewsNew}</span> new
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* No Data State */}
        {(!schedules || schedules.length === 0) &&
          (!status?.recentSyncs || status.recentSyncs.length === 0) && (
            <div className="text-center py-8">
              <p className="text-gray-500 text-sm">
                No sync activity yet. Your data will start syncing automatically.
              </p>
            </div>
          )}
      </div>
    </div>
  );
}

