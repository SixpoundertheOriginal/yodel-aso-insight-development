import React from 'react';
import {
  Building2,
  CheckCircle,
  ChevronRight,
  FileText,
  Settings,
  UserPlus,
} from 'lucide-react';

export const QuickActionsPanel: React.FC = () => {
  const quickActions = [
    {
      title: 'Create Organization',
      description: 'Add new client organization',
      icon: Building2,
      action: () => console.log('Create org'),
      color: 'from-blue-500 to-blue-600',
    },
    {
      title: 'Invite User',
      description: 'Send user invitation',
      icon: UserPlus,
      action: () => console.log('Invite user'),
      color: 'from-green-500 to-green-600',
    },
    {
      title: 'Approve Apps',
      description: 'Review pending app requests',
      icon: CheckCircle,
      action: () => console.log('Approve apps'),
      color: 'from-orange-500 to-orange-600',
    },
    {
      title: 'View Audit Logs',
      description: 'Security and compliance logs',
      icon: FileText,
      action: () => console.log('Audit logs'),
      color: 'from-purple-500 to-purple-600',
    },
  ];

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
      <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
        <Settings className="w-5 h-5 mr-2 text-orange-400" />
        Quick Actions
      </h3>
      <div className="space-y-3">
        {quickActions.map((action, index) => {
          const IconComponent = action.icon;
          return (
            <button
              key={index}
              onClick={action.action}
              className="w-full flex items-center p-3 rounded-lg border border-gray-700 hover:border-gray-600 hover:bg-gray-750 transition-all duration-200 group"
            >
              <div className={`w-10 h-10 rounded-lg bg-gradient-to-r ${action.color} flex items-center justify-center mr-3 group-hover:scale-105 transition-transform`}>
                <IconComponent className="w-5 h-5 text-white" />
              </div>
              <div className="text-left">
                <div className="font-medium text-white group-hover:text-orange-400 transition-colors">
                  {action.title}
                </div>
                <div className="text-sm text-gray-400">{action.description}</div>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-500 ml-auto group-hover:text-orange-400 transition-colors" />
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default QuickActionsPanel;
