/**
 * 前端 API 客户端
 * 更稳的请求封装与返回值标准化
 */

// Auto-detect backend URL (support different ports)
const API_BASE_URL = (() => {
  let hostname = window.location.hostname;

  // If opened via file:// protocol, use localhost
  if (!hostname || hostname === '') {
    hostname = 'localhost';
  }

  const port = 5001; // Backend port
  return `http://${hostname}:${port}/api`;
})();

console.log('📡 API Base URL:', API_BASE_URL);

function toNumber(value, fallback = null) {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : fallback;
  }

  if (typeof value === 'string') {
    const cleaned = value
      .replace(/[￥,\s]/g, '')
      .replace(/%/g, '')
      .replace(/[^\d.-]/g, '');

    const n = Number(cleaned);
    return Number.isFinite(n) ? n : fallback;
  }

  return fallback;
}

function normalizeAnalysis(data) {
  if (!data || typeof data !== 'object') return data;

  return {
    ...data,
    price: toNumber(data.price, 0),
    change_percent: toNumber(data.change_percent, 0),
    support: toNumber(data.support, 0),
    resistance: toNumber(data.resistance, 0),
    macd: toNumber(data.macd, 0),
    signal: toNumber(data.signal, 0),
    macd_histogram: toNumber(data.macd_histogram, 0),
    kline: Array.isArray(data.kline) ? data.kline
      : Array.isArray(data.kline_data) ? data.kline_data
      : Array.isArray(data.klines) ? data.klines
      : [],
  };
}

async function fetchJson(url, options = {}, timeoutMs = 30000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });

    const contentType = response.headers.get('content-type') || '';
    const isJson = contentType.includes('application/json');

    if (!response.ok) {
      let errorMessage = `请求失败 (${response.status})`;

      if (isJson) {
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch (_) {}
      } else {
        try {
          const text = await response.text();
          if (text) errorMessage = text;
        } catch (_) {}
      }

      throw new Error(errorMessage);
    }

    if (isJson) {
      return await response.json();
    }

    return await response.text();
  } finally {
    clearTimeout(timer);
  }
}

class APIClient {
  /**
   * Upload image for analysis
   */
  static async analyzeImage(file) {
    try {
      if (!file) {
        throw new Error('请选择一个文件');
      }

      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        throw new Error(`文件大小不能超过 ${maxSize / 1024 / 1024}MB`);
      }

      const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        throw new Error('仅支持 JPEG、PNG、GIF、WebP 格式的图片');
      }

      const formData = new FormData();
      formData.append('file', file);

      const data = await fetchJson(`${API_BASE_URL}/analyze`, {
        method: 'POST',
        body: formData,
      }, 60000);

      return normalizeAnalysis(data);
    } catch (error) {
      console.error('Analysis error:', error);
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new Error('请求超时，请稍后重试');
      }
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('无法连接到服务器，请检查后端是否运行');
      }
      throw error;
    }
  }

  /**
   * Get analysis history
   */
  static async getHistory(limit = 10, offset = 0) {
    try {
      const params = new URLSearchParams({
        limit: String(limit),
        offset: String(offset),
      });

      const data = await fetchJson(`${API_BASE_URL}/history?${params}`);

      return {
        ...data,
        data: Array.isArray(data?.data) ? data.data.map(normalizeAnalysis) : [],
      };
    } catch (error) {
      console.error('History error:', error);
      throw new Error(error.message || '获取历史记录失败');
    }
  }

  /**
   * Get single analysis
   */
  static async getAnalysis(id) {
    try {
      if (!id) {
        throw new Error('分析 ID 无效');
      }

      const data = await fetchJson(`${API_BASE_URL}/analysis/${id}`);
      return normalizeAnalysis(data);
    } catch (error) {
      console.error('Get analysis error:', error);
      throw error;
    }
  }

  /**
   * Search by stock code
   */
  static async search(stockCode, limit = 10) {
    try {
      if (!stockCode) {
        throw new Error('请输入股票代码');
      }

      const params = new URLSearchParams({
        code: String(stockCode),
        limit: String(limit),
      });

      const data = await fetchJson(`${API_BASE_URL}/search?${params}`);
      return {
        ...data,
        data: Array.isArray(data?.data) ? data.data.map(normalizeAnalysis) : [],
      };
    } catch (error) {
      console.error('Search error:', error);
      throw error;
    }
  }
}

window.APIClient = APIClient;
