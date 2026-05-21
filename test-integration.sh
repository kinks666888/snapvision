#!/bin/bash

# SnapVision Integration Test Suite
# 完整的集成测试

set -e

echo "🧪 SnapVision Integration Test Suite"
echo "======================================"
echo ""

# Test Configuration
BACKEND_URL="http://localhost:5001"
FRONTEND_URL="http://localhost:3000"
TEST_PORT=5001
FRONTEND_PORT=3000

# Test Results
TESTS_PASSED=0
TESTS_FAILED=0

# Helper function for test logging
test_passed() {
    echo "✅ $1"
    TESTS_PASSED=$((TESTS_PASSED + 1))
}

test_failed() {
    echo "❌ $1"
    TESTS_FAILED=$((TESTS_FAILED + 1))
}

# Test 1: Check if backend is running
echo "Test 1: Backend Health Check"
if curl -s "$BACKEND_URL/health" > /dev/null 2>&1; then
    test_passed "Backend is running on port $TEST_PORT"
else
    test_failed "Backend is NOT running on port $TEST_PORT"
    echo "Starting backend..."
    cd /Users/mac/Desktop/snapvision/backend
    PORT=5001 npm start > /tmp/backend.log 2>&1 &
    sleep 5
fi

# Test 2: Check if frontend is running
echo ""
echo "Test 2: Frontend Health Check"
if curl -s "$FRONTEND_URL/" | grep -q "SnapVision"; then
    test_passed "Frontend is running on port $FRONTEND_PORT"
else
    test_failed "Frontend is NOT running on port $FRONTEND_PORT"
    echo "Starting frontend..."
    cd /Users/mac/Desktop/snapvision/frontend
    python3 -m http.server $FRONTEND_PORT > /tmp/frontend.log 2>&1 &
    sleep 3
fi

# Test 3: API History Endpoint
echo ""
echo "Test 3: API History Endpoint"
if curl -s "$BACKEND_URL/api/history?limit=1" | grep -q "data"; then
    test_passed "History endpoint works"
else
    test_failed "History endpoint failed"
fi

# Test 4: API Search Endpoint
echo ""
echo "Test 4: API Search Endpoint"
if curl -s "$BACKEND_URL/api/search?code=600519" | grep -q "data"; then
    test_passed "Search endpoint works"
else
    test_failed "Search endpoint failed"
fi

# Test 5: Database exists
echo ""
echo "Test 5: Database File"
if [ -f "/Users/mac/Desktop/snapvision/backend/db/snapvision.db" ]; then
    test_passed "Database file exists"
else
    test_failed "Database file NOT found"
fi

# Test 6: Project structure
echo ""
echo "Test 6: Project Structure"
required_files=(
    "/Users/mac/Desktop/snapvision/backend/server.js"
    "/Users/mac/Desktop/snapvision/backend/package.json"
    "/Users/mac/Desktop/snapvision/frontend/index.html"
    "/Users/mac/Desktop/snapvision/frontend/js/api.js"
    "/Users/mac/Desktop/snapvision/frontend/js/app.js"
    "/Users/mac/Desktop/snapvision/frontend/js/chart.js"
    "/Users/mac/Desktop/snapvision/README.md"
)

for file in "${required_files[@]}"; do
    if [ -f "$file" ]; then
        test_passed "Required file: $(basename $file)"
    else
        test_failed "Missing file: $file"
    fi
done

# Test 7: Frontend page loads
echo ""
echo "Test 7: Frontend Page Content"
HTML_CONTENT=$(curl -s "$FRONTEND_URL/")
if echo "$HTML_CONTENT" | grep -q "upload-zone"; then
    test_passed "Upload zone element exists"
else
    test_failed "Upload zone element NOT found"
fi

if echo "$HTML_CONTENT" | grep -q "TailwindCSS"; then
    test_passed "TailwindCSS is loaded"
else
    test_failed "TailwindCSS NOT loaded"
fi

if echo "$HTML_CONTENT" | grep -q "Chart.js"; then
    test_passed "Chart.js is loaded"
else
    test_failed "Chart.js NOT loaded"
fi

# Print Summary
echo ""
echo "======================================"
echo "📊 Test Summary"
echo "======================================"
echo "✅ Passed: $TESTS_PASSED"
echo "❌ Failed: $TESTS_FAILED"
echo "📈 Total:  $((TESTS_PASSED + TESTS_FAILED))"
echo "======================================"

if [ $TESTS_FAILED -eq 0 ]; then
    echo ""
    echo "🎉 All tests passed!"
    echo ""
    echo "SnapVision is ready to use:"
    echo "📖 Frontend: $FRONTEND_URL"
    echo "📡 Backend:  $BACKEND_URL"
    exit 0
else
    echo ""
    echo "⚠️  Some tests failed. Please check the errors above."
    exit 1
fi
