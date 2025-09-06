import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ActivityItem {
  id: string;
  type: 'user_login' | 'org_created' | 'app_approved' | 'partnership_created';
  message: string;
  user: string;
  timestamp: Date | string;
  metadata?: Record<string, unknown>;
}

export const RecentActivityFeed: React.FC = () => {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRecentActivity();
  }, []);

  const loadRecentActivity = async () => {
    try {
      setLoading(true);
      const { data: response, error } = await supabase.functions.invoke('admin-recent-activity');
      if (error) throw error;
      if (!response?.success) throw new Error(response?.error || 'Request failed');
      setActivities(response.data || []);
    } catch (error) {
      console.error('Failed to load recent activity:', error);
      setActivities([
        {
          id: '1',
          type: 'user_login',
          message: 'Demo user logged in',
          user: 'Demo',
          timestamp: new Date(Date.now() - 5 * 60 * 1000),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const getActivityIcon = (type: ActivityItem['type']) => {
    switch (type) {
      case 'user_login':
        return '👤';
      case 'org_created':
        return '🏢';
      case 'app_approved':
        return '✅';
      case 'partnership_created':
        return '🤝';
      default:
        return '📝';
    }
  };

  const formatTimestamp = (timestamp: Date | string) => {
    const now = new Date();
    const dateObj = timestamp instanceof Date ? timestamp : new Date(timestamp);
    const diff = now.getTime() - dateObj.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  return (
    <div className="recent-activity-feed bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
      {loading ? (
        <div className="text-sm text-gray-500">Loading...</div>
      ) : (
        <div className="space-y-3">
          {activities.map((activity) => (
            <div key={activity.id} className="flex items-start space-x-3">
              <div className="text-lg">{getActivityIcon(activity.type)}</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-900 dark:text-white">{activity.message}</p>
                <div className="flex items-center space-x-2 mt-1">
                  <span className="text-xs text-gray-500 dark:text-gray-400">{activity.user}</span>
                  <span className="text-xs text-gray-400">•</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">{formatTimestamp(activity.timestamp)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
        <button className="text-sm text-orange-600 hover:text-orange-700 font-medium">View all activity →</button>
      </div>
    </div>
  );
};

export default RecentActivityFeed;
