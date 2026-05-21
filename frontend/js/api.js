/**
 * 前端 API 客户端
 * 包含更完善的错误处理
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

class APIClient {
  /**
   * Upload image for analysis
   */
  static async analyzeImage(file) {
    try {
      // Validate file
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

      const response = await fetch(`${API_BASE_URL}/analyze`, {
        method: 'POST',
        body: formData,
        timeout: 30000
      });

      if (!response.ok) {
        let errorMessage = '分析失败，请重试';
        try {
          const error = await response.json();
          errorMessage = error.error || errorMessage;
        } catch (e) {
          // Response is not JSON
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Analysis error:', error);
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
      const params = new URLSearchParams({ limit, offset });
      const response = await fetch(`${API_BASE_URL}/history?${params}`);

      if (!response.ok) {
        throw new Error('获取历史记录失败');
      }

      const data = await response.json();
      return data;
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

      const response = await fetch(`${API_BASE_URL}/analysis/${id}`);

      if (!response.ok) {
        throw new Error('获取分析记录失败');
      }

      const data = await response.json();
      return data;
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

      const params = new URLSearchParams({ code: stockCode, limit });
      const response = await fetch(`${API_BASE_URL}/search?${params}`);

      if (!response.ok) {
        throw new Error('搜索失败');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Search error:', error);
      throw error;
    }
  }
}

