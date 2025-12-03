
import React from "react";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import TopBar from "../components/TopBar";
import { GradientBackground, Container } from "@/components/ui/premium";
import { OrganizationBranding } from "@/components/OrganizationBranding";
import { SuperAdminDebugPanel } from "@/components/Debug/SuperAdminDebugPanel";
import { MFAGracePeriodBanner } from "@/components/Auth/MFAGracePeriodBanner";
import { useSessionHeartbeat } from "@/hooks/useSessionHeartbeat";

interface MainLayoutProps {
  children: React.ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  // Track session activity (heartbeat every 30 seconds)
  useSessionHeartbeat({ intervalMs: 30000 });

  return (
    <SidebarProvider defaultOpen={true}>
      <GradientBackground variant="yodel" intensity="subtle" className="flex min-h-screen w-full">
        <AppSidebar />
        <SidebarInset className="flex flex-col flex-1 min-w-0">
          <TopBar />
          <MFAGracePeriodBanner />
          <main className="flex-1 overflow-auto">
            <Container size="xl" padding="lg" className="py-6">
              {children}
            </Container>
          </main>
          <OrganizationBranding position="footer" />
        </SidebarInset>
        {/* Debug panel - only in dev or for super admins */}
        <SuperAdminDebugPanel />
      </GradientBackground>
    </SidebarProvider>
  );
};

export default MainLayout;
