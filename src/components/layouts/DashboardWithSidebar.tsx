import React, { useState, useEffect } from 'react';
import { ContextualInsightsSidebar } from '@/components/AiInsightsPanel/ContextualInsightsSidebar';
import { SidebarToggle } from '@/components/AiInsightsPanel/SidebarToggle';
import type { MetricsData } from '@/types/aso';

interface DashboardWithSidebarProps {
  children: React.ReactNode;
  metricsData?: MetricsData;
  organizationId: string;
  showSidebar?: boolean;
}

export const DashboardWithSidebar: React.FC<DashboardWithSidebarProps> = ({
  children,
  metricsData,
  organizationId,
  showSidebar = true
}) => {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const sidebarClass = isMobile
    ? `fixed inset-y-0 right-0 z-40 transform transition-transform duration-300 ${isMobileSidebarOpen ? 'translate-x-0' : 'translate-x-full'}`
    : 'fixed right-0 top-0 h-full z-10';

  return (
    <div className="flex min-h-screen bg-gray-50">
      {isMobile && showSidebar && (
        <SidebarToggle
          isOpen={isMobileSidebarOpen}
          onToggle={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
        />
      )}

      <div className={`flex-1 ${showSidebar && !isMobile ? 'mr-80' : ''}`}>
        <div className="p-6">
          {children}
        </div>
      </div>

      {showSidebar && (
        <div className={sidebarClass}>
          <ContextualInsightsSidebar
            metricsData={metricsData}
            organizationId={organizationId}
          />
        </div>
      )}

      {isMobile && isMobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30"
          onClick={() => setIsMobileSidebarOpen(false)}
        />
      )}
    </div>
  );
};

export default DashboardWithSidebar;
