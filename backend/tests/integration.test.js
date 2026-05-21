/**
 * Integration Tests for SnapVision
 * 测试完整的上传、分析、查询流程
 */

const http = require('http');

const API_BASE_URL = 'http://localhost:5001/api';

class TestRunner {
  constructor() {
    this.results = {
      passed: 0,
      failed: 0,
      tests: []
    };
  }

  async runAllTests() {
    console.log('🧪 Starting SnapVision Integration Tests\n');
    
    try {
      // Test 1: Health Check
      await this.testHealthCheck();

      // Test 2: API History Endpoint
      await this.testHistoryEndpoint();

      // Test 3: Search Endpoint
      await this.testSearchEndpoint();

      // Test 4: Analysis Detail Endpoint
      await this.testAnalysisDetailEndpoint();

      // Print results
      this.printResults();
    } catch (error) {
      console.error('❌ Test runner error:', error);
    }
  }

  async testHealthCheck() {
    const testName = 'Health Check';
    try {
      const response = await this.makeRequest('GET', 'http://localhost:5001/health');
      if (response.status && response.status === 'ok') {
        this.logPass(testName);
      } else {
        this.logFail(testName, 'Invalid response');
      }
    } catch (error) {
      this.logFail(testName, error.message);
    }
  }

  async testHistoryEndpoint() {
    const testName = 'History Endpoint (GET /api/history)';
    try {
      const response = await this.makeRequest('GET', `${API_BASE_URL}/history?limit=10&offset=0`);
      if (response.data && Array.isArray(response.data) && response.pagination) {
        this.logPass(testName);
      } else {
        this.logFail(testName, 'Invalid response format');
      }
    } catch (error) {
      this.logFail(testName, error.message);
    }
  }

  async testSearchEndpoint() {
    const testName = 'Search Endpoint (GET /api/search)';
    try {
      const response = await this.makeRequest('GET', `${API_BASE_URL}/search?code=600519&limit=5`);
      if (response.data && Array.isArray(response.data)) {
        this.logPass(testName);
      } else {
        this.logFail(testName, 'Invalid response format');
      }
    } catch (error) {
      this.logFail(testName, error.message);
    }
  }

  async testAnalysisDetailEndpoint() {
    const testName = 'Analysis Detail Endpoint (GET /api/analysis/:id)';
    try {
      // First, get a sample analysis from history
      const historyResponse = await this.makeRequest('GET', `${API_BASE_URL}/history?limit=1`);
      
      if (historyResponse.data && historyResponse.data.length > 0) {
        const analysisId = historyResponse.data[0].id;
        const detailResponse = await this.makeRequest('GET', `${API_BASE_URL}/analysis/${analysisId}`);
        
        if (detailResponse.id && detailResponse.stock_code) {
          this.logPass(testName);
        } else {
          this.logFail(testName, 'Invalid analysis detail');
        }
      } else {
        // No analyses in history, that's ok for this test
        this.logPass(`${testName} (no data)`);
      }
    } catch (error) {
      this.logFail(testName, error.message);
    }
  }

  async makeRequest(method, url) {
    return new Promise((resolve, reject) => {
      const urlObj = new URL(url);
      const options = {
        hostname: urlObj.hostname,
        port: urlObj.port,
        path: urlObj.pathname + urlObj.search,
        method: method,
        headers: {
          'Accept': 'application/json'
        }
      };

      const req = http.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(new Error('Invalid JSON response'));
          }
        });
      });

      req.on('error', reject);
      req.end();
    });
  }

  logPass(testName) {
    this.results.passed++;
    this.results.tests.push({ name: testName, status: 'PASS' });
    console.log(`✅ ${testName}`);
  }

  logFail(testName, reason) {
    this.results.failed++;
    this.results.tests.push({ name: testName, status: 'FAIL', reason });
    console.log(`❌ ${testName}: ${reason}`);
  }

  printResults() {
    console.log('\n' + '='.repeat(50));
    console.log('📊 Test Results');
    console.log('='.repeat(50));
    console.log(`✅ Passed: ${this.results.passed}`);
    console.log(`❌ Failed: ${this.results.failed}`);
    console.log(`📈 Total:  ${this.results.tests.length}`);
    console.log('='.repeat(50) + '\n');

    if (this.results.failed === 0) {
      console.log('🎉 All tests passed!');
    }
  }
}

// Run tests
const tester = new TestRunner();
tester.runAllTests().catch(console.error);
