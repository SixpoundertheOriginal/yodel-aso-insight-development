---
Status: ACTIVE
Version: v1.0
Last Updated: 2025-01-20
Purpose: Local development environment setup and workflow
Audience: Developers
---

# Local Development Guide

Complete guide to local development workflow for Yodel ASO Insight.

## Table of Contents

1. [Development Server](#development-server)
2. [Hot Reload Configuration](#hot-reload-configuration)
3. [Database Connection](#database-connection)
4. [Environment Modes](#environment-modes)
5. [Debugging Setup](#debugging-setup)
6. [Code Quality Tools](#code-quality-tools)
7. [Common Workflows](#common-workflows)

## Development Server

### Start Development Server

```bash
npm run dev
```

**Default Configuration:**
- **URL:** http://localhost:5173
- **Hot reload:** Enabled (Vite HMR)
- **Source maps:** Enabled for debugging
- **Console logs:** Visible in browser DevTools

### Custom Port

If port 5173 is already in use:

```bash
npm run dev -- --port 3000
```

### Network Access

To access dev server from other devices on your network:

```bash
npm run dev -- --host
```

Then access via your local IP (shown in terminal output)

## Hot Reload Configuration

Hot Module Replacement (HMR) is configured in `vite.config.ts`:

```typescript
// File: vite.config.ts
export default defineConfig({
  server: {
    watch: {
      usePolling: true,  // For Docker/WSL environments
    },
    hmr: {
      overlay: true,     // Show errors as overlay on page
    },
  },
});
```

### How It Works

1. Edit a file (e.g., `src/components/AppSidebar.tsx`)
2. Save changes
3. Vite detects changes and updates browser **without full reload**
4. React component state is preserved when possible

### Troubleshooting Hot Reload

**Issue: Changes not reflecting in browser**
```bash
# 1. Clear browser cache (Cmd+Shift+R / Ctrl+Shift+F5)
# 2. Check console for errors
# 3. Restart dev server
npm run dev
```

**Issue: Slow reload performance**
- Check for very large files in `src/` (>500KB)
- Reduce number of open files in editor
- Close unused browser tabs
- Check system resources (RAM, CPU)

**Issue: Hot reload completely fails**
```bash
# 1. Delete node_modules and reinstall
rm -rf node_modules
npm install

# 2. Clear Vite cache
rm -rf node_modules/.vite

# 3. Restart dev server
npm run dev
```

## Database Connection

You have two options for database connectivity during development.

### Option 1: Remote Supabase (Recommended)

Use the hosted Supabase instance:

```bash
# .env
SUPABASE_URL=https://bkbcqocpjahewqjmlgvf.supabase.co
SUPABASE_ANON_KEY=[YOUR_ANON_KEY]
```

**Pros:**
- ✅ No local database setup needed
- ✅ Matches production environment
- ✅ Easy collaboration (shared database with team)
- ✅ Automatic backups
- ✅ Same RLS policies as production

**Cons:**
- ❌ Requires internet connection
- ❌ Shared database (changes affect team)
- ❌ Slightly higher latency than local

**When to use:**
- Default for most development
- When testing RLS policies
- When collaborating with team
- When testing production-like behavior

### Option 2: Local Supabase (Advanced)

Run Supabase locally using Docker:

```bash
# Prerequisites: Docker Desktop must be running

# 1. Start local Supabase
supabase start

# 2. Get local credentials
supabase status

# 3. Update .env with local credentials
SUPABASE_URL=http://localhost:54321
SUPABASE_ANON_KEY=[LOCAL_ANON_KEY from supabase status]
```

**Pros:**
- ✅ Offline development possible
- ✅ Isolated database (your changes don't affect team)
- ✅ Faster query performance (no network latency)
- ✅ Full control over database state

**Cons:**
- ❌ Requires Docker (2GB+ RAM usage)
- ❌ Initial setup time (5-10 minutes)
- ❌ Database state not shared with team
- ❌ Must manually sync schema changes

**When to use:**
- Testing database migrations
- Offline development
- Experimenting with schema changes
- Performance-critical work

### Switching Between Local and Remote

```bash
# Switch to local
supabase start
# Update .env with local credentials from `supabase status`

# Switch to remote
supabase stop
# Update .env with remote credentials from Supabase dashboard
```

**Important:** Restart dev server after changing database credentials!

## Environment Modes

### Development Mode (Default)

```bash
npm run dev
```

**Features:**
- Hot module replacement (HMR)
- Source maps enabled
- Console logs visible
- React DevTools enabled
- Unminified code
- Fast refresh

**Use for:** Normal development work

### Production Preview Mode

```bash
# 1. Build production bundle
npm run build

# 2. Preview production build
npm run preview
```

**Features:**
- Production build
- Minified code
- No source maps (unless explicitly enabled)
- Tree-shaking applied
- Code splitting optimized
- Lazy loading enabled

**Use for:**
- Testing production build locally
- Verifying bundle size
- Testing performance optimizations
- Final QA before deployment

### Checking Current Mode

```typescript
// In your code
if (import.meta.env.DEV) {
  console.log('Running in development mode');
}

if (import.meta.env.PROD) {
  console.log('Running in production mode');
}
```

## Debugging Setup

### VS Code Configuration

Create or update `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "chrome",
      "request": "launch",
      "name": "Debug Vite App in Chrome",
      "url": "http://localhost:5173",
      "webRoot": "${workspaceFolder}/src",
      "sourceMaps": true
    },
    {
      "type": "msedge",
      "request": "launch",
      "name": "Debug Vite App in Edge",
      "url": "http://localhost:5173",
      "webRoot": "${workspaceFolder}/src",
      "sourceMaps": true
    }
  ]
}
```

**Usage:**
1. Start dev server: `npm run dev`
2. In VS Code: Press F5 or go to Run → Start Debugging
3. Set breakpoints in your code
4. Browser opens and hits breakpoints

### Browser DevTools

**React DevTools:**
- Install: [Chrome Extension](https://chrome.google.com/webstore/detail/react-developer-tools/fmkadmapgofadopljbjfkapdkoienihi)
- Usage:
  - Inspect component tree
  - View props and state
  - Profile component renders
  - Track re-renders

**Network Tab:**
- Monitor API calls to Supabase
- Check BigQuery Edge Function calls (`/functions/v1/bigquery-aso-data`)
- Verify authentication headers (JWT tokens)
- Check request/response payloads

**Performance Tab:**
- Profile page load time
- Identify slow components
- Check for memory leaks
- Analyze bundle size

### Console Debugging

```typescript
// Basic debugging
console.log('User permissions:', permissions);
console.table(asoData);  // Pretty table format

// Grouped logs
console.group('Dashboard V2 Data Flow');
console.log('1. Fetching BigQuery data...');
console.log('2. Transforming data...');
console.log('3. Rendering charts...');
console.groupEnd();

// Conditional debugging
if (import.meta.env.DEV) {
  console.debug('Debug info:', data);
}

// Performance timing
console.time('BigQuery fetch');
await fetchBigQueryData();
console.timeEnd('BigQuery fetch');  // Logs elapsed time
```

### Debugging Supabase Edge Functions

```bash
# View Edge Function logs in terminal
supabase functions logs bigquery-aso-data --follow

# Or view in Supabase Dashboard:
# Project → Edge Functions → bigquery-aso-data → Logs
```

## Code Quality Tools

### ESLint (Linter)

```bash
# Run linter on all files
npm run lint

# Auto-fix fixable issues
npm run lint -- --fix

# Lint specific file
npx eslint src/components/AppSidebar.tsx
```

**Common Lint Errors:**
- Unused variables → Remove or prefix with `_`
- Missing return types → Add explicit return type
- Console logs in production → Remove or use `import.meta.env.DEV` guard

**Configure:** See `.eslintrc.json`

### TypeScript Type Checking

```bash
# Check types without building
npm run type-check

# OR use tsc directly
npx tsc --noEmit
```

**Common Type Errors:**
- `Property 'x' does not exist` → Check interface definitions
- `Type 'undefined' is not assignable` → Add null checks or optional chaining
- `Argument of type 'X' is not assignable to parameter of type 'Y'` → Check function signatures

### Formatting with Prettier

```bash
# Format all files (if Prettier configured)
npm run format

# Format specific file
npx prettier --write src/components/AppSidebar.tsx
```

**Tip:** Install Prettier VS Code extension for format-on-save

### Pre-commit Hooks

If Husky is configured, these checks run automatically before commits:

```bash
# Triggered on: git commit
- ESLint
- TypeScript type checking
- Prettier formatting
- Unit tests
```

## Common Workflows

### Creating a New Feature

```bash
# 1. Create feature branch
git checkout -b feature/new-dashboard-widget

# 2. Implement feature
# - Edit files in src/
# - Add tests in src/__tests__/

# 3. Test locally
npm run dev
npm test

# 4. Lint and type-check
npm run lint
npm run type-check

# 5. Commit changes
git add .
git commit -m "feat: Add new dashboard widget"

# 6. Push and create PR
git push origin feature/new-dashboard-widget
```

See [DEVELOPMENT_GUIDE.md](../../DEVELOPMENT_GUIDE.md) for detailed workflow.

### Debugging BigQuery Issues

```bash
# 1. Check Edge Function logs
supabase functions logs bigquery-aso-data

# 2. Verify BigQuery credentials in .env
echo $BIGQUERY_PROJECT_ID  # Should be: yodel-mobile-app

# 3. Test query directly in BigQuery console
# Go to: https://console.cloud.google.com/bigquery
# Run: SELECT * FROM `yodel-mobile-app.aso_reports.aso_all_apple` LIMIT 10

# 4. Check org_app_access RLS policy
# Go to Supabase → Database → Policies → org_app_access
```

**Common Issues:**
- "No data returned" → Check organization context (Super Admin must select org)
- "Invalid credentials" → Verify `BIGQUERY_CREDENTIALS` in Edge Function secrets
- "Forbidden" → Check RLS policies on `org_app_access` table

See [BIGQUERY_QUICK_REFERENCE.md](../03-features/dashboard-v2/BIGQUERY_QUICK_REFERENCE.md) for more troubleshooting.

### Running Tests Locally

```bash
# Run all tests
npm test

# Run tests in watch mode (re-runs on file changes)
npm test -- --watch

# Run specific test file
npm test -- src/components/AppSidebar.test.tsx

# Run tests with coverage report
npm test -- --coverage
```

**Tip:** Keep tests running in watch mode while developing

### Fixing TypeScript Errors

```typescript
// Error: Property 'username' does not exist on type 'User'
// Fix: Check interface definition and update
interface User {
  id: string;
  email: string;
  username?: string;  // Add missing property
}

// Error: Object is possibly 'undefined'
// Fix: Add null check or optional chaining
const name = user?.profile?.name ?? 'Anonymous';

// Error: Argument of type 'string | undefined' is not assignable
// Fix: Add type guard
if (userId !== undefined) {
  fetchUser(userId);  // Now TypeScript knows userId is string
}
```

## Next Steps

Now that you're set up for local development:

1. **Understand the architecture** → [ARCHITECTURE_V1.md](../02-architecture/ARCHITECTURE_V1.md)
2. **Learn the development workflow** → [DEVELOPMENT_GUIDE.md](../../DEVELOPMENT_GUIDE.md)
3. **Explore feature documentation** → [docs/03-features/](../03-features/)
4. **Read API reference** → [docs/04-api-reference/](../04-api-reference/)

## Troubleshooting

For comprehensive troubleshooting, see:
- [TROUBLESHOOTING.md](../../TROUBLESHOOTING.md)
- [Installation Guide](./installation.md#troubleshooting)

For BigQuery-specific issues:
- [BIGQUERY_QUICK_REFERENCE.md](../03-features/dashboard-v2/BIGQUERY_QUICK_REFERENCE.md)
- [DATA_PIPELINE_AUDIT.md](../03-features/dashboard-v2/DATA_PIPELINE_AUDIT.md)

---

**Estimated Time:** 15 minutes to set up
**Next:** Explore [Development Guide](../../DEVELOPMENT_GUIDE.md) →
