/**
 * K线解析和股票信息提取模块
 *
 * extractStockInfo — 从文件名提取股票代码（仍在使用：OCR fallback）
 *
 * ══════════════════════════════════════════
 * @deprecated 以下方法已由 marketService 替代：
 *   - generateMockKlines  → marketService.getKlineData
 *   - generateMockAnalysis → marketService.getStockInfo + getKlineData
 *   保留代码以备离线测试使用，生产环境不再调用
 * ══════════════════════════════════════════
 */

class KlineParser {
  /**
   * 从文件名提取股票代码
   * 例如: "600519_贵州茅台.png" -> {code: "600519", name: "贵州茅台"}
   */
  static extractStockInfo(filename) {
    // Try pattern: CODE_NAME.ext
    const match = filename.match(/^(\d{6})_(.+?)\./);
    if (match) {
      return {
        code: match[1],
        name: match[2]
      };
    }

    // Try pattern: CODE.ext (仅代码)
    const codeMatch = filename.match(/^(\d{6})/);
    if (codeMatch) {
      return {
        code: codeMatch[1],
        name: this.getStockName(codeMatch[1]) // 从模拟数据库获取名称
      };
    }

    // Default: 返回空信息
    return {
      code: 'UNKNOWN',
      name: 'Unknown Stock'
    };
  }

  /**
   * 根据股票代码获取名称（模拟数据）
   */
  static getStockName(code) {
    const stocks = {
      '600519': '贵州茅台',
      '000858': '五粮液',
      '601318': '中国平安',
      '000651': '格力电器',
      '601988': '中国银行',
      '000333': '美的集团',
      '000858': '五粮液',
      '600036': '招商银行'
    };
    return stocks[code] || `股票${code}`;
  }

  /**
   * 生成模拟 K 线数据
   * @deprecated 使用 marketService.getKlineData(code, days) 获取真实数据
   * @param {number} days - 生成天数
   * @param {number} startPrice - 起始价格
   */
  static generateMockKlines(days = 60, startPrice = 100) {
    const klines = [];
    let price = startPrice;

    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - (days - i - 1));
      const dateStr = date.toISOString().split('T')[0];

      // 随机涨跌
      const changePercent = (Math.random() - 0.5) * 4; // ±2%
      const open = price;
      const close = price * (1 + changePercent / 100);
      const high = Math.max(open, close) * (1 + Math.random() * 0.02);
      const low = Math.min(open, close) * (1 - Math.random() * 0.02);
      const volume = Math.floor(Math.random() * 10000000) + 5000000;

      klines.push({
        date: dateStr,
        open: Math.round(open * 100) / 100,
        high: Math.round(high * 100) / 100,
        low: Math.round(low * 100) / 100,
        close: Math.round(close * 100) / 100,
        volume
      });

      price = close;
    }

    return klines;
  }

  /**
   * 生成单个股票的分析数据（模拟）
   * @deprecated 使用 marketService.getStockInfo + getKlineData 获取真实数据
   */
  static generateMockAnalysis(stockCode, stockName) {
    const klines = this.generateMockKlines(60, 1500 + Math.random() * 500);
    const currentKline = klines[klines.length - 1];
    const previousKline = klines[klines.length - 2];

    const changePercent = parseFloat(
      (((currentKline.close - previousKline.close) / previousKline.close) * 100).toFixed(2)
    );

    return {
      stock_code: stockCode,
      stock_name: stockName,
      price: currentKline.close,
      change_percent: changePercent,
      klines
    };
  }
}

module.exports = KlineParser;
