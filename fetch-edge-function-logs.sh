#!/bin/bash

# Fetch edge function logs from Supabase
# This requires the Supabase access token

echo "📋 Fetching recent edge function logs..."
echo ""
echo "Please open this URL in your browser to view logs:"
echo "https://supabase.com/dashboard/project/bkbcqocpjahewqjmlgvf/logs/edge-functions"
echo ""
echo "Filter by: DIAGNOSTIC"
echo ""
echo "Look for these log entries:"
echo "  [AGENCY DIAGNOSTIC] - Shows if agency query succeeded"
echo "  [BIGQUERY DIAGNOSTIC] - Shows BigQuery response"
echo "  [TRAFFIC SOURCES DIAGNOSTIC] - Shows available sources"
echo ""
echo "Key things to check in [AGENCY DIAGNOSTIC]:"
echo "  - agency_query_error: should be null"
echo "  - managed_clients_found: should be 1"
echo "  - managed_clients_data: should show the client org"
echo ""
