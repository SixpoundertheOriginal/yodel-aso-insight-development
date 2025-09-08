
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
import { SuperAdminProvider } from "./context/SuperAdminContext";
import { BrandedLoadingSpinner } from "@/components/ui/LoadingSkeleton";
import ProtectedRoute from "@/components/Auth/ProtectedRoute";

// Lazy load components
const Index = lazy(() => import("./pages/Index"));
const Dashboard = lazy(() => import("./pages/dashboard"));
const TrafficSources = lazy(() => import("./pages/traffic-sources"));
const ConversionAnalysis = lazy(() => import("./pages/conversion-analysis"));
const Overview = lazy(() => import("./pages/overview"));
const InsightsPage = lazy(() => import("./pages/insights"));
const TrafficPerformanceMatrix = lazy(() => import("./pages/TrafficPerformanceMatrix"));

const AsoAiHub = lazy(() => import("./pages/aso-ai-hub"));
const ChatGPTVisibilityAudit = lazy(() => import("./pages/chatgpt-visibility-audit"));

const FeaturingToolkit = lazy(() => import("./pages/featuring-toolkit"));
const MetadataCopilot = lazy(() => import("./pages/metadata-copilot"));
const GrowthGapCopilot = lazy(() => import("./pages/growth-gap-copilot"));
const CreativeAnalysis = lazy(() => import("./pages/creative-analysis"));
const AsoKnowledgeEngine = lazy(() => import("./pages/aso-knowledge-engine"));
const ASOUnified = lazy(() => import("./pages/aso-unified"));
const Apps = lazy(() => import("./pages/apps"));
const AppDiscovery = lazy(() => import("./pages/app-discovery"));
const Profile = lazy(() => import("./pages/profile"));
const Settings = lazy(() => import("./pages/settings"));
const Admin = lazy(() => import("./pages/admin"));
const AdminPlaceholder = lazy(() => import("./pages/admin/placeholder"));
const AdminOrganizations = lazy(() => import("./pages/admin/organizations"));
const AdminUsers = lazy(() => import("./pages/admin/users"));
const SignIn = lazy(() => import("./pages/auth/sign-in"));
const SignUp = lazy(() => import("./pages/auth/sign-up"));
const ConfirmEmail = lazy(() => import("./pages/auth/confirm-email"));
const CompleteSignup = lazy(() => import("./pages/auth/complete-signup"));
const UpdatePassword = lazy(() => import("./pages/auth/update-password"));
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
            <SuperAdminProvider>
              <BigQueryAppProvider>
                <AsoDataProvider>
                <AppProvider>
                  <AsoAiHubProvider>
                    <WorkflowProvider>
                      <Suspense fallback={<BrandedLoadingSpinner />}>
                        <Routes>
                          <Route path="/auth/sign-in" element={<SignIn />} />
                          <Route path="/auth/sign-up" element={<SignUp />} />
                          <Route path="/auth/confirm-email" element={<ConfirmEmail />} />
                          <Route path="/auth/complete-signup" element={<CompleteSignup />} />
                          <Route path="/auth/update-password" element={<UpdatePassword />} />
                          <Route path="/" element={<Index />} />
                          <Route
                            path="/dashboard"
                            element={<ProtectedRoute><Dashboard /></ProtectedRoute>}
                          />
                          <Route
                            path="/traffic-sources"
                            element={<ProtectedRoute><TrafficSources /></ProtectedRoute>}
                          />
                          <Route
                            path="/insights"
                            element={<ProtectedRoute><InsightsPage /></ProtectedRoute>}
                          />
                          <Route
                            path="/insights/traffic-performance"
                            element={<ProtectedRoute><TrafficPerformanceMatrix /></ProtectedRoute>}
                          />
                          <Route
                            path="/conversion-analysis"
                            element={<ProtectedRoute><ConversionAnalysis /></ProtectedRoute>}
                          />
                          <Route
                            path="/overview"
                            element={<ProtectedRoute><Overview /></ProtectedRoute>}
                          />

                          <Route
                            path="/aso-ai-hub"
                            element={<ProtectedRoute><AsoAiHub /></ProtectedRoute>}
                          />
                          <Route
                            path="/chatgpt-visibility-audit"
                            element={<ProtectedRoute><ChatGPTVisibilityAudit /></ProtectedRoute>}
                          />

                          <Route
                            path="/featuring-toolkit"
                            element={<ProtectedRoute><FeaturingToolkit /></ProtectedRoute>}
                          />
                          <Route
                            path="/metadata-copilot"
                            element={<ProtectedRoute><MetadataCopilot /></ProtectedRoute>}
                          />
                          <Route
                            path="/growth-gap-copilot"
                            element={<ProtectedRoute><GrowthGapCopilot /></ProtectedRoute>}
                          />
                          <Route
                            path="/creative-analysis"
                            element={<ProtectedRoute><CreativeAnalysis /></ProtectedRoute>}
                          />
                          <Route
                            path="/aso-knowledge-engine"
                            element={<ProtectedRoute><AsoKnowledgeEngine /></ProtectedRoute>}
                          />
                          <Route
                            path="/aso-unified"
                            element={<ProtectedRoute><ASOUnified /></ProtectedRoute>}
                          />
                          <Route
                            path="/apps"
                            element={<ProtectedRoute><Apps /></ProtectedRoute>}
                          />
                          <Route
                            path="/app-discovery"
                            element={<ProtectedRoute><AppDiscovery /></ProtectedRoute>}
                          />
                          <Route
                            path="/profile"
                            element={<ProtectedRoute><Profile /></ProtectedRoute>}
                          />
                          <Route
                            path="/settings"
                            element={<ProtectedRoute><Settings /></ProtectedRoute>}
                          />
                          <Route
                            path="/admin"
                            element={<ProtectedRoute><Admin /></ProtectedRoute>}
                          />
                          <Route
                            path="/admin/placeholder"
                            element={<ProtectedRoute><AdminPlaceholder /></ProtectedRoute>}
                          />
                          <Route
                            path="/admin/organizations"
                            element={<ProtectedRoute><AdminOrganizations /></ProtectedRoute>}
                          />
                          <Route
                            path="/admin/users"
                            element={<ProtectedRoute><AdminUsers /></ProtectedRoute>}
                          />
                          <Route
                            path="/smoke-test"
                            element={<ProtectedRoute><SmokeTest /></ProtectedRoute>}
                          />
                          <Route path="/404" element={<NotFound />} />
                          <Route path="*" element={<Navigate to="/404" replace />} />
                        </Routes>
                      </Suspense>
                    </WorkflowProvider>
                  </AsoAiHubProvider>
                </AppProvider>
              </AsoDataProvider>
            </BigQueryAppProvider>
            </SuperAdminProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
