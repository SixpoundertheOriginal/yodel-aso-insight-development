import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Search, Settings, Plus, List, BarChart, Brain } from 'lucide-react';

interface SidebarItem {
  title: string;
  url: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  description: string;
}

const sidebarItems: SidebarItem[] = [
  {
    title: "Dashboard",
    url: "/",
    icon: Home,
    description: "Overview of your apps and performance"
  },
  {
    title: "App Search",
    url: "/app-search",
    icon: Search,
    description: "Find new apps and analyze their metadata"
  },
  {
    title: "Keyword Intelligence",
    url: "/keyword-intelligence",
    icon: List,
    description: "Discover and track relevant keywords"
  },
  {
    title: "ASO AI Audit",
    url: "/aso-ai-hub",
    icon: BarChart,
    description: "AI-powered ASO analysis and recommendations"
  },
  {
    title: "ASO Intelligence",
    url: "/aso-intelligence",
    icon: Brain,
    description: "Advanced ASO analysis and optimization"
  },
  {
    title: "ASO Insights", 
    url: "/aso-insights",
    icon: Brain,
    description: "Unified ASO analysis and optimization"
  },
  {
    title: "Settings",
    url: "/settings",
    icon: Settings,
    description: "Manage your account and preferences"
  }
];

export const AppSidebar: React.FC = () => {
  const location = useLocation();

  return (
    <aside className="w-64 bg-zinc-900 border-r border-zinc-800 h-full py-8 px-4 flex flex-col">
      <div className="mb-8">
        <Link to="/" className="flex items-center space-x-2">
          <Plus className="w-6 h-6 text-yodel-orange" />
          <span className="text-lg font-bold text-white">Yodel Apps</span>
        </Link>
      </div>

      <nav className="flex-1 space-y-1">
        {sidebarItems.map((item) => (
          <Link
            key={item.title}
            to={item.url}
            className={`group flex items-center space-x-3 py-2 px-4 rounded-md transition-colors duration-200
              ${location.pathname === item.url
                ? 'bg-yodel-orange text-white'
                : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
              }`}
          >
            <item.icon className="w-5 h-5" />
            <span>{item.title}</span>
          </Link>
        ))}
      </nav>

      <div className="mt-8 text-center text-zinc-500">
        <p className="text-xs">
          &copy; {new Date().getFullYear()} Yodel Labs, Inc.
        </p>
      </div>
    </aside>
  );
};
