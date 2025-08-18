import React from 'react';

interface PlatformHealthChartProps {
  metrics: {
    platform_health?: Record<string, unknown>;
  } | null;
}

export const PlatformHealthChart: React.FC<PlatformHealthChartProps> = ({ metrics }) => {
  // Placeholder chart implementation
  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-4">Platform Health</h3>
      <pre className="text-xs overflow-auto">
        {JSON.stringify(metrics?.platform_health, null, 2)}
      </pre>
    </div>
  );
};

export default PlatformHealthChart;
