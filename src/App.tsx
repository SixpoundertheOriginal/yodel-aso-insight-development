import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext';
import { AppProvider } from './context/AppContext';
import { AsoDataProvider } from './context/AsoDataContext';
import { BigQueryAppProvider } from './context/BigQueryAppContext';
import Dashboard from './pages/dashboard';
import Apps from './pages/apps';
import Settings from './pages/settings';
import AsoIntelligencePage from './pages/aso-intelligence';
import KeywordIntelligencePage from './pages/keyword-intelligence';
import AsoAiHubPage from './pages/aso-ai-hub';
import AsoInsightsPage from "@/pages/aso-insights";

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <BigQueryAppProvider>
            <AsoDataProvider>
              <AppProvider>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/apps" element={<Apps />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/aso-intelligence" element={<AsoIntelligencePage />} />
                <Route path="/keyword-intelligence" element={<KeywordIntelligencePage />} />
                <Route path="/aso-ai-hub" element={<AsoAiHubPage />} />
                <Route path="/aso-insights" element={<AsoInsightsPage />} />
              </Routes>
              </AppProvider>
            </AsoDataProvider>
          </BigQueryAppProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
