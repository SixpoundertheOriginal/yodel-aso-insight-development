
import React, { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { AsoDataProvider } from "./context/AsoDataContext";
import { AppProvider } from "./context/AppContext";
import { AsoAiHubProvider } from "./context/AsoAiHubContext";
import { WorkflowProvider } from "./context/WorkflowContext";
import { BigQueryAppProvider } from "./context/BigQueryAppContext";

// Lazy load components
const Index = lazy(() => import("./pages/Index"));
const Dashboard = lazy(() => import("./pages/dashboard"));
const TrafficSources = lazy(() => import("./pages/traffic-sources"));
const ConversionAnalysis = lazy(() => import("./pages/conversion-analysis"));
const Overview = lazy(() => import("./pages/overview"));
const KeywordIntelligence = lazy(() => import("./pages/keyword-intelligence"));
const AsoAiHub = lazy(() => import("./pages/aso-ai-hub"));
const ChatGPTVisibilityAudit = lazy(() => import("./pages/chatgpt-visibility-audit"));
const AsoIntelligence = lazy(() => import("./pages/aso-intelligence"));
const FeaturingToolkit = lazy(() => import("./pages/featuring-toolkit"));
const MetadataCopilot = lazy(() => import("./pages/metadata-copilot"));
const GrowthGapCopilot = lazy(() => import("./pages/growth-gap-copilot"));
const CppStrategyCopilot = lazy(() => import("./pages/cpp-strategy-copilot"));
const AsoKnowledgeEngine = lazy(() => import("./pages/aso-knowledge-engine"));
const ASOUnified = lazy(() => import("./pages/aso-unified"));
const Apps = lazy(() => import("./pages/apps"));
const AppDiscovery = lazy(() => import("./pages/app-discovery"));
const Profile = lazy(() => import("./pages/profile"));
const Settings = lazy(() => import("./pages/settings"));
const Admin = lazy(() => import("./pages/admin"));
const SignIn = lazy(() => import("./pages/auth/sign-in"));
const SignUp = lazy(() => import("./pages/auth/sign-up"));
const SmokeTest = lazy(() => import("./pages/smoke-test"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <BigQueryAppProvider>
              <AsoDataProvider>
                <AppProvider>
                  <AsoAiHubProvider>
                    <WorkflowProvider>
                      <Suspense fallback={<div className="flex items-center justify-center min-h-screen bg-zinc-950 text-white">Loading...</div>}>
                        <Routes>
                          <Route path="/auth/sign-in" element={<SignIn />} />
                          <Route path="/auth/sign-up" element={<SignUp />} />
                          <Route path="/" element={<Index />} />
                          <Route path="/dashboard" element={<Dashboard />} />
                          <Route path="/traffic-sources" element={<TrafficSources />} />
                          <Route path="/conversion-analysis" element={<ConversionAnalysis />} />
                          <Route path="/overview" element={<Overview />} />
                          <Route path="/keyword-intelligence" element={<KeywordIntelligence />} />
                          <Route path="/aso-ai-hub" element={<AsoAiHub />} />
                          <Route path="/chatgpt-visibility-audit" element={<ChatGPTVisibilityAudit />} />
                          <Route path="/aso-intelligence" element={<AsoIntelligence />} />
                          <Route path="/featuring-toolkit" element={<FeaturingToolkit />} />
                          <Route path="/metadata-copilot" element={<MetadataCopilot />} />
                          <Route path="/growth-gap-copilot" element={<GrowthGapCopilot />} />
                          <Route path="/cpp-strategy-copilot" element={<CppStrategyCopilot />} />
                          <Route path="/aso-knowledge-engine" element={<AsoKnowledgeEngine />} />
                          <Route path="/aso-unified" element={<ASOUnified />} />
                          <Route path="/apps" element={<Apps />} />
                          <Route path="/app-discovery" element={<AppDiscovery />} />
                          <Route path="/profile" element={<Profile />} />
                          <Route path="/settings" element={<Settings />} />
                          <Route path="/admin" element={<Admin />} />
                          <Route path="/smoke-test" element={<SmokeTest />} />
                          <Route path="/404" element={<NotFound />} />
                          <Route path="*" element={<Navigate to="/404" replace />} />
                        </Routes>
                      </Suspense>
                    </WorkflowProvider>
                  </AsoAiHubProvider>
                </AppProvider>
              </AsoDataProvider>
            </BigQueryAppProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
