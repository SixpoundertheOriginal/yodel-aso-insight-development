#!/bin/bash
echo "🧪 Testing Demo Data Fix - TRUE SEARCH should now be > 0"

TOKEN="eyJhbGciOiJIUzI1NiIsImtpZCI6Ikk1N3ZvRXRSZmxMbXd1cUgiLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL2JrYmNxb2NwamFoZXdxam1sZ3ZmLnN1cGFiYXNlLmNvL2F1dGgvdjEiLCJzdWIiOiI4YWZiYzBlMS05MTliLTRkNTAtYmJkYi00MmNmYjQyZjM0NmYiLCJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzU3NDQwNzA4LCJpYXQiOjE3NTc0MzcxMDgsImVtYWlsIjoiaWdvckB5b2RlbG1vYmlsZS5jb20iLCJwaG9uZSI6IiIsImFwcF9tZXRhZGF0YSI6eyJwcm92aWRlciI6ImVtYWlsIiwicHJvdmlkZXJzIjpbImVtYWlsIl19LCJ1c2VyX21ldGFkYXRhIjp7ImVtYWlsX3ZlcmlmaWVkIjp0cnVlfSwicm9sZSI6ImF1dGhlbnRpY2F0ZWQiLCJhYWwiOiJhYWwxIiwiYW1yIjpbeyJtZXRob2QiOiJwYXNzd29yZCIsInRpbWVzdGFtcCI6MTc1NzQzNzEwOH1dLCJzZXNzaW9uX2lkIjoiYmE1NGMzYzktM2Y2Mi00ODVmLTgwMGYtNzc5MTNhMjViNDg3IiwiaXNfYW5vbnltb3VzIjpmYWxzZX0.NbJb3hbjZrEhARDruw2CG-mBovCvV71CGEgQoa_QU98"

echo "📊 Testing BigQuery demo data endpoint..."
curl -s -X POST "https://bkbcqocpjahewqjmlgvf.supabase.co/functions/v1/bigquery-aso-data" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "organizationId": "demo-org-id",
    "dateRange": {
      "from": "2025-01-01",
      "to": "2025-01-10"
    }
  }' | jq '{
    success: .success,
    isDemo: .isDemo,
    totalRecords: (.data | length),
    trafficSources: (.data | group_by(.traffic_source) | map({source: .[0].traffic_source, records: length})),
    sampleCalculation: {
      appStoreSearch: (.data | map(select(.traffic_source == "App Store Search")) | map(.impressions) | add // 0),
      appleSearchAds: (.data | map(select(.traffic_source == "Apple Search Ads")) | map(.impressions) | add // 0),
      trueSearchCalculation: "App Store Search - Apple Search Ads"
    }
  }'

echo ""
echo "🔍 Key Validation Points:"
echo "1. Total traffic sources should be 8 (was 6)"
echo "2. App Store Search impressions should be > Apple Search Ads impressions"
echo "3. TRUE SEARCH = App Store Search - Apple Search Ads should be > 1000"
echo "4. All traffic sources should have meaningful data"