/**
 * 主应用模块
 * 增强的错误处理和用户体验
 */

let currentAnalysis = null;
let currentHistoryPage = 0;
const HISTORY_LIMIT = 10;

// DOM Elements
const uploadZone = document.getElementById('upload-zone');
const fileInput = document.getElementById('file-input');
const fileInfo = document.getElementById('file-info');
const fileName = document.getElementById('file-name');
const resultSection = document.getElementById('result-section');
const loadingState = document.getElementById('loading-state');
const errorState = document.getElementById('error-state');
const errorMessage = document.getElementById('error-message');
const historySection = document.getElementById('history-section');
const uploadSection = document.getElementById('upload-section');

// Initialize event listeners
document.addEventListener('DOMContentLoaded', () => {
  setupUploadZone();
  setupGlobalErrorHandler();
  loadHistory();
});

/**
 * Global error handler for debugging
 */
function setupGlobalErrorHandler() {
  window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
  });

  window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
  });
}

/**
 * Setup upload zone drag and drop
 */
function setupUploadZone() {
  uploadZone.addEventListener('click', () => fileInput.click());

  uploadZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadZone.classList.add('drag-over');
  });

  uploadZone.addEventListener('dragleave', () => {
    uploadZone.classList.remove('drag-over');
  });

  uploadZone.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadZone.classList.remove('drag-over');
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  });

  fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      handleFileSelect(e.target.files[0]);
    }
  });
}

/**
 * Handle file selection with enhanced validation
 */
async function handleFileSelect(file) {
  try {
    // Validate file
    if (!file.type.startsWith('image/')) {
      throw new Error('请选择图片文件 (JPG, PNG, GIF, WebP)');
    }

    if (file.size > 10485760) {
      throw new Error('文件大小不能超过 10MB');
    }

    // Show file info
    fileName.textContent = file.name;
    fileInfo.classList.remove('hidden');

    // Show loading state
    showLoading();

    // Upload and analyze
    const analysis = await APIClient.analyzeImage(file);
    currentAnalysis = analysis;
    
    // Display results
    displayAnalysisResults(analysis);
    showResults();
  } catch (error) {
    console.error('File selection error:', error);
    showError(error.message || '分析失败，请重试');
  }
}

/**
 * Display analysis results
 */
function displayAnalysisResults(analysis) {
  // Stock info
  document.getElementById('stock-name').textContent = analysis.stock_name;
  document.getElementById('stock-code').textContent = `代码: ${analysis.stock_code}`;
  document.getElementById('current-price').textContent = `¥${ChartManager.formatPrice(analysis.price)}`;
  
  const changePercent = analysis.change_percent;
  const changeElement = document.getElementById('change-percent');
  changeElement.textContent = `${changePercent > 0 ? '+' : ''}${changePercent}%`;
  changeElement.className = `text-lg font-semibold ${changePercent > 0 ? 'text-red-600' : 'text-green-600'}`;

  // Indicators
  document.getElementById('support-value').textContent = `¥${ChartManager.formatPrice(analysis.support)}`;
  document.getElementById('resistance-value').textContent = `¥${ChartManager.formatPrice(analysis.resistance)}`;
  
  document.getElementById('macd-value').textContent = analysis.macd.toFixed(4);
  document.getElementById('signal-value').textContent = analysis.signal.toFixed(4);
  document.getElementById('histogram-value').textContent = analysis.macd_histogram.toFixed(4);

  // Crossover badge
  const crossoverBadge = document.getElementById('crossover-badge');
  crossoverBadge.textContent = analysis.crossover;
  if (analysis.crossover_type === 'golden_cross') {
    crossoverBadge.className = 'inline-block px-3 py-1 rounded-full text-sm font-semibold bg-green-100 text-green-800';
  } else if (analysis.crossover_type === 'dead_cross') {
    crossoverBadge.className = 'inline-block px-3 py-1 rounded-full text-sm font-semibold bg-red-100 text-red-800';
  } else {
    crossoverBadge.className = 'inline-block px-3 py-1 rounded-full text-sm font-semibold bg-gray-100 text-gray-800';
  }

  // Recommendation badge
  const recommendationBadge = document.getElementById('recommendation-badge');
  recommendationBadge.textContent = analysis.recommendation;
  if (analysis.recommendation === '看多') {
    recommendationBadge.className = 'inline-block px-3 py-1 rounded-full text-sm font-semibold bg-red-100 text-red-800';
  } else if (analysis.recommendation === '看空') {
    recommendationBadge.className = 'inline-block px-3 py-1 rounded-full text-sm font-semibold bg-green-100 text-green-800';
  } else {
    recommendationBadge.className = 'inline-block px-3 py-1 rounded-full text-sm font-semibold bg-yellow-100 text-yellow-800';
  }

  // Analysis text
  document.getElementById('analysis-text').textContent = analysis.analysis;

  // Draw chart
  ChartManager.drawKlineChart(analysis.kline);
}

/**
 * Show results section
 */
function showResults() {
  resultSection.classList.remove('hidden', 'fade-in');
  resultSection.classList.add('fade-in');
  loadingState.classList.add('hidden');
  errorState.classList.add('hidden');
}

/**
 * Show loading state
 */
function showLoading() {
  loadingState.classList.remove('hidden');
  resultSection.classList.add('hidden');
  errorState.classList.add('hidden');
}

/**
 * Show error state
 */
function showError(message) {
  errorMessage.textContent = message;
  errorState.classList.remove('hidden');
  resultSection.classList.add('hidden');
  loadingState.classList.add('hidden');
}

/**
 * Reset upload form
 */
function resetUpload() {
  fileInput.value = '';
  fileInfo.classList.add('hidden');
  resultSection.classList.add('hidden');
  loadingState.classList.add('hidden');
  errorState.classList.add('hidden');
  currentAnalysis = null;
}

/**
 * Load and display history
 */
async function loadHistory(page = 0) {
  try {
    const offset = page * HISTORY_LIMIT;
    const result = await APIClient.getHistory(HISTORY_LIMIT, offset);
    
    const historyList = document.getElementById('history-list');
    
    if (result.data.length === 0) {
      historyList.innerHTML = '<p class="text-gray-600 text-center py-8">暂无分析历史</p>';
      document.getElementById('pagination').innerHTML = '';
      return;
    }

    // Display history items
    historyList.innerHTML = result.data.map(item => `
      <div class="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition fade-in" 
           onclick="viewHistoryDetail('${item.id}')">
        <div class="flex justify-between items-start">
          <div>
            <h3 class="font-semibold text-gray-900">${item.stock_name}</h3>
            <p class="text-sm text-gray-600">代码: ${item.stock_code}</p>
            <p class="text-sm text-gray-600 mt-1">价格: ¥${ChartManager.formatPrice(item.price)}</p>
          </div>
          <div class="text-right">
            <div class="text-lg font-bold ${item.change_percent > 0 ? 'text-red-600' : 'text-green-600'}">
              ${item.change_percent > 0 ? '+' : ''}${item.change_percent}%
            </div>
            <div class="inline-block px-2 py-1 rounded text-xs font-semibold mt-2
                      ${item.crossover_type === 'golden_cross' ? 'bg-green-100 text-green-800' : 
                        item.crossover_type === 'dead_cross' ? 'bg-red-100 text-red-800' : 
                        'bg-gray-100 text-gray-800'}">
              ${item.crossover}
            </div>
            <p class="text-xs text-gray-500 mt-2">${new Date(item.created_at).toLocaleDateString()}</p>
          </div>
        </div>
      </div>
    `).join('');

    // Pagination
    const totalPages = Math.ceil(result.pagination.total / HISTORY_LIMIT);
    const pagination = document.getElementById('pagination');
    
    let paginationHtml = '';
    for (let i = 0; i < totalPages; i++) {
      paginationHtml += `
        <button 
          onclick="loadHistory(${i})" 
          class="px-3 py-1 rounded ${i === page ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-900 hover:bg-gray-300'} transition"
        >
          ${i + 1}
        </button>
      `;
    }
    pagination.innerHTML = paginationHtml;
    
    currentHistoryPage = page;
  } catch (error) {
    const historyList = document.getElementById('history-list');
    historyList.innerHTML = `<p class="text-red-600 text-center py-8">加载失败: ${error.message}</p>`;
  }
}

/**
 * View history detail
 */
async function viewHistoryDetail(id) {
  try {
    const analysis = await APIClient.getAnalysis(id);
    currentAnalysis = analysis;
    
    displayAnalysisResults(analysis);
    showSection('upload');
    
    // Scroll to results
    setTimeout(() => {
      resultSection.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  } catch (error) {
    alert('加载分析详情失败: ' + error.message);
  }
}

/**
 * Show/hide sections
 */
function showSection(section) {
  if (section === 'upload') {
    uploadSection.classList.remove('hidden');
    historySection.classList.add('hidden');
  } else if (section === 'history') {
    uploadSection.classList.add('hidden');
    historySection.classList.remove('hidden');
    loadHistory(0); // Reload history
  }
}

/**
 * Download report as JSON
 */
function downloadReport() {
  if (!currentAnalysis) return;

  const dataStr = JSON.stringify(currentAnalysis, null, 2);
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(dataBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${currentAnalysis.stock_code}_${currentAnalysis.stock_name}_report.json`;
  link.click();
  URL.revokeObjectURL(url);
}
