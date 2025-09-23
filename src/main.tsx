
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Initialize reviews system protection in development
if (process.env.NODE_ENV === 'development') {
  import('./utils/legacyWarnings').then(({ initializeReviewsSystemProtection }) => {
    initializeReviewsSystemProtection();
  });
}

const container = document.getElementById("root");
if (!container) {
  throw new Error("Root element not found");
}

const root = createRoot(container);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
