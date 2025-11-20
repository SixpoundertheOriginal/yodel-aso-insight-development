---
Status: ACTIVE
Version: v1.0
Last Updated: 2025-01-20
Purpose: Detailed installation instructions for all platforms
Audience: New Developers
---

# Installation Guide

Complete installation guide for Yodel ASO Insight development environment.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [System Requirements](#system-requirements)
3. [Install Node.js](#install-nodejs)
4. [Install Git](#install-git)
5. [Install Supabase CLI](#install-supabase-cli-optional)
6. [Clone Repository](#clone-repository)
7. [Install Dependencies](#install-dependencies)
8. [Environment Configuration](#environment-configuration)
9. [Verify Installation](#verify-installation)
10. [Troubleshooting](#troubleshooting)

## Prerequisites

### Required
- **Node.js 18+** (includes npm)
- **Git** for version control
- **Supabase Account** (free tier works fine)

### Recommended
- **VS Code** (recommended editor with ESLint/Prettier extensions)
- **Supabase CLI** (optional, for local database development)
- **Docker** (optional, required for local Supabase)

## System Requirements

| Requirement | Minimum | Recommended |
|-------------|---------|-------------|
| OS | macOS 10.15, Windows 10, Ubuntu 20.04 | Latest stable |
| RAM | 4 GB | 8 GB+ |
| Disk Space | 2 GB | 5 GB |
| Node.js | 18.0.0 | 20.x LTS |

## Install Node.js

### macOS

```bash
# Using Homebrew (recommended)
brew install node@20

# Verify installation
node --version  # Should show v20.x.x
npm --version   # Should show 10.x.x
```

**Alternative: Using nvm (Node Version Manager)**
```bash
# Install nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Restart terminal, then:
nvm install 20
nvm use 20
nvm alias default 20
```

### Windows

**Option 1: Direct Download**
1. Download from [nodejs.org](https://nodejs.org/)
2. Run installer (choose LTS version)
3. Verify in PowerShell:
   ```powershell
   node --version
   npm --version
   ```

**Option 2: Using nvm-windows**
```powershell
# Download nvm-windows from GitHub
# Then in PowerShell:
nvm install 20
nvm use 20

# Verify
node --version
npm --version
```

### Linux (Ubuntu/Debian)

```bash
# Using nvm (recommended)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Restart terminal, then:
nvm install 20
nvm use 20

# Verify
node --version
npm --version
```

**Alternative: Using apt (not recommended - often outdated)**
```bash
sudo apt update
sudo apt install nodejs npm
```

## Install Git

### macOS
```bash
# Using Homebrew
brew install git

# Verify
git --version
```

### Windows
1. Download from [git-scm.com](https://git-scm.com/download/win)
2. Run installer (use default settings)
3. Verify in PowerShell: `git --version`

### Linux
```bash
sudo apt update
sudo apt install git

# Verify
git --version
```

## Install Supabase CLI (Optional)

The Supabase CLI is optional for local database development.

### macOS
```bash
brew install supabase/tap/supabase

# Verify
supabase --version
```

### Windows
```powershell
# Using scoop
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase

# Verify
supabase --version
```

### Linux
```bash
brew install supabase/tap/supabase

# OR: Download binary
wget https://github.com/supabase/cli/releases/latest/download/supabase_linux_amd64.tar.gz
tar -xzf supabase_linux_amd64.tar.gz
sudo mv supabase /usr/local/bin/

# Verify
supabase --version
```

## Clone Repository

```bash
# Clone from GitHub
git clone https://github.com/SixpoundertheOriginal/yodel-aso-insight-development.git

# Navigate to project directory
cd yodel-aso-insight-development

# Verify repository
git status  # Should show "On branch main"
```

## Install Dependencies

```bash
# Install all npm dependencies
npm install
```

**This will install:**
- React 18.x
- Vite 5.x
- TypeScript 5.x
- Supabase client libraries
- Testing libraries (Vitest, React Testing Library)
- Development tools (ESLint, Prettier)

**Estimated time:** 2-4 minutes depending on internet speed

### Common Installation Issues

**Issue: Permission denied**
```bash
# DON'T use sudo npm install!
# Instead, fix npm permissions:
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
export PATH=~/.npm-global/bin:$PATH  # Add to ~/.bashrc or ~/.zshrc
```

**Issue: Network timeout**
```bash
# Use legacy peer deps flag
npm install --legacy-peer-deps
```

**Issue: Node version mismatch**
```bash
# Check required version in package.json
cat package.json | grep "node"

# Switch to correct version
nvm use 20
```

## Environment Configuration

### Step 1: Create .env File

```bash
# Copy example environment file
cp .env.example .env
```

### Step 2: Get Supabase Credentials

1. Go to [https://supabase.com](https://supabase.com)
2. Sign in or create account
3. Create new project (or use existing)
4. Go to **Project Settings** → **API**
5. Copy the following:
   - **Project URL** → This is your `SUPABASE_URL`
   - **Anon/Public Key** → This is your `SUPABASE_ANON_KEY`

### Step 3: Configure .env

Edit `.env` file with your credentials:

```bash
# Supabase Configuration (Required)
SUPABASE_URL=https://bkbcqocpjahewqjmlgvf.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# BigQuery Configuration (Optional - for production features)
BIGQUERY_PROJECT_ID=yodel-mobile-app
BIGQUERY_DATASET=aso_reports
BIGQUERY_CREDENTIALS=[JSON_CREDENTIALS]  # Usually not needed for local dev

# Vite Configuration (Optional)
VITE_APP_ENV=development
```

**Important:**
- Never commit `.env` to version control (already in `.gitignore`)
- Use `.env.example` as template for new developers
- Store production credentials securely (e.g., 1Password, AWS Secrets Manager)

### Step 4: Verify Environment Variables

```bash
# Check if .env is being loaded
npm run dev

# Look for console output showing Supabase connection
# If you see "Supabase client initialized", environment is working
```

## Verify Installation

Run all verification checks:

```bash
# Start development server
npm run dev
# ✅ Should start server at http://localhost:5173

# Run tests (in new terminal)
npm test
# ✅ Should run test suite successfully

# Build for production
npm run build
# ✅ Should build without errors

# Lint code
npm run lint
# ✅ Should pass linting checks
```

**All checks passing?** ✅ Installation complete!

## Troubleshooting

### Issue: Dependencies won't install

**Symptoms:** `npm install` fails with errors

**Solution:**
```bash
# 1. Clear npm cache
rm -rf node_modules package-lock.json
npm cache clean --force

# 2. Reinstall
npm install

# 3. If still failing, try legacy peer deps
npm install --legacy-peer-deps
```

### Issue: Environment variables not loading

**Symptoms:** App can't connect to Supabase, shows connection errors

**Solution:**
- Ensure `.env` file is in **project root** (not in subdirectory)
- Check for typos in variable names (case-sensitive!)
- Restart dev server after changing `.env`
- Verify `.env` syntax (no quotes around values unless required)

### Issue: Dev server won't start

**Symptoms:** `npm run dev` fails or hangs

**Solution:**
```bash
# 1. Check port availability
lsof -i :5173  # macOS/Linux
netstat -ano | findstr :5173  # Windows

# 2. Kill process using port
kill -9 [PID]  # macOS/Linux
taskkill /PID [PID] /F  # Windows

# 3. Use different port
npm run dev -- --port 3000
```

### Issue: Supabase connection errors

**Symptoms:** "Invalid API key" or "Connection refused"

**Solution:**
1. Verify credentials in Supabase dashboard
2. Check that project is not paused (free tier pauses after inactivity)
3. Ensure `SUPABASE_URL` includes `https://` prefix
4. Test connection:
   ```bash
   curl https://bkbcqocpjahewqjmlgvf.supabase.co/rest/v1/
   # Should return API documentation
   ```

### Issue: Build fails with TypeScript errors

**Symptoms:** `npm run build` fails with type errors

**Solution:**
```bash
# 1. Check TypeScript version
npx tsc --version

# 2. Regenerate type definitions
npm run generate-types  # If script exists

# 3. Clear TypeScript cache
rm -rf node_modules/.cache
npm run build
```

### More Issues?

For additional troubleshooting:
- See [TROUBLESHOOTING.md](../../TROUBLESHOOTING.md) for comprehensive solutions
- Check [GitHub Issues](https://github.com/SixpoundertheOriginal/yodel-aso-insight-development/issues)
- Ask in team Slack channel

## Next Steps

✅ Installation complete! Now you can:

1. **Start developing** → [local-development.md](./local-development.md)
2. **Understand the architecture** → [ARCHITECTURE_V1.md](../02-architecture/ARCHITECTURE_V1.md)
3. **Learn the development workflow** → [DEVELOPMENT_GUIDE.md](../../DEVELOPMENT_GUIDE.md)
4. **Run tests** → See testing documentation (coming soon)

---

**Estimated Total Time:** 30-45 minutes
**Next:** [Local Development Guide](./local-development.md) →
