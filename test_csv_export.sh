#!/bin/bash

# CSV Export Feature Test Script
# This script tests the CSV export endpoint

echo "=========================================="
echo "CSV Export Feature - Backend Test Script"
echo "=========================================="
echo ""

# Configuration
BASE_URL="http://localhost:4000"
EXPORT_ENDPOINT="${BASE_URL}/api/export/summary-csv"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}ℹ $1${NC}"
}

# Check if server is running
echo "1. Checking if server is running..."
if curl -s "${BASE_URL}/health" > /dev/null 2>&1; then
    print_success "Server is running"
else
    print_error "Server is not running. Please start the backend server first."
    echo "   Run: cd back && npm run dev"
    exit 1
fi

echo ""

# Check if user is authenticated
echo "2. Testing authentication..."
print_info "You need to be logged in as admin to test this feature."
print_info "Please provide your JWT token:"
read -p "JWT Token: " JWT_TOKEN

if [ -z "$JWT_TOKEN" ]; then
    print_error "No token provided. Exiting."
    exit 1
fi

echo ""

# Test 1: Export monthly summary
echo "3. Testing MONTH filter..."
MONTH_DATE="2024-12-01T00:00:00.000Z"
RESPONSE=$(curl -s -w "\n%{http_code}" \
    -H "Authorization: Bearer ${JWT_TOKEN}" \
    "${EXPORT_ENDPOINT}?type=month&date=${MONTH_DATE}")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "200" ]; then
    print_success "Month export successful (HTTP 200)"
    
    # Save to file
    curl -s -H "Authorization: Bearer ${JWT_TOKEN}" \
        "${EXPORT_ENDPOINT}?type=month&date=${MONTH_DATE}" \
        --output test_month_export.csv
    
    if [ -f "test_month_export.csv" ]; then
        LINES=$(wc -l < test_month_export.csv)
        print_success "CSV file created: test_month_export.csv ($LINES lines)"
        
        # Check if CSV has header
        HEADER=$(head -n1 test_month_export.csv)
        if [[ $HEADER == *"barangay_name"* ]]; then
            print_success "CSV header is correct"
        else
            print_error "CSV header is incorrect"
        fi
    fi
else
    print_error "Month export failed (HTTP $HTTP_CODE)"
    echo "Response: $BODY"
fi

echo ""

# Test 2: Export daily summary
echo "4. Testing DAY filter..."
DAY_DATE="2024-12-01T00:00:00.000Z"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
    -H "Authorization: Bearer ${JWT_TOKEN}" \
    "${EXPORT_ENDPOINT}?type=day&date=${DAY_DATE}")

if [ "$HTTP_CODE" = "200" ]; then
    print_success "Day export successful (HTTP 200)"
    
    curl -s -H "Authorization: Bearer ${JWT_TOKEN}" \
        "${EXPORT_ENDPOINT}?type=day&date=${DAY_DATE}" \
        --output test_day_export.csv
    
    if [ -f "test_day_export.csv" ]; then
        LINES=$(wc -l < test_day_export.csv)
        print_success "CSV file created: test_day_export.csv ($LINES lines)"
    fi
else
    print_error "Day export failed (HTTP $HTTP_CODE)"
fi

echo ""

# Test 3: Export weekly summary
echo "5. Testing WEEK filter..."
WEEK_DATE="2024-12-01T00:00:00.000Z"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
    -H "Authorization: Bearer ${JWT_TOKEN}" \
    "${EXPORT_ENDPOINT}?type=week&date=${WEEK_DATE}")

if [ "$HTTP_CODE" = "200" ]; then
    print_success "Week export successful (HTTP 200)"
else
    print_error "Week export failed (HTTP $HTTP_CODE)"
fi

echo ""

# Test 4: Export yearly summary
echo "6. Testing YEAR filter..."
YEAR_DATE="2024-01-01T00:00:00.000Z"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
    -H "Authorization: Bearer ${JWT_TOKEN}" \
    "${EXPORT_ENDPOINT}?type=year&date=${YEAR_DATE}")

if [ "$HTTP_CODE" = "200" ]; then
    print_success "Year export successful (HTTP 200)"
else
    print_error "Year export failed (HTTP $HTTP_CODE)"
fi

echo ""

# Test 5: Invalid filter type
echo "7. Testing invalid filter type (should fail)..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
    -H "Authorization: Bearer ${JWT_TOKEN}" \
    "${EXPORT_ENDPOINT}?type=invalid&date=2024-12-01T00:00:00.000Z")

if [ "$HTTP_CODE" = "400" ]; then
    print_success "Correctly rejected invalid filter type (HTTP 400)"
else
    print_error "Should have returned HTTP 400 for invalid type, got $HTTP_CODE"
fi

echo ""

# Test 6: Missing parameters
echo "8. Testing missing parameters (should fail)..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
    -H "Authorization: Bearer ${JWT_TOKEN}" \
    "${EXPORT_ENDPOINT}")

if [ "$HTTP_CODE" = "400" ]; then
    print_success "Correctly rejected missing parameters (HTTP 400)"
else
    print_error "Should have returned HTTP 400 for missing params, got $HTTP_CODE"
fi

echo ""

# Test 7: Unauthorized access
echo "9. Testing unauthorized access (should fail)..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
    "${EXPORT_ENDPOINT}?type=month&date=2024-12-01T00:00:00.000Z")

if [ "$HTTP_CODE" = "401" ] || [ "$HTTP_CODE" = "403" ]; then
    print_success "Correctly rejected unauthorized access (HTTP $HTTP_CODE)"
else
    print_error "Should have returned HTTP 401/403 for unauthorized, got $HTTP_CODE"
fi

echo ""
echo "=========================================="
echo "Test Summary"
echo "=========================================="

if [ -f "test_month_export.csv" ]; then
    echo ""
    print_info "Sample CSV content (first 2 lines):"
    echo ""
    head -n2 test_month_export.csv
    echo ""
    
    print_info "CSV files generated:"
    ls -lh test_*_export.csv 2>/dev/null || echo "None"
fi

echo ""
print_info "To clean up test files, run:"
echo "   rm test_*_export.csv"
echo ""
print_success "Testing complete!"
