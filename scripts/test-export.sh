#!/bin/bash

# Test script for chapter export API
# Usage: ./scripts/test-export.sh <quest_id> <export_type> [environment]
# Example: ./scripts/test-export.sh abc123 feedback production

QUEST_ID=$1
EXPORT_TYPE=${2:-feedback}
ENVIRONMENT=${3:-production}
SITE_URL=${4:-http://localhost:3000}

if [ -z "$QUEST_ID" ]; then
  echo "Usage: $0 <quest_id> <export_type> [environment] [site_url]"
  echo "Example: $0 abc123 feedback production http://localhost:3000"
  exit 1
fi

echo "Testing export API..."
echo "Quest ID: $QUEST_ID"
echo "Export Type: $EXPORT_TYPE"
echo "Environment: $ENVIRONMENT"
echo "Site URL: $SITE_URL"
echo ""

# You'll need to get an auth token first
# For testing, you can get one from the mobile app or Supabase dashboard
read -p "Enter your Supabase access token (Bearer token): " ACCESS_TOKEN

if [ -z "$ACCESS_TOKEN" ]; then
  echo "Error: Access token required"
  exit 1
fi

echo ""
echo "Creating export..."
RESPONSE=$(curl -s -X POST "${SITE_URL}/api/export/chapter" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -d "{
    \"quest_id\": \"${QUEST_ID}\",
    \"export_type\": \"${EXPORT_TYPE}\",
    \"environment\": \"${ENVIRONMENT}\"
  }")

echo "Response:"
echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"

EXPORT_ID=$(echo "$RESPONSE" | jq -r '.id' 2>/dev/null)

if [ -n "$EXPORT_ID" ] && [ "$EXPORT_ID" != "null" ]; then
  echo ""
  echo "Export created! ID: $EXPORT_ID"
  echo ""
  echo "Checking status..."
  
  sleep 2
  
  STATUS_RESPONSE=$(curl -s -X GET "${SITE_URL}/api/export/${EXPORT_ID}?environment=${ENVIRONMENT}" \
    -H "Authorization: Bearer ${ACCESS_TOKEN}")
  
  echo "Status:"
  echo "$STATUS_RESPONSE" | jq '.' 2>/dev/null || echo "$STATUS_RESPONSE"
else
  echo ""
  echo "Failed to create export. Check the error above."
fi

