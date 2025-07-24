#!/bin/bash

# Test script for /api/business/summary Kong Lua implementation
# This script tests the JWT authentication and gRPC call functionality

echo "🧪 Testing /api/business/summary Kong Lua Implementation"
echo "================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Kong Gateway URL
KONG_URL="http://localhost:8000"

# Test JWT Token (you'll need to replace this with a valid token)
# For testing purposes, this is a sample JWT payload
# In production, you'd get this from your authentication service
TEST_JWT="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ0ZXN0LXVzZXItMTIzIiwicm9sZSI6InN0dWRlbnQiLCJuYW1lIjoiVGVzdCBVc2VyIiwiZW1haWwiOiJ0ZXN0QGV4YW1wbGUuY29tIiwiaWF0IjoxNjQwOTk1MjAwLCJleHAiOjk5OTk5OTk5OTl9.sample-signature"

echo -e "${YELLOW}1. Testing without JWT token (should fail with 401)${NC}"
echo "---------------------------------------------------"
curl -s -w "HTTP Status: %{http_code}\n" \
  -H "Content-Type: application/json" \
  "${KONG_URL}/api/business/summary" | jq . 2>/dev/null || echo "Response is not JSON"
echo ""

echo -e "${YELLOW}2. Testing with invalid JWT format (should fail with 401)${NC}"
echo "-------------------------------------------------------"
curl -s -w "HTTP Status: %{http_code}\n" \
  -H "Content-Type: application/json" \
  -H "Authorization: InvalidToken" \
  "${KONG_URL}/api/business/summary" | jq . 2>/dev/null || echo "Response is not JSON"
echo ""

echo -e "${YELLOW}3. Testing with valid JWT token (should succeed)${NC}"
echo "------------------------------------------------"
curl -s -w "HTTP Status: %{http_code}\n" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TEST_JWT}" \
  "${KONG_URL}/api/business/summary" | jq . 2>/dev/null || echo "Response is not JSON"
echo ""

echo -e "${YELLOW}4. Testing with query parameters${NC}"
echo "-----------------------------------"
curl -s -w "HTTP Status: %{http_code}\n" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TEST_JWT}" \
  "${KONG_URL}/api/business/summary?details=true&limit=5" | jq . 2>/dev/null || echo "Response is not JSON"
echo ""

echo -e "${GREEN}✅ Test completed!${NC}"
echo ""
echo "Expected Results:"
echo "- Test 1: HTTP 401 with missing authorization error"
echo "- Test 2: HTTP 401 with invalid authorization format error"  
echo "- Test 3: HTTP 200 with business summary data"
echo "- Test 4: HTTP 200 with business summary data (query params ignored in current implementation)"
echo ""
echo "Note: If Kong is not running, all tests will fail with connection errors."
echo "Start Kong with: cd docker && docker-compose up kong"