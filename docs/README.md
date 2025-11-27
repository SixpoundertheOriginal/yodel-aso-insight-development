# Documentation Index

Welcome to the Yodel ASO Insight documentation.

---

## 📚 Documentation Files

### BigQuery Pipeline

| Document | Purpose | When to Use |
|----------|---------|-------------|
| **[BIGQUERY_PIPELINE.md](./BIGQUERY_PIPELINE.md)** | Complete technical documentation | Understanding architecture, making changes, onboarding |
| **[BIGQUERY_QUICK_FIX.md](./BIGQUERY_QUICK_FIX.md)** | Emergency troubleshooting guide | Dashboard V2 is broken and needs immediate fix |
| **[../BIGQUERY_FIX_SUMMARY.md](../BIGQUERY_FIX_SUMMARY.md)** | Recent fix documentation | Understanding what was fixed on Nov 27, 2025 |
| **[../AUDIT_FINDINGS.md](../AUDIT_FINDINGS.md)** | Detailed audit report | Understanding the investigation process |

---

## 🚀 Quick Start

### I Want To...

#### Fix a Broken Dashboard V2
→ Read: **[BIGQUERY_QUICK_FIX.md](./BIGQUERY_QUICK_FIX.md)**

Follow the 5-minute fix guide to resolve common issues.

---

#### Understand How BigQuery Works
→ Read: **[BIGQUERY_PIPELINE.md](./BIGQUERY_PIPELINE.md)** - Overview & Architecture sections

Learn about the data flow from frontend to BigQuery.

---

#### Make Changes to the Pipeline
→ Read: **[BIGQUERY_PIPELINE.md](./BIGQUERY_PIPELINE.md)** - Full document

Then follow the Deployment Checklist before deploying.

---

#### Debug a Specific Error
→ Read: **[BIGQUERY_QUICK_FIX.md](./BIGQUERY_QUICK_FIX.md)** - Diagnosis section

Find your error message in the tables.

---

#### Onboard a New Developer
→ Read in this order:
1. **[BIGQUERY_PIPELINE.md](./BIGQUERY_PIPELINE.md)** - Overview & Architecture
2. **[BIGQUERY_FIX_SUMMARY.md](../BIGQUERY_FIX_SUMMARY.md)** - Recent changes
3. **[BIGQUERY_QUICK_FIX.md](./BIGQUERY_QUICK_FIX.md)** - Common issues

---

## 🔑 Critical Information

### Configuration Values (NEVER CHANGE)

```yaml
BigQuery Project:    aso-reporting-1
BigQuery Dataset:    client_reports
BigQuery Region:     EU
BigQuery Table:      aso_all_apple
```

### Supabase Project

```yaml
Project ID:          bkbcqocpjahewqjmlgvf
Organization ID:     7cccba3f-0a8f-446f-9dba-86e9cb68c92b
```

### Edge Function

```yaml
Name:                bigquery-aso-data
Location:            supabase/functions/bigquery-aso-data/index.ts
Current Version:     501 (as of Nov 27, 2025)
```

---

## 📖 Documentation Standards

When updating these docs:

1. **Keep them current** - Update immediately after changes
2. **Be specific** - Include exact line numbers, file paths
3. **Add examples** - Show actual code, commands, outputs
4. **Test instructions** - Verify all commands actually work
5. **Date everything** - Add "Last Updated" timestamp

---

## 🆘 Getting Help

### First Steps

1. Check **[BIGQUERY_QUICK_FIX.md](./BIGQUERY_QUICK_FIX.md)** for your issue
2. Search edge function logs for errors
3. Read the relevant section in **[BIGQUERY_PIPELINE.md](./BIGQUERY_PIPELINE.md)**

### If Still Stuck

Provide this information:
- What you were trying to do
- Error messages (exact text)
- Edge function logs (screenshot)
- Browser console errors
- What you've tried already

---

## 📝 Contributing

To add new documentation:

1. Create file in `docs/` folder
2. Add entry to this README
3. Use clear, concise language
4. Include code examples
5. Test all commands
6. Commit with descriptive message

---

## 🏗️ Future Documentation

Planned documentation to add:

- [ ] Frontend architecture guide
- [ ] RLS policies reference
- [ ] Database schema documentation
- [ ] Authentication flow guide
- [ ] Agency multi-tenant architecture
- [ ] Performance optimization guide

---

**Last Updated:** November 27, 2025
