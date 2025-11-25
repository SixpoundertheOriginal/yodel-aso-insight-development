
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
import { ServerAuthProvider } from "./context/ServerAuthContext";
import { WorkflowProvider } from "./context/WorkflowContext";
import { BigQueryAppProvider } from "./context/BigQueryAppContext";
import { SuperAdminProvider } from "./context/SuperAdminContext";
import { BrandedLoadingSpinner } from "@/components/ui/LoadingSkeleton";
import ProtectedRoute from "@/components/Auth/ProtectedRoute";
import SuperAdminGuard from "@/components/Auth/SuperAdminGuard";
import { SessionSecurityProvider } from "@/components/Auth/SessionSecurityProvider";
import { ReviewAnalysisProviderWrapper } from "./contexts/ReviewAnalysisProviderWrapper";
import Overview from "./pages/overview";
import Index from "./pages/Index";

// === STATIC IMPORTS (Critical Routes) ===
// Core dashboard pages imported statically to avoid chunk load failures
import Dashboard from "./pages/dashboard";
import TrafficSources from "./pages/traffic-sources";
import ConversionAnalysis from "./pages/conversion-analysis";
import InsightsPage from "./pages/insights";

// === LAZY IMPORTS (Secondary Routes) ===
const TrafficPerformanceMatrix = lazy(() => import("./pages/TrafficPerformanceMatrix"));
const ReportingDashboardV2 = lazy(() => import("./pages/ReportingDashboardV2"));

const AsoAiHub = lazy(() => import("./pages/aso-ai-hub"));
const ChatGPTVisibilityAudit = lazy(() => import("./pages/chatgpt-visibility-audit"));

const FeaturingToolkit = lazy(() => import("./pages/featuring-toolkit"));
const MetadataCopilot = lazy(() => import("./pages/metadata-copilot"));
const GrowthGapCopilot = lazy(() => import("./pages/growth-gap-copilot"));
const CreativeAnalysis = lazy(() => import("./pages/creative-analysis"));
const CreativeIntelligence = lazy(() =>
  import("./modules/creative-intelligence/pages/CreativeIntelligencePage")
    .then(module => ({ default: module.CreativeIntelligencePage }))
);
const AsoKnowledgeEngine = lazy(() => import("./pages/aso-knowledge-engine"));
const ASOUnified = lazy(() => import("./pages/aso-unified"));
const Apps = lazy(() => import("./pages/apps"));
const AppDiscovery = lazy(() => import("./pages/app-discovery"));
const Profile = lazy(() => import("./pages/profile"));
const Settings = lazy(() => import("./pages/settings"));
const DemoCreativeReview = lazy(() => import("./pages/demo-creative-review"));
const DemoKeywordInsights = lazy(() => import("./pages/demo-keyword-insights"));
const ReviewManagement = lazy(() => import("./pages/growth-accelerators/reviews"));
const AppReviewDetailsPage = lazy(() => import("./pages/growth-accelerators/AppReviewDetailsPage"));
const KeywordIntelligencePage = lazy(() => import("./pages/growth-accelerators/keywords"));
const CompetitorOverviewPage = lazy(() => import("./pages/growth-accelerators/competitor-overview"));
import DemoGrowthAcceleratorsLayout from '@/layouts/DemoGrowthAcceleratorsLayout';
import { ROUTES } from '@/constants/routes';
const Admin = lazy(() => import("./pages/admin"));
const AdminPlaceholder = lazy(() => import("./pages/admin/placeholder"));
const AdminOrganizations = lazy(() => import("./pages/admin/organizations"));
const AdminUsers = lazy(() => import("./pages/admin/users"));
const FeatureManagement = lazy(() => import("./pages/admin/FeatureManagement"));
const FeatureTestingLab = lazy(() => import("./pages/admin/FeatureTestingLab"));
const SecurityMonitoring = lazy(() => import("./pages/SecurityMonitoring"));
const RuleSetListPage = lazy(() => import("./pages/admin/aso-bible/RuleSetListPage"));
const RuleSetEditorPage = lazy(() => import("./pages/admin/aso-bible/RuleSetEditorPage"));
const KpiRegistryPage = lazy(() => import("./pages/admin/aso-bible/KpiRegistryPage"));
const FormulaRegistryPage = lazy(() => import("./pages/admin/aso-bible/FormulaRegistryPage"));
const RuleRegistryPage = lazy(() => import("./pages/admin/aso-bible/RuleRegistryPage"));
const IntentRegistryPage = lazy(() => import("./pages/admin/aso-bible/IntentRegistryPage"));
const LLMRulesPage = lazy(() => import("./pages/admin/aso-bible/LLMRulesPage"));

// Phase 19: Monitoring & Audit History Pages
const MonitoredAppsPage = lazy(() => import("./pages/aso-ai-hub/MonitoredAppsPage"));
const AuditHistoryView = lazy(() => import("./pages/aso-ai-hub/AuditHistoryView"));

const SignIn = lazy(() => import("./pages/auth/sign-in"));
const SignUp = lazy(() => import("./pages/auth/sign-up"));
const ConfirmEmail = lazy(() => import("./pages/auth/confirm-email"));
const CompleteSignup = lazy(() => import("./pages/auth/complete-signup"));
const UpdatePassword = lazy(() => import("./pages/auth/update-password"));
const SmokeTest = lazy(() => import("./pages/smoke-test"));
const NotFound = lazy(() => import("./pages/NotFound"));
const PreviewPage = lazy(() => import("./pages/preview"));
const NoAccess = lazy(() => import("./pages/no-access"));
const WebRankAppsPage = lazy(() => import("./pages/growth/WebRankAppsPage.simple"));

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <SessionSecurityProvider>
              <SuperAdminProvider>
                <BigQueryAppProvider>
                  <AsoDataProvider>
                  <AppProvider>
                    <ServerAuthProvider>
                      <ReviewAnalysisProviderWrapper>
                        <AsoAiHubProvider>
                          <WorkflowProvider>
                        <Suspense fallback={<BrandedLoadingSpinner />}>
                        <Routes>
                          <Route path="/auth/sign-in" element={<SignIn />} />
                          <Route path="/auth/sign-up" element={<SignUp />} />
                          <Route path="/auth/confirm-email" element={<ConfirmEmail />} />
                          <Route path="/auth/complete-signup" element={<CompleteSignup />} />
                          <Route path="/auth/update-password" element={<UpdatePassword />} />
                          <Route path="/no-access" element={<NoAccess />} />
                          <Route path="/" element={<Index />} />
                          <Route
                            path="/dashboard"
                            element={<ProtectedRoute><Dashboard /></ProtectedRoute>}
                          />
                          <Route
                            path="/dashboard-v2"
                            element={<ProtectedRoute><ReportingDashboardV2 /></ProtectedRoute>}
                          />
                          <Route
                            path="/dashboard/executive"
                            element={<ProtectedRoute><Overview /></ProtectedRoute>}
                          />
                          <Route
                            path="/dashboard/analytics"
                            element={<ProtectedRoute><Dashboard /></ProtectedRoute>}
                          />
                          <Route
                            path="/dashboard/conversion-rate"
                            element={<ProtectedRoute><ConversionAnalysis /></ProtectedRoute>}
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

                          {/* ASO AI Hub Routes */}
                          <Route path="/aso-ai-hub">
                            {/* Redirect base path to audit mode */}
                            <Route index element={<Navigate to="/aso-ai-hub/audit" replace />} />

                            {/* Live/ad-hoc auditing mode */}
                            <Route
                              path="audit"
                              element={<ProtectedRoute><AsoAiHub mode="live" /></ProtectedRoute>}
                            />

                            {/* Phase 19: Monitored Apps List */}
                            <Route
                              path="monitored"
                              element={<ProtectedRoute><MonitoredAppsPage /></ProtectedRoute>}
                            />

                            {/* Phase 19: Audit History View */}
                            <Route
                              path="monitored/:monitoredAppId/history"
                              element={<ProtectedRoute><AuditHistoryView /></ProtectedRoute>}
                            />

                            {/* Monitored app audit mode (cached data) */}
                            <Route
                              path="monitored/:monitoredAppId"
                              element={<ProtectedRoute><AsoAiHub mode="monitored" /></ProtectedRoute>}
                            />
                          </Route>
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
                            path="/creative-intelligence"
                            element={<ProtectedRoute><CreativeIntelligence /></ProtectedRoute>}
                          />
                          <Route
                            path="/aso-knowledge-engine"
                            element={<ProtectedRoute><AsoKnowledgeEngine /></ProtectedRoute>}
                          />
                          <Route
                            path="/growth/web-rank-apps"
                            element={<ProtectedRoute><WebRankAppsPage /></ProtectedRoute>}
                          />
                          <Route
                            path="/growth-accelerators/reviews"
                            element={<ProtectedRoute><DemoGrowthAcceleratorsLayout><ReviewManagement /></DemoGrowthAcceleratorsLayout></ProtectedRoute>}
                          />
                          <Route
                            path="/growth-accelerators/reviews/:appId"
                            element={<ProtectedRoute><DemoGrowthAcceleratorsLayout><AppReviewDetailsPage /></DemoGrowthAcceleratorsLayout></ProtectedRoute>}
                          />
                          <Route
                            path="/growth-accelerators/keywords"
                            element={<ProtectedRoute><DemoGrowthAcceleratorsLayout><KeywordIntelligencePage /></DemoGrowthAcceleratorsLayout></ProtectedRoute>}
                          />
                          <Route
                            path="/growth-accelerators/competitor-overview"
                            element={<ProtectedRoute><DemoGrowthAcceleratorsLayout><CompetitorOverviewPage /></DemoGrowthAcceleratorsLayout></ProtectedRoute>}
                          />
                          <Route
                            path="/aso-unified"
                            element={<ProtectedRoute><ASOUnified /></ProtectedRoute>}
                          />
                          <Route path={ROUTES.demoCreativeReview} element={<ProtectedRoute><DemoCreativeReview /></ProtectedRoute>} />
                          <Route path={ROUTES.demoKeywordInsights} element={<ProtectedRoute><DemoKeywordInsights /></ProtectedRoute>} />
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
                            element={<ProtectedRoute><SuperAdminGuard><Settings /></SuperAdminGuard></ProtectedRoute>}
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
                            path="/admin/features"
                            element={<ProtectedRoute><SuperAdminGuard><FeatureManagement /></SuperAdminGuard></ProtectedRoute>}
                          />
                          <Route
                            path="/admin/testing-lab"
                            element={<ProtectedRoute><SuperAdminGuard><FeatureTestingLab /></SuperAdminGuard></ProtectedRoute>}
                          />
                          <Route
                            path="/admin/security"
                            element={<ProtectedRoute><SecurityMonitoring /></ProtectedRoute>}
                          />
                          <Route
                            path="/admin/aso-bible/rulesets"
                            element={<ProtectedRoute><RuleSetListPage /></ProtectedRoute>}
                          />
                          <Route
                            path="/admin/aso-bible/rulesets/:vertical"
                            element={<ProtectedRoute><RuleSetEditorPage /></ProtectedRoute>}
                          />
                          <Route
                            path="/admin/aso-bible/rulesets/:vertical/:market"
                            element={<ProtectedRoute><RuleSetEditorPage /></ProtectedRoute>}
                          />
                          <Route
                            path="/admin/aso-bible/rulesets/market/:market"
                            element={<ProtectedRoute><RuleSetEditorPage /></ProtectedRoute>}
                          />
                          <Route
                            path="/admin/aso-bible/kpi-registry"
                            element={<ProtectedRoute><KpiRegistryPage /></ProtectedRoute>}
                          />
                          <Route
                            path="/admin/aso-bible/formula-registry"
                            element={<ProtectedRoute><FormulaRegistryPage /></ProtectedRoute>}
                          />
                          <Route
                            path="/admin/aso-bible/rule-registry"
                            element={<ProtectedRoute><RuleRegistryPage /></ProtectedRoute>}
                          />
                          <Route
                            path="/admin/aso-bible/intent-registry"
                            element={<ProtectedRoute><IntentRegistryPage /></ProtectedRoute>}
                          />
                          <Route
                            path="/admin/aso-bible/llm-rules"
                            element={<ProtectedRoute><LLMRulesPage /></ProtectedRoute>}
                          />
                          <Route
                            path="/smoke-test"
                            element={<ProtectedRoute><SmokeTest /></ProtectedRoute>}
                          />
                          {/* Public marketing/preview route (feature-flagged) */}
                          <Route path="/preview" element={<PreviewPage />} />
                          <Route path="/404" element={<NotFound />} />
                          <Route path="*" element={<Navigate to="/404" replace />} />
                        </Routes>
                      </Suspense>
                          </WorkflowProvider>
                        </AsoAiHubProvider>
                      </ReviewAnalysisProviderWrapper>
                    </ServerAuthProvider>
                </AppProvider>
              </AsoDataProvider>
            </BigQueryAppProvider>
              </SuperAdminProvider>
            </SessionSecurityProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
