# 🚨 ROLLBACK QUICK REFERENCE

**Use this guide in case of emergency rollback needed**

---

## 🔴 Emergency Rollback (Full System Revert)

### 1. Revert Git
```bash
git revert HEAD
git push origin main
```

### 2. Drop Database Tables
```bash
psql "$DATABASE_URL" -f supabase/migrations/ROLLBACK_semantic_insights.sql
```

### 3. Rebuild & Deploy
```bash
npm run build
# Deploy via CI/CD
```

**Time**: ~10 minutes
**Effect**: Complete system restore

---

## 🟡 Quick Rollback (Database Only)

### If new tables causing issues but code is fine:

```bash
psql "$DATABASE_URL" -f supabase/migrations/ROLLBACK_semantic_insights.sql
```

**Time**: ~30 seconds
**Effect**: Removes new tables, keeps old system working

---

## 🟢 Instant Rollback (Feature Flag)

### If UI has bugs but data/logic is fine:

```typescript
// In .env or feature flags config
VITE_USE_SEMANTIC_INSIGHTS=false
VITE_USE_LEGACY_INSIGHTS=true
```

**Time**: <1 minute (change env var + redeploy)
**Effect**: Switches UI back to old components

---

## 📋 Rollback Verification Checklist

After any rollback:

- [ ] Old competitor analysis UI loads correctly
- [ ] Can run new analysis on existing app
- [ ] Cached analyses still accessible
- [ ] No console errors
- [ ] Database queries working
- [ ] Error rate back to baseline
- [ ] Monitor for 1 hour

---

## 🔍 Check System Health

```bash
# Check if old tables intact
psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM competitor_analysis_cache;"

# Check if new tables removed
psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM semantic_insights;"
# Should error if rollback successful

# Check recent analyses
psql "$DATABASE_URL" -c "SELECT created_at, primary_app_id FROM competitor_analysis_cache ORDER BY created_at DESC LIMIT 5;"
```

---

## 📞 Who to Contact

1. **Check logs** first
2. **Run appropriate rollback** (start with lowest level)
3. **Verify system working**
4. **Document what happened**

---

## 🎯 Git Rollback Point

**Tag**: `v1.0-before-semantic-insights`

```bash
# To return to this exact state:
git checkout v1.0-before-semantic-insights
```

---

## 📄 Full Documentation

See `ROLLBACK_PLAN.md` for complete procedures and decision criteria.
