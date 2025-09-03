import React from 'react';

interface SecurityCompliancePanelProps {
  defaultTab?: string;
}

const SecurityCompliancePanel: React.FC<SecurityCompliancePanelProps> = ({ defaultTab }) => {
  return (
    <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow">
      <h2 className="text-lg font-semibold mb-4">Security & Compliance</h2>
      <p className="text-sm">Placeholder for security panels. Default tab: {defaultTab}</p>
    </div>
  );
};

export { SecurityCompliancePanel };
export default SecurityCompliancePanel;
