
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
  type LucideIcon,
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

interface NavigationItem {
  title: string;
  url: string;
  icon: LucideIcon;
  status?: "active" | "coming_soon" | "under_development" | "beta";
  statusLabel?: string;
  featureKey?: string;
}

// Performance Intelligence - Pure data visualization from BigQuery
const analyticsItems: NavigationItem[] = [
  {
    title: "Executive Dashboard",
    url: "/overview",
    icon: Home,
    featureKey: PLATFORM_FEATURES.EXECUTIVE_DASHBOARD,
  },
  {
    title: "Analytics",
    url: "/dashboard",
    icon: BarChart3,
    featureKey: PLATFORM_FEATURES.ANALYTICS,
  },
  {
    title: "Conversion Intelligence",
    url: "/conversion-analysis",
    icon: Target,
    featureKey: PLATFORM_FEATURES.CONVERSION_INTELLIGENCE,
  },
  {
    title: "Insights",
    url: "/insights",
    icon: Brain,
    status: "coming_soon",
    statusLabel: "Coming Soon",
    featureKey: PLATFORM_FEATURES.PERFORMANCE_INTELLIGENCE,
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
  const { isSuperAdmin, isOrganizationAdmin } = usePermissions();
  const { hasFeature } = useFeatureAccess();
  const { canAccessAdminFeatures } = useUIPermissions();

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
    const hasAccess = !item.featureKey || hasFeature(item.featureKey);
    
    // Don't render the item if the organization doesn't have access to this feature
    if (!hasAccess) {
      return null;
    }

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
        {analyticsItems.some(item => !item.featureKey || hasFeature(item.featureKey)) && (
          <SidebarGroup>
            <SidebarGroupLabel className="mb-2 border-b border-footer-border/50 px-2 pb-2 text-xs font-semibold uppercase tracking-wide text-nav-text-secondary">
              <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-gradient-to-r from-yodel-blue to-blue-500"></div>
                  Performance Intelligence
                </div>
              </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {analyticsItems.map(renderNavItem).filter(Boolean)}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* AI Command Center Section */}
        {aiToolsItems.some(item => !item.featureKey || hasFeature(item.featureKey)) && (
          <SidebarGroup>
            <SidebarGroupLabel className="mb-2 border-b border-footer-border/50 px-2 pb-2 text-xs font-semibold uppercase tracking-wide text-nav-text-secondary">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-gradient-to-r from-yodel-orange to-orange-500 rounded-full"></div>
                AI Command Center
              </div>
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {aiToolsItems.map(renderNavItem).filter(Boolean)}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Growth Accelerators Section */}
        {aiCopilotsItems.some(item => !item.featureKey || hasFeature(item.featureKey)) && (
          <SidebarGroup>
            <SidebarGroupLabel className="mb-2 border-b border-footer-border/50 px-2 pb-2 text-xs font-semibold uppercase tracking-wide text-nav-text-secondary">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-gradient-to-r from-emerald-500 to-green-500 rounded-full"></div>
                Growth Accelerators
              </div>
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {aiCopilotsItems.map(renderNavItem).filter(Boolean)}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Control Center Section - visible to org admins and super admins */}
        {(isSuperAdmin || isOrganizationAdmin) && controlCenterItems.some(item => !item.featureKey || hasFeature(item.featureKey)) && (
          <SidebarGroup>
            <SidebarGroupLabel className="mb-2 border-b border-footer-border/50 px-2 pb-2 text-xs font-semibold uppercase tracking-wide text-nav-text-secondary">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-gradient-to-r from-purple-500 to-violet-500 rounded-full"></div>
                Control Center
              </div>
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {controlCenterItems.map(renderNavItem).filter(Boolean)}
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
              {userItems.map(renderNavItem)}
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
