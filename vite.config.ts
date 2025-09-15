import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "0.0.0.0",
    port: 8080,
    proxy: {
      // Map admin API calls to Supabase Edge Functions
      '/api/health': {
        target: 'https://bkbcqocpjahewqjmlgvf.supabase.co/functions/v1/admin-health',
        changeOrigin: true,
        rewrite: (path) => path.replace('/api/health', ''),
      },
      '/api/whoami': {
        target: 'https://bkbcqocpjahewqjmlgvf.supabase.co/functions/v1/admin-whoami',
        changeOrigin: true,
        rewrite: (path) => path.replace('/api/whoami', ''),
      },
      '/api/admin/organizations': {
        target: 'https://bkbcqocpjahewqjmlgvf.supabase.co/functions/v1/admin-organizations',
        changeOrigin: true,
        rewrite: (path) => path.replace('/api/admin/organizations', ''),
      },
      '/api/admin/dashboard-metrics': {
        target: 'https://bkbcqocpjahewqjmlgvf.supabase.co/functions/v1/admin-dashboard-metrics',
        changeOrigin: true,
        rewrite: (path) => path.replace('/api/admin/dashboard-metrics', ''),
      },
      '/api/admin/recent-activity': {
        target: 'https://bkbcqocpjahewqjmlgvf.supabase.co/functions/v1/admin-recent-activity',
        changeOrigin: true,
        rewrite: (path) => path.replace('/api/admin/recent-activity', ''),
      },
      '/api/admin/users/invite': {
        target: 'https://bkbcqocpjahewqjmlgvf.supabase.co/functions/v1/admin-users-invite',
        changeOrigin: true,
        rewrite: (path) => path.replace('/api/admin/users/invite', ''),
      },
      '/api/admin/users': {
        target: 'https://bkbcqocpjahewqjmlgvf.supabase.co/functions/v1/admin-users',
        changeOrigin: true,
        rewrite: (path) => path.replace('/api/admin/users', ''),
      },
    },
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
