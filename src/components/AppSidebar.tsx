
import React from "react";
import { Link, useLocation } from "react-router-dom";
import {
  BarChart3,
  TrendingUp,
  Target,
  Bot,
  Home,
  Shield,
  User,
  Settings as SettingsIcon,
  Smartphone,
  Database,
  Brain,
  FileEdit,
  Star,
  Palette,
} from "lucide-react";
import { toast } from "sonner";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { usePermissions } from "@/hooks/usePermissions";
import { useFeatureAccess } from "@/hooks/useFeatureAccess";
import { useUIPermissions } from "@/hooks/useUIPermissions";
import { PLATFORM_FEATURES } from "@/constants/features";
import { SuperAdminBadge } from "@/components/SuperAdminBadge";
import { useAuth } from "@/context/AuthContext";
import { useDemoOrgDetection } from "@/hooks/useDemoOrgDetection";
import { getAllowedRoutes, type Role } from "@/config/allowedRoutes";
import { filterNavigationByRoutes, type NavigationItem } from "@/utils/navigation";

// Performance Intelligence - Pure data visualization from BigQuery
const analyticsItems: NavigationItem[] = [
  {
    title: "Executive Dashboard",
    url: "/dashboard/executive",
    icon: Home,
    featureKey: PLATFORM_FEATURES.EXECUTIVE_DASHBOARD,
  },
  {
    title: "Analytics",
    url: "/dashboard/analytics",
    icon: BarChart3,
    featureKey: PLATFORM_FEATURES.ANALYTICS,
  },
  {
    title: "Conversion Rate",
    url: "/dashboard/conversion-rate",
    icon: Target,
    featureKey: PLATFORM_FEATURES.CONVERSION_INTELLIGENCE,
  },
];

// AI Command Center - Main AI-powered tools
const aiToolsItems: NavigationItem[] = [
  {
    title: "Strategic Audit Engine",
    url: "/aso-ai-hub",
    icon: Bot,
    featureKey: PLATFORM_FEATURES.ASO_CHAT,
  },
  {
    title: "AI Visibility Optimizer",
    url: "/chatgpt-visibility-audit",
    icon: Brain,
    featureKey: PLATFORM_FEATURES.COMPETITIVE_INTELLIGENCE,
  },
];

// Growth Accelerators - Dedicated copilot interfaces
const aiCopilotsItems: NavigationItem[] = [
  {
    title: "Strategy Brain",
    url: "/aso-knowledge-engine",
    icon: Brain,
    featureKey: PLATFORM_FEATURES.ASO_CHAT,
  },
  {
    title: "Metadata Optimizer",
    url: "/metadata-copilot",
    icon: FileEdit,
    featureKey: PLATFORM_FEATURES.METADATA_GENERATOR,
  },
  {
    title: "Opportunity Scanner",
    url: "/growth-gap-copilot",
    icon: TrendingUp,
    featureKey: PLATFORM_FEATURES.KEYWORD_INTELLIGENCE,
  },
  {
    title: "Feature Maximizer",
    url: "/featuring-toolkit",
    icon: Star,
    featureKey: PLATFORM_FEATURES.KEYWORD_INTELLIGENCE,
  },
  {
    title: "Creative Analysis",
    url: "/creative-analysis",
    icon: Palette,
    featureKey: PLATFORM_FEATURES.CREATIVE_REVIEW,
  },
];

// User account items
const userItems: NavigationItem[] = [
  {
    title: "Profile",
    url: "/profile",
    icon: User,
  },
  {
    title: "Preferences",
    url: "/settings",
    icon: SettingsIcon,
  },
];

export function AppSidebar() {
  const location = useLocation();
  const { isSuperAdmin, isOrganizationAdmin, roles = [], isLoading: permissionsLoading } = usePermissions();
  const { hasFeature, loading: featuresLoading } = useFeatureAccess();
  const { hasPermission, loading: uiPermissionsLoading } = useUIPermissions();
  const { user } = useAuth();
  const { isDemoOrg, organization: org, loading: orgLoading } = useDemoOrgDetection();

  if (process.env.NODE_ENV === 'development') {
    console.log('🔍 DEMO DETECTION VALIDATION', {
      org,
      isDemoOrg,
      demo_mode: org?.settings?.demo_mode,
      slug: org?.slug,
    });
  }

  // Define navigation items first, before filtering
  const controlCenterItems: NavigationItem[] = [
    {
      title: "App Intelligence",
      url: "/app-discovery",
      icon: Database,
      featureKey: PLATFORM_FEATURES.APP_DISCOVERY,
    },
    {
      title: "Portfolio Manager",
      url: "/apps",
      icon: Smartphone,
    },
  ];
  if (isSuperAdmin) {
    controlCenterItems.push({
      title: "System Control",
      url: "/admin",
      icon: Shield,
    });
  }
  
  // Coordinate loading states to prevent race condition UI flicker
const allPermissionsLoaded = !permissionsLoading && !featuresLoading && !uiPermissionsLoading && !orgLoading;
  const role =
    (roles[0]?.toUpperCase().replace('ORG_', 'ORGANIZATION_') as Role) || 'VIEWER';
  const routes = getAllowedRoutes({ isDemoOrg, role });
  const isIgor = isSuperAdmin && user?.email === 'igor@yodelmobile.com';
  const accountItems = isIgor ? userItems : userItems.filter(item => item.title !== 'Preferences');

  const filterOptions = { isDemoOrg, isSuperAdmin, routes, hasFeature, hasPermission };

  // Apply route filtering to all navigation sections
  const filteredAnalyticsItems = filterNavigationByRoutes(analyticsItems, filterOptions);
  const filteredAiToolsItems = filterNavigationByRoutes(aiToolsItems, filterOptions);
  const filteredAiCopilotsItems = filterNavigationByRoutes(aiCopilotsItems, filterOptions);
  const filteredControlCenterItems = filterNavigationByRoutes(controlCenterItems, filterOptions);

  // Debug logging for troubleshooting (temporary)
  if (process.env.NODE_ENV === 'development') {
    console.log('🔍 AppSidebar Permission Debug:', {
      // User context
      userId: user?.id,
      organizationSlug: org?.slug,
      organizationName: org?.name,

      // Permission states
      isSuperAdmin,
      isOrganizationAdmin,
      role,
      isDemoOrg,

      // Hook loading states
      permissionsLoading,
      featuresLoading,
      uiPermissionsLoading,
      orgLoading,
      allPermissionsLoaded,
      
      // Route calculation
      allowedRoutes: routes,
      
      // Navigation visibility
      analyticsItemsVisible: filteredAnalyticsItems.length,
      aiToolsItemsVisible: filteredAiToolsItems.length,
      aiCopilotsItemsVisible: filteredAiCopilotsItems.length,
      controlCenterItemsVisible: filteredControlCenterItems.length,
      
      // Expected for Next org
      expectedForNextOrg: isDemoOrg ? filteredAnalyticsItems.map(item => ({
        title: item.title,
        url: item.url,
        allowed: routes.includes(item.url)
      })) : 'N/A - Not demo org',
      
      // Timing
      timestamp: new Date().toISOString()
    });
  }

  const showDevelopmentNotification = (item: NavigationItem) => {
    toast.info(
      `${item.title} is currently under development. Check back soon for powerful ASO insights and analytics!`,
      {
        duration: 4000,
        icon: "🚧",
      }
    );
  };

  const renderNavItem = (item: NavigationItem) => {
    const isActive = location.pathname === item.url;
    const isDisabled =
      item.status === "coming_soon" || item.status === "under_development";
    const statusTag = () => {
      if (item.status === "coming_soon") {
        return (
          <span
            className={`px-2 py-1 text-xs font-medium bg-yellow-500/20 text-yellow-400 rounded-full border border-yellow-500/30 ${
              isDisabled ? "animate-pulse" : ""
            }`}
          >
            {item.statusLabel || "Coming Soon"}
          </span>
        );
      }
      if (item.status === "under_development") {
        return (
          <span
            className={`px-2 py-1 text-xs font-medium bg-blue-500/20 text-blue-400 rounded-full border border-blue-500/30 ${
              isDisabled ? "animate-pulse" : ""
            }`}
          >
            {item.statusLabel || "In Development"}
          </span>
        );
      }
      if (item.status === "beta") {
        return (
          <span
            className={`px-2 py-1 text-xs font-medium bg-purple-500/20 text-purple-400 rounded-full border border-purple-500/30 ${
              isDisabled ? "animate-pulse" : ""
            }`}
          >
            {item.statusLabel || "Beta"}
          </span>
        );
      }
      return null;
    };

    const content = (
      <>
        <item.icon className="h-4 w-4 shrink-0 group-hover:scale-110 transition-transform duration-200" />
        <span className="truncate font-medium">{item.title}</span>
        {statusTag()}
      </>
    );

    return (
      <SidebarMenuItem key={item.title}>
        <SidebarMenuButton
          asChild
          isActive={isActive}
          tooltip={item.title}
          className={`h-11 text-nav-text-secondary data-[active=true]:bg-gradient-to-r data-[active=true]:from-yodel-orange data-[active=true]:to-orange-600 data-[active=true]:text-nav-text data-[active=true]:shadow-lg transition-all duration-200 ease-in-out group ${
            isDisabled
              ? "opacity-60 cursor-not-allowed hover:bg-zinc-800/30 hover:text-nav-text-secondary"
              : "hover:bg-zinc-800/70 hover:text-nav-text"
          }`}
        >
          {isDisabled ? (
            <div
              className="flex items-center gap-3"
              onClick={() => showDevelopmentNotification(item)}
            >
              {content}
            </div>
          ) : (
            <Link to={item.url} className="flex items-center gap-3">
              {content}
            </Link>
          )}
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-footer-border">
      <SidebarHeader className="border-b border-footer-border p-4">
        <div className="flex items-center gap-3 group-data-[collapsible=icon]:justify-center">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-yodel-orange to-orange-600 shadow-lg">
            <span className="text-lg font-bold text-nav-text">Y</span>
          </div>
          <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
            <span className="truncate font-semibold text-nav-text">Yodel ASO</span>
            <span className="truncate text-xs text-nav-text-secondary">Insights Platform</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 py-4">
        {/* Performance Intelligence Section */}
        {filteredAnalyticsItems.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel className="mb-2 border-b border-footer-border/50 px-2 pb-2 text-xs font-semibold uppercase tracking-wide text-nav-text-secondary">
              <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-gradient-to-r from-yodel-blue to-blue-500"></div>
                  Performance Intelligence
                </div>
              </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {filteredAnalyticsItems.map(renderNavItem).filter(Boolean)}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* AI Command Center Section */}
        {filteredAiToolsItems.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel className="mb-2 border-b border-footer-border/50 px-2 pb-2 text-xs font-semibold uppercase tracking-wide text-nav-text-secondary">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-gradient-to-r from-yodel-orange to-orange-500 rounded-full"></div>
                AI Command Center
              </div>
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {filteredAiToolsItems.map(renderNavItem).filter(Boolean)}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Growth Accelerators Section */}
        {filteredAiCopilotsItems.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel className="mb-2 border-b border-footer-border/50 px-2 pb-2 text-xs font-semibold uppercase tracking-wide text-nav-text-secondary">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-gradient-to-r from-emerald-500 to-green-500 rounded-full"></div>
                Growth Accelerators
              </div>
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {filteredAiCopilotsItems.map(renderNavItem).filter(Boolean)}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Control Center Section - visible to org admins and super admins */}
        {filteredControlCenterItems.length > 0 && (isSuperAdmin || isOrganizationAdmin) && (
          <SidebarGroup>
            <SidebarGroupLabel className="mb-2 border-b border-footer-border/50 px-2 pb-2 text-xs font-semibold uppercase tracking-wide text-nav-text-secondary">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-gradient-to-r from-purple-500 to-violet-500 rounded-full"></div>
                Control Center
              </div>
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {filteredControlCenterItems.map(renderNavItem).filter(Boolean)}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Account Section */}
        <SidebarGroup>
          <SidebarGroupLabel className="mb-2 border-b border-footer-border/50 px-2 pb-2 text-xs font-semibold uppercase tracking-wide text-nav-text-secondary">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-gradient-to-r from-zinc-500 to-zinc-400 rounded-full"></div>
              Account
            </div>
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {accountItems.map(renderNavItem)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-footer-border/50 bg-gradient-to-r from-zinc-900/50 to-zinc-800/30 p-4">
        <div className="text-xs font-medium text-nav-text-secondary group-data-[collapsible=icon]:hidden">
          © 2025 Yodel Mobile
        </div>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
