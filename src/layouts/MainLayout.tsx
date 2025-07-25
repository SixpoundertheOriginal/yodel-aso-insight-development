
import React from "react";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import TopBar from "../components/TopBar";
import { GradientBackground, Container } from "@/components/ui/premium";

interface MainLayoutProps {
  children: React.ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  return (
    <SidebarProvider defaultOpen={true}>
      <GradientBackground variant="yodel" intensity="subtle" className="flex min-h-screen w-full dark">
        <AppSidebar />
        <SidebarInset className="flex flex-col flex-1 min-w-0">
          <TopBar />
          <main className="flex-1 overflow-auto">
            <Container size="xl" padding="lg" className="py-6">
              {children}
            </Container>
          </main>
        </SidebarInset>
      </GradientBackground>
    </SidebarProvider>
  );
};

export default MainLayout;
