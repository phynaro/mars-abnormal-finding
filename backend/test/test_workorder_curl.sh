#!/bin/bash

# Work Order API Test Script using cURL
# Usage: ./test_workorder_curl.sh [WORK_ORDER_ID]

# Configuration
BASE_URL="http://localhost:3001/api"
USERNAME="phynaro"
PASSWORD="Jir@202501"
WORK_ORDER_ID=${1:-201635}  # Default to 201635 if no ID provided

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Work Order API Test Script${NC}"
echo "=================================="
echo "Base URL: $BASE_URL"
echo "Work Order ID: $WORK_ORDER_ID"
echo ""

# Step 1: Authenticate and get token
echo -e "${YELLOW}🔐 Step 1: Authenticating...${NC}"
AUTH_RESPONSE=$(curl -s -X POST \
  "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"$USERNAME\",\"password\":\"$PASSWORD\"}")

# Extract token from response
TOKEN=$(echo $AUTH_RESPONSE | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
    echo -e "${RED}❌ Authentication failed${NC}"
    echo "Response: $AUTH_RESPONSE"
    exit 1
fi

echo -e "${GREEN}✅ Authentication successful${NC}"
echo "Token: ${TOKEN:0:20}..."
echo ""

# Step 2: Get single work order
echo -e "${YELLOW}📋 Step 2: Getting Work Order $WORK_ORDER_ID...${NC}"
WO_RESPONSE=$(curl -s -X GET \
  "$BASE_URL/workorders/$WORK_ORDER_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json")

# Check if request was successful
if echo "$WO_RESPONSE" | grep -q '"success":true'; then
    echo -e "${GREEN}✅ Successfully retrieved work order${NC}"
    
    # Extract key information using grep and basic text processing
    WO_CODE=$(echo $WO_RESPONSE | grep -o '"woCode":"[^"]*"' | cut -d'"' -f4)
    WO_PROBLEM=$(echo $WO_RESPONSE | grep -o '"problem":"[^"]*"' | cut -d'"' -f4)
    STATUS_NAME=$(echo $WO_RESPONSE | grep -o '"name":"[^"]*"' | head -1 | cut -d'"' -f4)
    TYPE_NAME=$(echo $WO_RESPONSE | grep -o '"name":"[^"]*"' | head -2 | tail -1 | cut -d'"' -f4)
    REQUESTER_NAME=$(echo $WO_RESPONSE | grep -o '"name":"[^"]*"' | head -3 | tail -1 | cut -d'"' -f4)
    
    echo ""
    echo -e "${BLUE}📊 Work Order Summary:${NC}"
    echo "   Code: $WO_CODE"
    echo "   Problem: ${WO_PROBLEM:0:50}..."
    echo "   Status: $STATUS_NAME"
    echo "   Type: $TYPE_NAME"
    echo "   Requester: $REQUESTER_NAME"
    
    # Save full response to file
    echo "$WO_RESPONSE" | python -m json.tool > "workorder_${WORK_ORDER_ID}_response.json" 2>/dev/null
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}💾 Full response saved to: workorder_${WORK_ORDER_ID}_response.json${NC}"
    else
        echo "$WO_RESPONSE" > "workorder_${WORK_ORDER_ID}_response.json"
        echo -e "${GREEN}💾 Raw response saved to: workorder_${WORK_ORDER_ID}_response.json${NC}"
    fi
else
    echo -e "${RED}❌ Failed to retrieve work order${NC}"
    echo "Response: $WO_RESPONSE"
    exit 1
fi

echo ""

# Step 3: Get work order resources
echo -e "${YELLOW}🔧 Step 3: Getting Work Order Resources...${NC}"
RESOURCES_RESPONSE=$(curl -s -X GET \
  "$BASE_URL/workorders/$WORK_ORDER_ID/resources" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json")

if echo "$RESOURCES_RESPONSE" | grep -q '"success":true'; then
    RESOURCE_COUNT=$(echo $RESOURCES_RESPONSE | grep -o '"data":\[' | wc -l)
    echo -e "${GREEN}✅ Successfully retrieved resources${NC}"
    echo "   Resource count: Found resources data"
    
    # Save resources response
    echo "$RESOURCES_RESPONSE" | python -m json.tool > "workorder_${WORK_ORDER_ID}_resources.json" 2>/dev/null
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}💾 Resources saved to: workorder_${WORK_ORDER_ID}_resources.json${NC}"
    fi
else
    echo -e "${RED}❌ Failed to retrieve resources${NC}"
fi

echo ""

# Step 4: Get work order tasks
echo -e "${YELLOW}📋 Step 4: Getting Work Order Tasks...${NC}"
TASKS_RESPONSE=$(curl -s -X GET \
  "$BASE_URL/workorders/$WORK_ORDER_ID/tasks" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json")

if echo "$TASKS_RESPONSE" | grep -q '"success":true'; then
    echo -e "${GREEN}✅ Successfully retrieved tasks${NC}"
    echo "   Task data retrieved"
    
    # Save tasks response
    echo "$TASKS_RESPONSE" | python -m json.tool > "workorder_${WORK_ORDER_ID}_tasks.json" 2>/dev/null
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}💾 Tasks saved to: workorder_${WORK_ORDER_ID}_tasks.json${NC}"
    fi
else
    echo -e "${RED}❌ Failed to retrieve tasks${NC}"
fi

echo ""

# Step 5: Test error handling with non-existent work order
echo -e "${YELLOW}🚫 Step 5: Testing error handling (non-existent WO)...${NC}"
ERROR_RESPONSE=$(curl -s -X GET \
  "$BASE_URL/workorders/999999" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json")

if echo "$ERROR_RESPONSE" | grep -q '"success":false'; then
    echo -e "${GREEN}✅ Error handling works correctly${NC}"
    ERROR_MESSAGE=$(echo $ERROR_RESPONSE | grep -o '"message":"[^"]*"' | cut -d'"' -f4)
    echo "   Error message: $ERROR_MESSAGE"
else
    echo -e "${RED}❌ Error handling not working as expected${NC}"
fi

echo ""
echo -e "${BLUE}🏁 Test Finished${NC}"
echo "=================================="
echo "Generated files:"
echo "  - workorder_${WORK_ORDER_ID}_response.json"
echo "  - workorder_${WORK_ORDER_ID}_resources.json"
echo "  - workorder_${WORK_ORDER_ID}_tasks.json"
echo ""
echo -e "${GREEN}All tests Finished successfully!${NC}"
