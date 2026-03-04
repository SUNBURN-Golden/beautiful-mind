#!/bin/bash
# E2E Smoke Test for API State Transitions
# Requirements: Set NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and DEV_BACKDOOR_SECRET in .env.local

# Load environment variables safely
if [ -f .env.local ]; then
    export $(grep -v '^#' .env.local | xargs)
else
    echo "❌ Error: .env.local file not found. Please create one with SUPABASE credentials."
    exit 1
fi

BASE_URL="http://localhost:3000"

echo "======================================"
echo " Starting E2E /api/me/status Checker "
echo "======================================"

# 1. Unauthenticated Request
echo "[1] Checking Unauthenticated Access..."
RES1=$(curl -s -w "\\n%{http_code}" -X GET $BASE_URL/api/me/status)
HTTP1=$(echo "$RES1" | tail -n1)
if [ "$HTTP1" != "401" ]; then
    echo "❌ FAILED: Expected 401 AUTH_REQUIRED, got $HTTP1"
    exit 1
fi
echo "✅ Passed Unauthenticated (401)"

# Note: Complete JWT E2E via simple cURL requires programmatic Supabase Auth token parsing.
# For strictly bash e2e without relying on Node.js Auth SDK:
echo "⚠️  INFO: Real JWT acquisition requires Node/Puppeteer script or manual token injection."
echo "If valid ADMIN_TOKEN is exported, testing Admin Control Plane instead:"

# 2. Check Admin Backdoor
# PROD should 403. DEV should 200 (if secret correct) or 401/403 (if secret incorrect/disabled).
if [ -n "$ADMIN_TOKEN" ]; then
    echo "[2] Checking PROD Reset Block mechanism..."
    
    RES2=$(curl -s -w "\\n%{http_code}" -X POST $BASE_URL/api/admin/zk/reset \\
        -H "Authorization: Bearer $ADMIN_TOKEN" \\
        -H "x-dev-secret: $DEV_BACKDOOR_SECRET" \\
        -H "Content-Type: application/json")
        
    HTTP2=$(echo "$RES2" | tail -n1)
    
    if [ "$HTTP2" == "403" ]; then
        echo "✅ Passed: Admin API returned 403 (Likely DEV_BACKDOOR locked or PROD mode)."
    elif [ "$HTTP2" == "200" ]; then
        echo "✅ Passed: Admin API successfully executed DEV Reset."
    else
        echo "❌ FAILED: Admin API returned unexpected code: $HTTP2"
        exit 1
    fi
else
    echo "No ADMIN_TOKEN provided. Skipping deep authenticated step assertions."
fi

echo "======================================"
echo " Done. For full state-machine checks, run: node scripts/test-phase3-status.mjs "
echo "======================================"
exit 0
