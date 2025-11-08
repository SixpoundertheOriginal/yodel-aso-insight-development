
import React from "react";
import { useLocation } from "react-router-dom";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { UserMenu } from "./UserMenu";
import { AppSelector } from "./AppSelector";
import { BigQueryAppSelector } from "./BigQueryAppSelector";
import { Heading3 } from "./ui/design-system";
import { useBigQueryAppSelection } from "@/context/BigQueryAppContext";
import { usePermissions } from "@/hooks/usePermissions";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useSuperAdmin } from "@/context/SuperAdminContext";
import GlobalDemoIndicator from "./GlobalDemoIndicator";

const TopBar: React.FC = React.memo(() => {
  const location = useLocation();
  const { selectedApps, setSelectedApps } = useBigQueryAppSelection();
  const { permissions, isLoading: permissionsLoading } = usePermissions();
  const { isSuperAdmin } = useSuperAdmin();
  
  const getPageTitle = () => {
    switch (location.pathname) {
      case '/dashboard-v2':
        return 'Performance Dashboard';
      case '/overview':
        return 'Overview';
      case '/dashboard':
        return 'Store Performance';
      case '/conversion-analysis':
        return 'Conversion Analysis';
      case '/insights':
        return 'Insights';
      case '/aso-ai-hub':
        return 'ASO AI Hub';
      case '/apps':
        return 'Apps';
      case '/profile':
        return 'Profile';
      case '/settings':
        return 'Settings';
      case '/admin':
        return 'Admin Panel';
      default:
        return 'Dashboard';
    }
  };

  // Analytics pages use BigQuery data
  const analyticsPages = ['/dashboard-v2', '/dashboard', '/overview', '/conversion-analysis', '/insights'];
  const isAnalyticsPage = analyticsPages.includes(location.pathname);
  
  // Growth Accelerator pages don't need app selector (they work independently)
  const growthAcceleratorPages = [
    '/aso-knowledge-engine',
    '/metadata-copilot',
    '/growth-gap-copilot',
    '/featuring-toolkit',
    '/creative-analysis',
    '/aso-ai-hub',
    '/chatgpt-visibility-audit',
    '/apps'
  ];
  const isGrowthAcceleratorPage = growthAcceleratorPages.includes(location.pathname);
  
  // Auth and system pages
  const authPages = ['/auth/sign-in', '/auth/sign-up', '/'];
  const systemPages = ['/profile', '/settings', '/admin'];
  const showManualAppSelector = !isAnalyticsPage && !isGrowthAcceleratorPage && !authPages.includes(location.pathname) && !systemPages.includes(location.pathname);

  return (
      <div className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-sm text-muted-foreground">
      <div className="flex h-16 items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-4">
            <SidebarTrigger className="h-8 w-8 text-muted-foreground hover:text-foreground" />
          <div className="flex items-center gap-3">
            <div className="h-2 w-2 rounded-full bg-yodel-orange"></div>
            <Heading3 className="text-lg font-semibold text-foreground sm:text-2xl">
              {getPageTitle()}
            </Heading3>
            <GlobalDemoIndicator />
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* BigQuery App Selector for Analytics pages */}
          {isAnalyticsPage && !permissionsLoading && (
            <div className="hidden md:block">
              <BigQueryAppSelector
                organizationId={permissions?.org_id}
                selectedApps={selectedApps}
                onSelectionChange={setSelectedApps}
              />
            </div>
          )}
          
          {/* Manual App Selector for AI Copilots pages */}
          {showManualAppSelector && (
            <div className="hidden md:block">
              <AppSelector />
            </div>
          )}
          
          <div className="flex items-center gap-2">
            {isSuperAdmin && (
              <div className="theme-toggle-container">
                <ThemeToggle />
              </div>
            )}
            <UserMenu />
          </div>
        </div>
      </div>

      {/* Mobile controls - show below header on mobile when needed */}
      <div className="border-t border-border bg-background px-4 py-3 md:hidden">
        <div className="flex items-center justify-between">
          {isAnalyticsPage && !permissionsLoading && (
            <BigQueryAppSelector
              organizationId={permissions?.org_id}
              selectedApps={selectedApps}
              onSelectionChange={setSelectedApps}
            />
          )}
          {showManualAppSelector && <AppSelector />}
        </div>
      </div>
    </div>
  );
});

TopBar.displayName = "TopBar";
export default TopBar;
