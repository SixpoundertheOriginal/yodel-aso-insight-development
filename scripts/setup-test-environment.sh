#!/bin/bash

# Setup Test Environment for Admin API Integration
# This script helps prepare the test environment and validates setup

set -e

echo "🔧 Setting up Admin API Test Environment"
echo "========================================="

# Check if Playwright is installed
if ! command -v npx playwright &> /dev/null; then
    echo "📦 Installing Playwright..."
    npm install -D @playwright/test
    npx playwright install
else
    echo "✅ Playwright already installed"
fi

# Create necessary directories
mkdir -p docs/admin-smoke
mkdir -p tests
echo "✅ Created test directories"

# Check if dev server is running
if curl -s http://localhost:8080/api/health > /dev/null; then
    echo "✅ Dev server is running"
else
    echo "⚠️  Dev server not running. Start with: npm run dev"
fi

# Validate API endpoints are accessible
echo ""
echo "🔍 Validating API endpoints..."

endpoints=(
    "/api/health"
    "/api/whoami"
    "/api/admin/organizations"
    "/api/admin/users"
    "/api/admin/users/invite"
    "/api/admin/dashboard-metrics" 
    "/api/admin/recent-activity"
)

for endpoint in "${endpoints[@]}"; do
    if curl -s -o /dev/null -w "%{http_code}" "http://localhost:8080$endpoint" | grep -q "401\|200\|403"; then
        echo "✅ $endpoint - Reachable"
    else
        echo "❌ $endpoint - Not reachable"
    fi
done

echo ""
echo "🧪 Test Environment Ready!"
echo ""
echo "Next steps:"
echo "1. Ensure you have valid JWT tokens for testing"
echo "2. Run smoke tests: ./scripts/admin-smoke-tests.sh [SUPER_ADMIN_TOKEN] [ORG_ADMIN_TOKEN]"
echo "3. Run Playwright tests: npx playwright test tests/admin-e2e.spec.ts"
echo "4. Check results in: docs/admin-smoke/"
echo ""
echo "📖 See docs/TESTING_PROMPT.md for detailed testing instructions"