# How to View BigQuery Diagnostic Logs

The edge function has been deployed with detailed diagnostic logging.
Here's how to trigger it and see the results:

## Method 1: Via Browser (Easiest)

1. Open your browser and go to Dashboard V2:
   ```
   http://localhost:5173/dashboard-v2
   ```

2. The page will automatically call the BigQuery edge function

3. Open Supabase Dashboard to view logs:
   ```
   https://supabase.com/dashboard/project/bkbcqocpjahewqjmlgvf/logs/edge-functions
   ```

4. Look for these diagnostic log entries:
   - `[AGENCY DIAGNOSTIC]` - Shows if agency relationships were found
   - `[BIGQUERY DIAGNOSTIC]` - Shows BigQuery query results
   - `[TRAFFIC SOURCES DIAGNOSTIC]` - Shows available traffic sources

## Method 2: Via Supabase Dashboard

1. Go to: https://supabase.com/dashboard/project/bkbcqocpjahewqjmlgvf/functions/bigquery-aso-data

2. Click "Invoke" button

3. Use this payload:
   ```json
   {
     "organizationId": "7cccba3f-0a8f-446f-9dba-86e9cb68c92b",
     "dateRange": {
       "from": "2024-11-01",
       "to": "2024-11-30"
     },
     "selectedApps": [],
     "trafficSources": []
   }
   ```
   **Note:** This won't work because it requires authentication

4. View logs in the Logs tab

## What to Look For in Logs

### 1. Agency Relationships
```json
{
  "request_id": "...",
  "resolved_org_id": "7cccba3f-0a8f-446f-9dba-86e9cb68c92b",
  "agency_query_error": null,
  "managed_clients_found": 1,
  "client_org_ids": ["dbdb0cc5-..."]
}
```
✅ Should show 1 client found

### 2. BigQuery Response
```json
{
  "request_id": "...",
  "query_params": {
    "app_ids": ["1000928831", "1011928031", ...],
    "start_date": "2024-11-01",
    "end_date": "2024-11-30",
    "app_count": 8
  },
  "bigquery_response": {
    "total_rows": "0" or "123",
    "rows_returned": 0 or 123,
    "first_3_rows": [...]
  }
}
```

### 3. Traffic Sources
```json
{
  "request_id": "...",
  "total_rows": "5",
  "sources_found": 5,
  "sources": ["App Store Search", "Browse", ...]
}
```

## Interpreting Results

### If `total_rows: "0"`:
- BigQuery has NO data for these app IDs in this date range
- Possible causes:
  1. App IDs in database don't match BigQuery (maybe using bundle_id instead?)
  2. Date range has no data
  3. BigQuery table name is incorrect

### If `managed_clients_found: 0`:
- RLS is blocking the agency_clients query
- Edge function will only query Yodel Mobile org (which has no apps)

### If you see data:
- `total_rows` > 0 means BigQuery HAS data
- `rows_returned` shows how many rows came back
- `first_3_rows` shows sample impression data
- `sources` shows available traffic sources

## Quick Test

Just open the browser and go to:
```
http://localhost:5173/dashboard-v2
```

Then check logs at:
```
https://supabase.com/dashboard/project/bkbcqocpjahewqjmlgvf/logs/edge-functions
```

Filter logs by searching for: `DIAGNOSTIC`
