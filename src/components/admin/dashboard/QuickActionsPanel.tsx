import React from 'react';

export const QuickActionsPanel: React.FC = () => {
  const quickActions = [
    {
      title: 'Create Organization',
      description: 'Add new client organization',
      icon: '🏢',
      action: () => console.log('Create org'),
      color: 'bg-blue-500',
    },
    {
      title: 'Invite User',
      description: 'Send user invitation',
      icon: '👤',
      action: () => console.log('Invite user'),
      color: 'bg-green-500',
    },
    {
      title: 'Approve Apps',
      description: 'Review pending app requests',
      icon: '📱',
      action: () => console.log('Approve apps'),
      color: 'bg-orange-500',
    },
    {
      title: 'View Audit Logs',
      description: 'Security and compliance logs',
      icon: '📋',
      action: () => console.log('Audit logs'),
      color: 'bg-purple-500',
    },
  ];

  return (
    <div className="quick-actions-panel bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
      <div className="space-y-3">
        {quickActions.map((action, index) => (
          <button
            key={index}
            onClick={action.action}
            className="w-full flex items-center p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <div className={`w-10 h-10 rounded-lg ${action.color} flex items-center justify-center text-white mr-3`}>
              {action.icon}
            </div>
            <div className="text-left">
              <div className="font-medium text-gray-900 dark:text-white">{action.title}</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">{action.description}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default QuickActionsPanel;
