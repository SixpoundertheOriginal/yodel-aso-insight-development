# Complete Pipeline Audit - Competition Data Flow

**Date**: December 1, 2025
**Issue**: Competition showing "-" everywhere
**Goal**: Trace EVERY step from frontend → edge function → iTunes → response

---

## Step 1: Frontend Makes Request

### Where It Happens
**File**: `src/hooks/useBatchComboRankings.ts`
**Line 118-134**: Fetch call to edge function

### What We See in Browser Console
```
[useBatchComboRankings] Fetching 77 combos for app 6477780060
[useBatchComboRankings] Processing 4 batches of ~25 combos each
[useBatchComboRankings] Fetching batch 1/4 (25 combos)
```

**✅ STATUS**: Frontend IS making the request

---

## Step 2: Network Request

### Check This in Browser DevTools
1. Open **Network tab**
2. Filter for: `check-combo-rankings`
3. Look at request:
   - **URL**: Should be `https://bkbcqocpjahewqjmlgvf.supabase.co/functions/v1/check-combo-rankings`
   - **Method**: POST
   - **Status**: Should be 200 OK
   - **Headers**: Should include Authorization token
   - **Request Body**: Should contain `{appId, combos, country, platform, organizationId}`

### What to Check
- **Is request being made?** (Yes/No)
- **What's the status code?** (200, 400, 500, etc.)
- **What's the response body?** (Copy the full JSON)

**❓ STATUS**: Need user to check Network tab

---

## Step 3: Edge Function Receives Request

### Where Logs Should Appear
**Supabase Dashboard**: https://supabase.com/dashboard/project/bkbcqocpjahewqjmlgvf/functions

### Which Function to Check
**IMPORTANT**: There are multiple functions! Make sure you're looking at:
- Function Name: `check-combo-rankings`
- Function ID: `cda1bbec-ace7-4a06-8eee-ae838ae17e74`

### What Logs Should Show
```
[check-combo-rankings] 🚀 Handler invoked
[check-combo-rankings] Method: POST
[check-combo-rankings] Request: {appId: "6477780060", combosCount: 25, ...}
```

### How to View Logs
1. Go to Functions page
2. **IMPORTANT**: Don't filter by function_id in the table!
3. Click on the function row for `check-combo-rankings`
4. Click "Logs" tab on the right side
5. Set time range to "Last hour"

**❌ STATUS**: User says NO logs appear

---

## Step 4: Edge Function Returns Response

### What Frontend Receives
```javascript
{
  combo: 'healthy habits routine',
  position: null,
  isRanking: false,
  totalResults: null,  // ❌ This should be a number!
  checkedAt: '2025-12-01T14:09:50.282Z',
  trend: null,
  positionChange: null
}
```

**✅ STATUS**: Frontend IS receiving a response (but wrong data)

---

## DIAGNOSIS

### Scenario A: Function Never Executes
**If TRUE**: No logs, no API calls to iTunes
**Evidence**: No logs in dashboard
**Cause**: Function crashes during boot
**Fix**: Check for boot errors in Supabase dashboard

### Scenario B: Function Executes But Logs Don't Show
**If TRUE**: Function runs, but console.log doesn't appear
**Evidence**: We get responses with proper structure
**Cause**: Logs filtered wrong OR logs delayed
**Fix**: Check different time ranges, refresh dashboard

### Scenario C: Old Version Cached
**If TRUE**: Old version still running despite new deployment
**Evidence**: New logs don't appear, get old responses
**Cause**: Supabase CDN cache
**Fix**: Wait 5 minutes, force clear cache

### Scenario D: Wrong Endpoint Being Called
**If TRUE**: Frontend calls different function
**Evidence**: No logs for check-combo-rankings
**Cause**: URL typo or environment variable
**Fix**: Check Network tab URL

---

## ACTION ITEMS FOR USER

### 1. Check Network Tab (CRITICAL)
**Instructions**:
1. Open DevTools (F12)
2. Go to "Network" tab
3. Refresh the page
4. Look for request named `check-combo-rankings`
5. Click on it
6. Go to "Response" tab

**Share**:
- Screenshot of the request
- Full response JSON (copy and paste)
- Request URL
- Status code

### 2. Check Edge Function Logs (CRITICAL)
**Instructions**:
1. Go to: https://supabase.com/dashboard/project/bkbcqocpjahewqjmlgvf/functions
2. **Click on the row** for `check-combo-rankings` (not the checkbox!)
3. On the right side panel, click "Logs" tab
4. Set time filter to "Last 1 hour"
5. Click "Refresh" button

**Share**:
- Screenshot of the logs panel
- Any error messages (red text)
- Count of log entries shown

### 3. Try Direct Test
**Instructions**:
Run this in terminal:
```bash
curl -X POST 'https://bkbcqocpjahewqjmlgvf.supabase.co/functions/v1/check-combo-rankings' \
  -H 'Content-Type: application/json' \
  -d '{"appId":"123","combos":["test"],"country":"us","platform":"ios","organizationId":"test"}'
```

**Share**:
- Full output of the command
- Whether you get JSON response or error

---

## EXPECTED vs ACTUAL

### Expected Flow
```
Frontend → POST request → Edge function logs "🚀 Handler invoked" →
iTunes API call → Get resultCount → Return to frontend → Show numbers
```

### Actual Flow
```
Frontend → POST request → ??? → Return {totalResults: null} → Show "-"
                         ↑
                    NO LOGS HERE
```

**The mystery**: Something returns a response, but we don't see WHO.

---

## Next Steps

Based on user's answers above, we'll know:
1. **Is the request reaching Supabase?** (Network tab)
2. **Is the function executing?** (Logs tab)
3. **What's the actual error?** (Response body)

Then we can fix it!
