#!/bin/bash
echo "🧪 Testing Organizations API after database migration..."

TOKEN="eyJhbGciOiJIUzI1NiIsImtpZCI6Ikk1N3ZvRXRSZmxMbXd1cUgiLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL2JrYmNxb2NwamFoZXdxam1sZ3ZmLnN1cGFiYXNlLmNvL2F1dGgvdjEiLCJzdWIiOiI4YWZiYzBlMS05MTliLTRkNTAtYmJkYi00MmNmYjQyZjM0NmYiLCJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzU3NDQwNzA4LCJpYXQiOjE3NTc0MzcxMDgsImVtYWlsIjoiaWdvckB5b2RlbG1vYmlsZS5jb20iLCJwaG9uZSI6IiIsImFwcF9tZXRhZGF0YSI6eyJwcm92aWRlciI6ImVtYWlsIiwicHJvdmlkZXJzIjpbImVtYWlsIl19LCJ1c2VyX21ldGFkYXRhIjp7ImVtYWlsX3ZlcmlmaWVkIjp0cnVlfSwicm9sZSI6ImF1dGhlbnRpY2F0ZWQiLCJhYWwiOiJhYWwxIiwiYW1yIjpbeyJtZXRob2QiOiJwYXNzd29yZCIsInRpbWVzdGFtcCI6MTc1NzQzNzEwOH1dLCJzZXNzaW9uX2lkIjoiYmE1NGMzYzktM2Y2Mi00ODVmLTgwMGYtNzc5MTNhMjdiNDg3IiwiaXNfYW5vbnltb3VzIjpmYWxzZX0.NbJb3hbjZrEhARDruw2CG-mBovCvV71CGEgQoa_QU98"

echo "Testing organizations endpoint..."
curl -s -H "Authorization: Bearer $TOKEN" "https://bkbcqocpjahewqjmlgvf.supabase.co/functions/v1/admin-organizations" | jq .

echo ""
echo "Testing whoami endpoint..."
curl -s -H "Authorization: Bearer $TOKEN" "https://bkbcqocpjahewqjmlgvf.supabase.co/functions/v1/admin-whoami" | jq .

echo ""
echo "✅ If organizations returns JSON data (not an error), the fix is working!"