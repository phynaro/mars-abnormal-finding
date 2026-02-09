#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
BASE_URL="http://192.168.0.241:3001/api"
AUTH_TOKEN=""
USER_NAME=""
USER_PASSWORD=""

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_header() {
    echo -e "${CYAN}================================${NC}"
    echo -e "${CYAN}  EDEN Abnormality Handling${NC}"
    echo -e "${CYAN}      API Testing Tool${NC}"
    echo -e "${CYAN}================================${NC}"
    echo
}

# Function to check if jq is installed
check_dependencies() {
    if ! command -v jq &> /dev/null; then
        print_error "jq is not installed. Please install jq to parse JSON responses."
        print_status "Install with: brew install jq (macOS) or apt-get install jq (Ubuntu)"
        exit 1
    fi
    
    if ! command -v curl &> /dev/null; then
        print_error "curl is not installed. Please install curl."
        exit 1
    fi
}

# Function to login and get auth token
login() {
    print_header
    echo -e "${BLUE}=== Login ===${NC}"
    echo
    
    read -p "Enter username: " USER_NAME
    read -s -p "Enter password: " USER_PASSWORD
    echo
    
    print_status "Attempting to login..."
    
    # Login request
    RESPONSE=$(curl -s -X POST "${BASE_URL}/auth/login" \
        -H "Content-Type: application/json" \
        -d "{
            \"username\": \"${USER_NAME}\",
            \"password\": \"${USER_PASSWORD}\"
        }")
    
    # Check if login was successful
    if echo "$RESPONSE" | jq -e '.success' > /dev/null 2>&1; then
        AUTH_TOKEN=$(echo "$RESPONSE" | jq -r '.token')
        if [ "$AUTH_TOKEN" != "null" ] && [ "$AUTH_TOKEN" != "" ]; then
            print_status "Login successful! Token obtained."
            return 0
        else
            print_error "Login failed: No token received"
            return 1
        fi
    else
        print_error "Login failed: Invalid response"
        echo "Response: $RESPONSE"
        return 1
    fi
}

# Function to test WorkFlow Types API
test_workflow_types() {
    print_header
    echo -e "${BLUE}=== WorkFlow Types API Testing ===${NC}"
    echo
    
    if [ -z "$AUTH_TOKEN" ]; then
        print_error "No authentication token. Please login first."
        return 1
    fi
    
    echo "1. Get all workflow types"
    echo "2. Get workflow type by ID"
    echo "3. Back to main menu"
    echo
    read -p "Select option (1-3): " choice
    
    case $choice in
        1)
            test_get_all_workflow_types
            ;;
        2)
            test_get_workflow_type_by_id
            ;;
        3)
            return 0
            ;;
        *)
            print_error "Invalid option"
            ;;
    esac
}

# Function to test WorkFlow Tracking API
test_workflow_tracking() {
    print_header
    echo -e "${BLUE}=== WorkFlow Tracking API Testing ===${NC}"
    echo
    
    if [ -z "$AUTH_TOKEN" ]; then
        print_error "No authentication token. Please login first."
        return 1
    fi
    
    echo "1. Get all workflow tracking records"
    echo "2. Get workflow tracking by document number"
    echo "3. Back to main menu"
    echo
    read -p "Select option (1-3): " choice
    
    case $choice in
        1)
            test_get_all_workflow_tracking
            ;;
        2)
            test_get_workflow_tracking_by_doc_no
            ;;
        3)
            return 0
            ;;
        *)
            print_error "Invalid option"
            ;;
    esac
}

# Function to test get all workflow types
test_get_all_workflow_types() {
    print_status "Testing GET /api/workflow/types"
    echo
    
    RESPONSE=$(curl -s -X GET "${BASE_URL}/workflow/types" \
        -H "Authorization: Bearer ${AUTH_TOKEN}" \
        -H "Content-Type: application/json")
    
    echo "Response:"
    echo "$RESPONSE" | jq '.'
    echo
    
    if echo "$RESPONSE" | jq -e '.success' > /dev/null 2>&1; then
        print_status "✅ Request successful!"
        COUNT=$(echo "$RESPONSE" | jq -r '.count // 0')
        print_status "Found $COUNT workflow types"
    else
        print_error "❌ Request failed!"
    fi
    
    echo
    read -p "Press Enter to continue..."
}

# Function to test get workflow type by ID
test_get_workflow_type_by_id() {
    print_status "Testing GET /api/workflow/types/:id"
    echo
    
    read -p "Enter workflow type ID: " TYPE_ID
    
    if [ -z "$TYPE_ID" ]; then
        print_error "ID cannot be empty"
        return 1
    fi
    
    RESPONSE=$(curl -s -X GET "${BASE_URL}/workflow/types/${TYPE_ID}" \
        -H "Authorization: Bearer ${AUTH_TOKEN}" \
        -H "Content-Type: application/json")
    
    echo "Response:"
    echo "$RESPONSE" | jq '.'
    echo
    
    if echo "$RESPONSE" | jq -e '.success' > /dev/null 2>&1; then
        print_status "✅ Request successful!"
    else
        print_error "❌ Request failed!"
    fi
    
    echo
    read -p "Press Enter to continue..."
}

# Function to show API groups menu
show_api_groups() {
    print_header
    echo -e "${BLUE}=== API Groups ===${NC}"
    echo
    
    echo "1. WorkFlow Types API"
    echo "2. WorkFlow Tracking API"
    echo "3. Exit"
    echo
    read -p "Select API group (1-3): " choice
    
    case $choice in
        1)
            test_workflow_types
            ;;
        2)
            test_workflow_tracking
            ;;
        3)
            print_status "Goodbye!"
            exit 0
            ;;
        *)
            print_error "Invalid option"
            ;;
    esac
}

# Function to show main menu
show_main_menu() {
    print_header
    echo -e "${BLUE}=== Main Menu ===${NC}"
    echo
    
    if [ -z "$AUTH_TOKEN" ]; then
        echo "1. Login"
        echo "2. Exit"
        echo
        read -p "Select option (1-2): " choice
        
        case $choice in
            1)
                if login; then
                    show_main_menu
                else
                    echo
                    read -p "Press Enter to continue..."
                    show_main_menu
                fi
                ;;
            2)
                print_status "Goodbye!"
                exit 0
                ;;
            *)
                print_error "Invalid option"
                show_main_menu
                ;;
        esac
    else
        echo "1. Select API group"
        echo "2. Logout"
        echo "3. Exit"
        echo
        read -p "Select option (1-3): " choice
        
        case $choice in
            1)
                show_api_groups
                ;;
            2)
                AUTH_TOKEN=""
                USER_NAME=""
                USER_PASSWORD=""
                print_status "Logged out successfully"
                show_main_menu
                ;;
            3)
                print_status "Goodbye!"
                exit 0
                ;;
            *)
                print_error "Invalid option"
                show_main_menu
                ;;
        esac
    fi
}

# Main function
main() {
    check_dependencies
    
    # Clear screen
    clear
    
    # Show main menu
    show_main_menu
}

# Function to test get all workflow tracking records
test_get_all_workflow_tracking() {
    print_status "Testing GET /api/workflow/tracking"
    echo
    
    # Build query parameters
    local params=""
    read -p "Enter page number (default: 1): " page
    read -p "Enter limit (default: 20): " limit
    read -p "Enter document code filter (optional): " docCode
    read -p "Enter workflow doc flow code filter (optional): " wfDocFlowCode
    read -p "Enter approved flag filter (T/F, optional): " approvedFlag
    read -p "Enter search term (optional): " search
    
    if [ ! -z "$page" ]; then
        params="${params}page=${page}&"
    fi
    if [ ! -z "$limit" ]; then
        params="${params}limit=${limit}&"
    fi
    if [ ! -z "$docCode" ]; then
        params="${params}docCode=${docCode}&"
    fi
    if [ ! -z "$wfDocFlowCode" ]; then
        params="${params}wfDocFlowCode=${wfDocFlowCode}&"
    fi
    if [ ! -z "$approvedFlag" ]; then
        params="${params}approvedFlag=${approvedFlag}&"
    fi
    if [ ! -z "$search" ]; then
        params="${params}search=${search}&"
    fi
    
    # Remove trailing & if params exist
    if [ ! -z "$params" ]; then
        params="?${params%&}"
    fi
    
    RESPONSE=$(curl -s -X GET "${BASE_URL}/workflow/tracking${params}" \
        -H "Authorization: Bearer ${AUTH_TOKEN}" \
        -H "Content-Type: application/json")
    
    echo "Response:"
    echo "$RESPONSE" | jq '.'
    echo
    
    if echo "$RESPONSE" | jq -e '.success' > /dev/null 2>&1; then
        print_status "✅ Request successful!"
        COUNT=$(echo "$RESPONSE" | jq -r '.data | length // 0')
        TOTAL=$(echo "$RESPONSE" | jq -r '.pagination.total // 0')
        print_status "Retrieved $COUNT records (Total: $TOTAL)"
    else
        print_error "❌ Request failed!"
    fi
    
    echo
    read -p "Press Enter to continue..."
}

# Function to test get workflow tracking by document number
test_get_workflow_tracking_by_doc_no() {
    print_status "Testing GET /api/workflow/tracking/doc/:docNo"
    echo
    
    read -p "Enter document number: " DOC_NO
    
    if [ -z "$DOC_NO" ]; then
        print_error "Document number cannot be empty"
        return 1
    fi
    
    RESPONSE=$(curl -s -X GET "${BASE_URL}/workflow/tracking/doc/${DOC_NO}" \
        -H "Authorization: Bearer ${AUTH_TOKEN}" \
        -H "Content-Type: application/json")
    
    echo "Response:"
    echo "$RESPONSE" | jq '.'
    echo
    
    if echo "$RESPONSE" | jq -e '.success' > /dev/null 2>&1; then
        print_status "✅ Request successful!"
        COUNT=$(echo "$RESPONSE" | jq -r '.count // 0')
        print_status "Found $COUNT tracking records for document $DOC_NO"
    else
        print_error "❌ Request failed!"
    fi
    
    echo
    read -p "Press Enter to continue..."
}

# Run main function
main
