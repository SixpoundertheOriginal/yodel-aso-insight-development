
import React from "react";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import TopBar from "../components/TopBar";

interface MainLayoutProps {
  children: React.ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex min-h-screen w-full dark yodel-gradient-bg">
        <AppSidebar />
        <SidebarInset className="flex flex-col flex-1 min-w-0">
          <TopBar />
          <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 overflow-auto animate-fade-in">
            <div className="mx-auto max-w-7xl">
              {children}
            </div>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default MainLayout;
