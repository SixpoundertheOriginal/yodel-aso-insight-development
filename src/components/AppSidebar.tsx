
import React from "react";
import { Link, useLocation } from "react-router-dom";
import { 
  BarChart3, 
  TrendingUp, 
  Target, 
  Bot, 
  Home,
  Search,
  Shield,
  User,
  Settings as SettingsIcon,
  Smartphone,
  Database,
  PieChart,
  Brain,
  FileEdit,
  Star,
  Zap,
  Palette
} from "lucide-react";
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

// Performance Intelligence - Pure data visualization from BigQuery
const analyticsItems = [
  {
    title: "Executive Dashboard",
    url: "/overview",
    icon: Home,
  },
  {
    title: "Analytics", 
    url: "/dashboard",
    icon: BarChart3,
  },
  {
    title: "Conversion Intelligence",
    url: "/conversion-analysis", 
    icon: Target,
  },
];

// AI Command Center - Main AI-powered tools
const aiToolsItems = [
  {
    title: "Strategic Audit Engine",
    url: "/aso-ai-hub",
    icon: Bot,
  },
  {
    title: "AI Visibility Optimizer",
    url: "/chatgpt-visibility-audit",
    icon: Brain,
  },
  {
    title: "Portfolio Manager",
    url: "/apps",
    icon: Smartphone,
  },
];

// Growth Accelerators - Dedicated copilot interfaces
const aiCopilotsItems = [
  {
    title: "Strategy Brain",
    url: "/aso-knowledge-engine",
    icon: Brain,
  },
  {
    title: "Metadata Optimizer",
    url: "/metadata-copilot",
    icon: FileEdit,
  },
  {
    title: "Opportunity Scanner",
    url: "/growth-gap-copilot",
    icon: TrendingUp,
  },
  {
    title: "Feature Maximizer",
    url: "/featuring-toolkit",
    icon: Star,
  },
  {
    title: "Creative Analysis",
    url: "/creative-analysis",
    icon: Palette,
  },
];

// User account items
const userItems = [
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
        <SidebarGroup>
          <SidebarGroupLabel className="mb-2 border-b border-footer-border/50 px-2 pb-2 text-xs font-semibold uppercase tracking-wide text-nav-text-secondary">
            <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-gradient-to-r from-yodel-blue to-blue-500"></div>
                Performance Intelligence
              </div>
            </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {analyticsItems.map((item) => {
                const isActive = location.pathname === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                     <SidebarMenuButton
                       asChild
                       isActive={isActive}
                       tooltip={item.title}
                       className="h-11 text-nav-text-secondary data-[active=true]:bg-gradient-to-r data-[active=true]:from-yodel-orange data-[active=true]:to-orange-600 data-[active=true]:text-nav-text data-[active=true]:shadow-lg hover:bg-zinc-800/70 hover:text-nav-text transition-all duration-200 ease-in-out group"
                     >
                       <Link to={item.url} className="flex items-center gap-3">
                         <item.icon className="h-4 w-4 shrink-0 group-hover:scale-110 transition-transform duration-200" />
                         <span className="truncate font-medium">{item.title}</span>
                       </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* AI Command Center Section */}
        <SidebarGroup>
          <SidebarGroupLabel className="mb-2 border-b border-footer-border/50 px-2 pb-2 text-xs font-semibold uppercase tracking-wide text-nav-text-secondary">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-gradient-to-r from-yodel-orange to-orange-500 rounded-full"></div>
              AI Command Center
            </div>
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {aiToolsItems.map((item) => {
                const isActive = location.pathname === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                     <SidebarMenuButton
                       asChild
                       isActive={isActive}
                       tooltip={item.title}
                       className="h-11 text-nav-text-secondary data-[active=true]:bg-gradient-to-r data-[active=true]:from-yodel-orange data-[active=true]:to-orange-600 data-[active=true]:text-nav-text data-[active=true]:shadow-lg hover:bg-zinc-800/70 hover:text-nav-text transition-all duration-200 ease-in-out group"
                     >
                       <Link to={item.url} className="flex items-center gap-3">
                         <item.icon className="h-4 w-4 shrink-0 group-hover:scale-110 transition-transform duration-200" />
                         <span className="truncate font-medium">{item.title}</span>
                       </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Growth Accelerators Section */}
        <SidebarGroup>
          <SidebarGroupLabel className="mb-2 border-b border-footer-border/50 px-2 pb-2 text-xs font-semibold uppercase tracking-wide text-nav-text-secondary">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-gradient-to-r from-emerald-500 to-green-500 rounded-full"></div>
              Growth Accelerators
            </div>
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {aiCopilotsItems.map((item) => {
                const isActive = location.pathname === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                     <SidebarMenuButton
                       asChild
                       isActive={isActive}
                       tooltip={item.title}
                       className="h-11 text-nav-text-secondary data-[active=true]:bg-gradient-to-r data-[active=true]:from-yodel-orange data-[active=true]:to-orange-600 data-[active=true]:text-nav-text data-[active=true]:shadow-lg hover:bg-zinc-800/70 hover:text-nav-text transition-all duration-200 ease-in-out group"
                     >
                       <Link to={item.url} className="flex items-center gap-3">
                         <item.icon className="h-4 w-4 shrink-0 group-hover:scale-110 transition-transform duration-200" />
                         <span className="truncate font-medium">{item.title}</span>
                       </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Control Center Section - visible to org admins and super admins */}
        {(isSuperAdmin || isOrganizationAdmin) && (
          <SidebarGroup>
            <SidebarGroupLabel className="mb-2 border-b border-footer-border/50 px-2 pb-2 text-xs font-semibold uppercase tracking-wide text-nav-text-secondary">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-gradient-to-r from-purple-500 to-violet-500 rounded-full"></div>
                Control Center
              </div>
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                   <SidebarMenuButton
                     asChild
                     isActive={location.pathname === '/app-discovery'}
                     tooltip="App Intelligence"
                     className="h-11 text-nav-text-secondary data-[active=true]:bg-gradient-to-r data-[active=true]:from-yodel-orange data-[active=true]:to-orange-600 data-[active=true]:text-nav-text data-[active=true]:shadow-lg hover:bg-zinc-800/70 hover:text-nav-text transition-all duration-200 ease-in-out group"
                   >
                     <Link to="/app-discovery" className="flex items-center gap-3">
                       <Database className="h-4 w-4 shrink-0 group-hover:scale-110 transition-transform duration-200" />
                       <span className="truncate font-medium">App Intelligence</span>
                     </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                
                {isSuperAdmin && (
                  <SidebarMenuItem>
                     <SidebarMenuButton
                       asChild
                       isActive={location.pathname === '/admin'}
                       tooltip="System Control"
                       className="h-11 text-nav-text-secondary data-[active=true]:bg-gradient-to-r data-[active=true]:from-yodel-orange data-[active=true]:to-orange-600 data-[active=true]:text-nav-text data-[active=true]:shadow-lg hover:bg-zinc-800/70 hover:text-nav-text transition-all duration-200 ease-in-out group"
                     >
                       <Link to="/admin" className="flex items-center gap-3">
                         <Shield className="h-4 w-4 shrink-0 group-hover:scale-110 transition-transform duration-200" />
                         <span className="truncate font-medium">System Control</span>
                       </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )}
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
              {userItems.map((item) => {
                const isActive = location.pathname === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                     <SidebarMenuButton
                       asChild
                       isActive={isActive}
                       tooltip={item.title}
                       className="h-11 text-nav-text-secondary data-[active=true]:bg-gradient-to-r data-[active=true]:from-yodel-orange data-[active=true]:to-orange-600 data-[active=true]:text-nav-text data-[active=true]:shadow-lg hover:bg-zinc-800/70 hover:text-nav-text transition-all duration-200 ease-in-out group"
                     >
                       <Link to={item.url} className="flex items-center gap-3">
                         <item.icon className="h-4 w-4 shrink-0 group-hover:scale-110 transition-transform duration-200" />
                         <span className="truncate font-medium">{item.title}</span>
                       </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-footer-border/50 bg-gradient-to-r from-zinc-900/50 to-zinc-800/30 p-4">
        <div className="text-xs font-medium text-nav-text-secondary group-data-[collapsible=icon]:hidden">
          © 2025 Yodel Mobile by NP Digital
        </div>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
