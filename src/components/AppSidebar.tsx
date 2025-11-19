
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
  Users,
  Settings as SettingsIcon,
  Smartphone,
  Database,
  Brain,
  FileEdit,
  Star,
  Palette,
  Search,
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
import { useUnifiedFeatureAccess } from "@/hooks/useUnifiedFeatureAccess";
import { useOrgAccessLevel } from "@/hooks/useOrgAccessLevel";
import { resolvePermForPath } from "@/utils/navigation/navPermissionMap";
import { PLATFORM_FEATURES_ENHANCED as PLATFORM_FEATURES, featureEnabledForRole, UserRole } from '@/constants/features';
import '../utils/featureTestHelper'; // Auto-run feature validation in development
import { SuperAdminBadge } from "@/components/SuperAdminBadge";
import { useAuth } from "@/context/AuthContext";
import { useDemoOrgDetection } from "@/hooks/useDemoOrgDetection";
import { getAllowedRoutes, type Role } from "@/config/allowedRoutes";
import { filterNavigationByRoutes, type NavigationItem } from "@/utils/navigation";
import { useServerAuth } from '@/context/ServerAuthContext';
import { ROUTES } from '@/constants/routes';
import { logger, truncateOrgId } from '@/utils/logger';

// Performance Intelligence - Pure data visualization from BigQuery
const analyticsItems: NavigationItem[] = [
  {
    title: "Performance Dashboard",
    url: "/dashboard-v2",
    icon: Home,
    // No featureKey - always visible for users with route access
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
    featureKey: PLATFORM_FEATURES.ASO_AI_HUB,
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
    featureKey: PLATFORM_FEATURES.AI_METADATA_GENERATOR,
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
  {
    title: "Web Rank (Apps)",
    url: "/growth/web-rank-apps",
    icon: Search,
    featureKey: PLATFORM_FEATURES.KEYWORD_INTELLIGENCE,
  },
  {
    title: "Keyword Intelligence",
    url: "/growth-accelerators/keywords",
    icon: Search,
    featureKey: PLATFORM_FEATURES.KEYWORD_INTELLIGENCE,
  },
  {
    title: "Competitor Overview",
    url: "/growth-accelerators/competitor-overview",
    icon: Users,
    featureKey: PLATFORM_FEATURES.COMPETITOR_OVERVIEW,
  },
  {
    title: "Reviews",
    url: "/growth-accelerators/reviews",
    icon: Star,
    // featureKey handled by custom filtering logic below
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
  const { isSuperAdmin, isOrganizationAdmin, roles = [], organizationId, isLoading: permissionsLoading } = usePermissions();
  const { user } = useAuth();
  const { isDemoOrg, organization: org, loading: orgLoading } = useDemoOrgDetection();
  const { hasFeature, loading: featuresLoading } = useFeatureAccess();
  const orgAccessLevel = useOrgAccessLevel();
  // Simplified: No UI permissions check needed
  const { whoami } = useServerAuth();

  // DEBUG: Log isOrganizationAdmin value
  React.useEffect(() => {
    if (!permissionsLoading) {
      console.log('🔍 [AppSidebar] DEBUG Permissions:', {
        isSuperAdmin,
        isOrganizationAdmin,
        roles,
        user: user?.email,
        shouldShowUserManagement: !isSuperAdmin && isOrganizationAdmin
      });
    }
  }, [isSuperAdmin, isOrganizationAdmin, permissionsLoading, user?.email]);

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

  // Add admin items based on role
  if (isSuperAdmin) {
    console.log('🎯 [AppSidebar] Adding System Control (SUPER_ADMIN)');
    controlCenterItems.push({
      title: "System Control",
      url: "/admin",
      icon: Shield,
    });
  } else if (isOrganizationAdmin) {
    console.log('🎯 [AppSidebar] Adding User Management (ORG_ADMIN)');
    controlCenterItems.push({
      title: "User Management",
      url: "/admin/users",
      icon: Users,
    });
  } else {
    console.log('⚠️ [AppSidebar] NOT adding admin items - isSuperAdmin:', isSuperAdmin, 'isOrganizationAdmin:', isOrganizationAdmin);
  }

  // Coordinate loading states to prevent race condition UI flicker
const allPermissionsLoaded = !permissionsLoading && !featuresLoading && !orgLoading;
  const role =
    (roles[0]?.toUpperCase().replace('ORG_', 'ORGANIZATION_') as Role) || 'VIEWER';
  const routes = getAllowedRoutes({ isDemoOrg, role, organizationId, orgAccessLevel, isSuperAdmin });

  // DEBUG: Log routes and filtering
  console.log('🛣️ [AppSidebar] Routes and Filtering:', {
    isDemoOrg,
    orgSlug: org?.slug,
    orgDemoMode: org?.settings?.demo_mode,
    role,
    routesCount: routes.length,
    hasAdminUsersRoute: routes.includes('/admin/users'),
    controlCenterItemsBeforeFilter: controlCenterItems.map(i => i.url),
    sampleRoutes: routes.slice(0, 5)
  });
  const isIgor = isSuperAdmin && user?.email === 'igor@yodelmobile.com';
  const accountItems = isIgor ? userItems : userItems.filter(item => item.title !== 'Preferences');

  const filterOptions = { isDemoOrg, isSuperAdmin, routes, hasFeature };

  // Apply route filtering to all navigation sections
  const filteredAnalyticsItemsBase = filterNavigationByRoutes(analyticsItems, filterOptions);
  const filteredAiToolsItemsBase = filterNavigationByRoutes(aiToolsItems, filterOptions);
  const filteredAiCopilotsItemsBase = filterNavigationByRoutes(aiCopilotsItems, filterOptions);
  const filteredControlCenterItemsBase = filterNavigationByRoutes(controlCenterItems, filterOptions);

  // Marketing Preview entry should appear at the very top when preview is enabled or in demo mode
  const showPreviewEntry = ((import.meta as any).env?.VITE_PREVIEW_PAGE_ENABLED === 'true')
    || ((import.meta as any).env?.VITE_DEMO_DEBUG === 'true')
    || isDemoOrg;
  const previewNavItem: NavigationItem = {
    title: 'Preview',
    url: '/preview',
    icon: Star,
  };

  const NAV_FLAG = (import.meta as any).env?.VITE_NAV_PERMISSIONS_ENABLED === 'true';
  const applyPermFilter = (items: NavigationItem[]) => {
    // Simplified: no nav permission filtering for now
    return items;
  };

  const filteredAnalyticsItems = applyPermFilter(filteredAnalyticsItemsBase);

  // Demo Sections (server-truth gated)
  const demoItems: NavigationItem[] = [
    { title: 'Creative Review (Demo)', url: ROUTES.demoCreativeReview, icon: Palette },
    { title: 'Keyword Insights (Demo)', url: ROUTES.demoKeywordInsights, icon: Search },
  ];
  let filteredDemoItems = applyPermFilter(demoItems);
  const isDemo = !!whoami?.is_demo;
  const feat = new Set((whoami?.features || []) as string[]);
  filteredDemoItems = filteredDemoItems.filter(item => {
    if (!isDemo) return false;
    if (item.url === ROUTES.demoCreativeReview) return feat.has('creative_review_demo');
    if (item.url === ROUTES.demoKeywordInsights) return feat.has('keyword_insights_demo');
    return false;
  });
  let filteredAiToolsItems = applyPermFilter(filteredAiToolsItemsBase);
  
  // Apply feature-based access control with defensive super_admin handling
  if (filteredAiToolsItems?.length) {
    const currentUserRole: UserRole = isSuperAdmin ? 'super_admin' : 
      (isOrganizationAdmin ? 'org_admin' : 
      (role?.toLowerCase().includes('aso') ? 'aso_manager' :
      (role?.toLowerCase().includes('analyst') ? 'analyst' : 'viewer')));
    
    filteredAiToolsItems = filteredAiToolsItems.filter(item => {
      if (item.url === '/aso-ai-hub') {
        return featureEnabledForRole(PLATFORM_FEATURES.ASO_AI_HUB, currentUserRole);
      }
      if (item.url === '/chatgpt-visibility-audit') {
        return featureEnabledForRole(PLATFORM_FEATURES.CHATGPT_VISIBILITY_AUDIT, currentUserRole);
      }
      return true;
    });
  }

  let filteredAiCopilotsItems = applyPermFilter(filteredAiCopilotsItemsBase);

  // REMOVED: Redundant role-based filtering
  // Feature access is already checked by filterNavigationByRoutes() via hasFeature()
  // which properly respects org-level feature flags from organization_features table.
  // The previous featureEnabledForRole() check was bypassing org-level feature flags.
  
  const filteredControlCenterItems = applyPermFilter(filteredControlCenterItemsBase);

  // Log sidebar state once when permissions are loaded
  logger.once(
    'sidebar-loaded-' + user?.id,
    `[Sidebar] Loaded: org=${truncateOrgId(organizationId)}, role=${role}, routes=${routes.length}, items=Analytics:${filteredAnalyticsItems.length} AI:${filteredAiToolsItems.length + filteredAiCopilotsItems.length} Control:${filteredControlCenterItems.length}`
  );

  const showDevelopmentNotification = (item: NavigationItem) => {
    toast.info(
      `${item.title} is currently under development. Check back soon for powerful ASO insights and analytics!`,
      {
        duration: 4000,
        icon: "🚧",
      }
    );
  };

  const renderNavItem = (item: NavigationItem, isChild: boolean = false) => {
    const isActive = location.pathname === item.url;
    const hasActiveChild = item.children?.some(child => location.pathname === child.url);
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
        <item.icon className={`${isChild ? 'h-3 w-3' : 'h-4 w-4'} shrink-0 group-hover:scale-110 transition-transform duration-200`} />
        <span className="truncate font-medium">{item.title}</span>
        {statusTag()}
      </>
    );

    return (
      <React.Fragment key={item.title}>
        <SidebarMenuItem>
          <SidebarMenuButton
            asChild
            isActive={isActive || hasActiveChild}
            tooltip={item.title}
            className={`${isChild ? 'h-9 pl-8' : 'h-11'} text-nav-text-secondary data-[active=true]:bg-gradient-to-r data-[active=true]:from-yodel-orange data-[active=true]:to-orange-600 data-[active=true]:text-nav-text data-[active=true]:shadow-lg transition-all duration-200 ease-in-out group ${
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
        {item.children && item.children.map(child => renderNavItem(child, true))}
      </React.Fragment>
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
        {/* Preview (Marketing) - top placement above Performance Intelligence */}
        {showPreviewEntry && (
          <SidebarGroup>
            <SidebarGroupLabel className="mb-2 border-b border-footer-border/50 px-2 pb-2 text-xs font-semibold uppercase tracking-wide text-nav-text-secondary">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-gradient-to-r from-teal-400 to-cyan-400 rounded-full"></div>
                Preview
              </div>
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {renderNavItem(previewNavItem)}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
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
                {filteredAnalyticsItems.map(item => renderNavItem(item)).filter(Boolean)}
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
                {filteredAiToolsItems.map(item => renderNavItem(item)).filter(Boolean)}
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
                {filteredAiCopilotsItems.map(item => renderNavItem(item)).filter(Boolean)}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {filteredDemoItems.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel className="mb-2 border-b border-footer-border/50 px-2 pb-2 text-xs font-semibold uppercase tracking-wide text-nav-text-secondary">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full"></div>
                Demo Sections
              </div>
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {filteredDemoItems.map(item => renderNavItem(item)).filter(Boolean)}
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
                {filteredControlCenterItems.map(item => renderNavItem(item)).filter(Boolean)}
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
              {accountItems.map(item => renderNavItem(item))}
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
