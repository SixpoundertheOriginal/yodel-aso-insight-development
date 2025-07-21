import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { AppProvider } from './context/AppContext';
import { AsoDataProvider } from './context/AsoDataContext';
import Dashboard from './pages/dashboard';
import Apps from './pages/apps';
import Settings from './pages/settings';
import AppDetailsPage from './pages/app-details';
import AsoIntelligencePage from './pages/aso-intelligence';
import KeywordIntelligencePage from './pages/keyword-intelligence';
import CppIntelligencePage from './pages/cpp-intelligence';
import AsoAiHubPage from './pages/aso-ai-hub';
import { QueryClient } from '@tanstack/react-query';
import AsoInsightsPage from "@/pages/aso-insights";

function App() {
  return (
    <QueryClient>
      <AuthProvider>
        <AsoDataProvider>
          <AppProvider>
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/apps" element={<Apps />} />
                <Route path="/apps/:appId" element={<AppDetailsPage />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/aso-intelligence" element={<AsoIntelligencePage />} />
                <Route path="/keyword-intelligence" element={<KeywordIntelligencePage />} />
                <Route path="/cpp-intelligence" element={<CppIntelligencePage />} />
                <Route path="/aso-ai-hub" element={<AsoAiHubPage />} />
                <Route path="/aso-insights" element={<AsoInsightsPage />} />
              </Routes>
            </BrowserRouter>
          </AppProvider>
        </AsoDataProvider>
      </AuthProvider>
    </QueryClient>
  );
}

export default App;
