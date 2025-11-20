---
Status: ACTIVE
Version: v1.0
Last Updated: 2025-01-20
Purpose: 5-minute quickstart guide with copy-paste commands
Audience: New Developers
---

# 5-Minute Quickstart

Get the Yodel ASO Insight app running locally in 5 minutes with copy-paste commands.

## Prerequisites

✅ Node.js 18+ installed
✅ npm installed
✅ Git installed

## Step 1: Clone Repository (30 seconds)

```bash
git clone https://github.com/SixpoundertheOriginal/yodel-aso-insight-development.git
cd yodel-aso-insight-development
```

## Step 2: Install Dependencies (2 minutes)

```bash
npm install
```

## Step 3: Environment Setup (1 minute)

```bash
# Copy example environment file
cp .env.example .env
```

**Edit .env** and add your Supabase credentials:

```bash
# Required: Get these from Supabase dashboard → Project Settings → API
SUPABASE_URL=https://bkbcqocpjahewqjmlgvf.supabase.co
SUPABASE_ANON_KEY=[YOUR_ANON_KEY]

# Optional: BigQuery integration (not required for local development)
BIGQUERY_PROJECT_ID=yodel-mobile-app
BIGQUERY_DATASET=aso_reports
```

## Step 4: Run Development Server (30 seconds)

```bash
npm run dev
```

## Step 5: Open Browser (15 seconds)

Open the URL shown in your terminal (typically http://localhost:5173)

## ✅ Success!

You should see the Yodel ASO Insight login page.

**Login Options:**
- Use your Supabase test account credentials
- OR: Request demo account access from your team lead

## Next Steps

- **Detailed Installation:** [installation.md](./installation.md) - Complete setup with all tools
- **Local Development Setup:** [local-development.md](./local-development.md) - Development workflow
- **Run Tests:** `npm test`
- **Build for Production:** `npm run build`

## Troubleshooting

### Port already in use?

```bash
# Use different port
npm run dev -- --port 3000
```

### Dependencies fail to install?

```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm cache clean --force
npm install
```

### Environment variables not loading?

- Ensure `.env` file is in project root (not in a subdirectory)
- Restart dev server after changing `.env`
- Check for typos in variable names (case-sensitive)

### Supabase connection errors?

- Verify `SUPABASE_URL` and `SUPABASE_ANON_KEY` are correct
- Check Project Settings → API in Supabase dashboard
- Ensure your Supabase project is active (not paused)

**More issues?** See [TROUBLESHOOTING.md](../../TROUBLESHOOTING.md) or [installation.md](./installation.md) for detailed solutions.

---

**Estimated Time:** 5 minutes ⏱️
**Next:** [Detailed Installation Guide](./installation.md) →
