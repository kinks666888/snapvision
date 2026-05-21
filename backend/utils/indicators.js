/**
 * 技术指标计算模块
 * 包括：MACD、支撑位、压力位等指标
 */

class Indicators {
  /**
   * 计算简单移动平均线 (SMA)
   * @param {number[]} prices - 价格数组
   * @param {number} period - 周期
   */
  static sma(prices, period) {
    if (prices.length < period) return [];
    const result = [];
    for (let i = period - 1; i < prices.length; i++) {
      const sum = prices.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
      result.push(sum / period);
    }
    return result;
  }

  /**
   * 计算指数移动平均线 (EMA)
   * @param {number[]} prices - 价格数组
   * @param {number} period - 周期
   */
  static ema(prices, period) {
    if (prices.length < period) return [];
    const result = [];
    const multiplier = 2 / (period + 1);

    // 第一个 EMA = SMA
    let sma = prices.slice(0, period).reduce((a, b) => a + b, 0) / period;
    result.push(sma);

    // 后续 EMA = 上一个 EMA + 乘数 × (价格 - 上一个 EMA)
    for (let i = period; i < prices.length; i++) {
      const ema = prices[i] * multiplier + result[i - period] * (1 - multiplier);
      result.push(ema);
    }

    return result;
  }

  /**
   * 计算 MACD 指标
   * MACD = EMA(12) - EMA(26)
   * Signal = EMA(9) of MACD
   * Histogram = MACD - Signal
   * @param {number[]} prices - 收盘价数组
   */
  static macd(prices) {
    const ema12 = this.ema(prices, 12);
    const ema26 = this.ema(prices, 26);

    // MACD 线 (从 EMA26 的长度开始对齐)
    const macdLine = [];
    for (let i = ema12.length - ema26.length; i < ema12.length; i++) {
      macdLine.push(ema12[i] - ema26[i - (ema12.length - ema26.length)]);
    }

    // 信号线 (EMA9 of MACD)
    const signalLine = this.ema(macdLine, 9);

    // MACD 柱状图
    const histogram = [];
    for (let i = 0; i < signalLine.length; i++) {
      const macdIndex = macdLine.length - signalLine.length + i;
      histogram.push(macdLine[macdIndex] - signalLine[i]);
    }

    return {
      macd: macdLine[macdLine.length - 1] || 0,
      signal: signalLine[signalLine.length - 1] || 0,
      histogram: histogram[histogram.length - 1] || 0,
      macdLine,
      signalLine,
      histogram
    };
  }

  /**
   * 判断金叉/死叉
   * @param {Object} macdData - MACD 计算结果
   */
  static getCrossover(macdData) {
    const { macdLine, signalLine } = macdData;
    if (macdLine.length < 2 || signalLine.length < 2) {
      return { crossover: '无', type: 'none' };
    }

    const prevMacd = macdLine[macdLine.length - 2];
    const currMacd = macdLine[macdLine.length - 1];
    const prevSignal = signalLine[signalLine.length - 2];
    const currSignal = signalLine[signalLine.length - 1];

    // 金叉：MACD 从下穿上 Signal
    if (prevMacd <= prevSignal && currMacd > currSignal) {
      return { crossover: '金叉', type: 'golden_cross' };
    }

    // 死叉：MACD 从上穿下 Signal
    if (prevMacd >= prevSignal && currMacd < currSignal) {
      return { crossover: '死叉', type: 'dead_cross' };
    }

    return { crossover: '无', type: 'none' };
  }

  /**
   * 计算支撑位和压力位
   * 使用高低点突破法
   * @param {Object[]} klines - K线数据 [{high, low, close}, ...]
   */
  static getSupportResistance(klines) {
    if (klines.length < 5) {
      return { support: 0, resistance: 0 };
    }

    const closes = klines.map(k => k.close);
    const highs = klines.map(k => k.high);
    const lows = klines.map(k => k.low);

    // 最后 20 个周期的最高和最低
    const recentHighs = highs.slice(-20);
    const recentLows = lows.slice(-20);

    const maxHigh = Math.max(...recentHighs);
    const minLow = Math.min(...recentLows);
    const currentPrice = closes[closes.length - 1];

    // 支撑位：历史最低的附近，使用最近最低值
    const support = minLow;

    // 压力位：历史最高的附近，使用最近最高值
    const resistance = maxHigh;

    // 如果价格接近支撑或压力，调整到合理范围
    return {
      support: Math.round(support * 100) / 100,
      resistance: Math.round(resistance * 100) / 100
    };
  }

  /**
   * 生成分析建议
   */
  static generateAnalysis(klines, indicators) {
    const { macd, signal, histogram } = indicators;
    const closes = klines.map(k => k.close);
    const currentPrice = closes[closes.length - 1];

    let analysis = '';
    let recommendation = '中性';

    // 根据 MACD 判断
    if (histogram > 0) {
      analysis += 'MACD 柱状图为正，趋势向上。';
      recommendation = '看多';
    } else if (histogram < 0) {
      analysis += 'MACD 柱状图为负，趋势向下。';
      recommendation = '看空';
    } else {
      analysis += 'MACD 处于十字线附近，方向不明确。';
    }

    // 价格与支撑压力位关系
    const { support, resistance } = indicators;
    if (currentPrice < support * 1.05) {
      analysis += '股票价格接近支撑位，可能出现反弹。';
    }
    if (currentPrice > resistance * 0.95) {
      analysis += '股票价格接近压力位，可能面临回调。';
    }

    return { analysis, recommendation };
  }
}

module.exports = Indicators;
