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
      histogramArray: histogram
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
   * 一次性计算多周期 MA（使用 SMA）
   * @param {number[]} prices - 收盘价数组
   * @returns {{ ma5: number, ma10: number, ma20: number, ma60: number }}
   */
  static calculateAllMA(prices) {
    const ma5Arr  = this.sma(prices, 5);
    const ma10Arr = this.sma(prices, 10);
    const ma20Arr = this.sma(prices, 20);
    const ma60Arr = this.sma(prices, 60);

    return {
      ma5:  ma5Arr.length  > 0 ? Math.round(ma5Arr[ma5Arr.length - 1] * 100) / 100   : 0,
      ma10: ma10Arr.length > 0 ? Math.round(ma10Arr[ma10Arr.length - 1] * 100) / 100 : 0,
      ma20: ma20Arr.length > 0 ? Math.round(ma20Arr[ma20Arr.length - 1] * 100) / 100 : 0,
      ma60: ma60Arr.length > 0 ? Math.round(ma60Arr[ma60Arr.length - 1] * 100) / 100 : 0,
    };
  }

  /**
   * 计算成交量均线（用于判断放量/缩量）
   * @param {number[]} volumes - 成交量数组
   * @param {number} period - 周期（默认 10）
   * @returns {number} 均量
   */
  static avgVolume(volumes, period = 10) {
    if (!volumes || volumes.length < period) return 0;
    const slice = volumes.slice(-period);
    const sum = slice.reduce((a, b) => a + b, 0);
    return Math.round(sum / period);
  }

  /**
   * 计算价格趋势强度
   * 通过线性回归斜率判断近期趋势方向与力度
   * @param {number[]} prices - 价格数组（最近 N 天）
   * @returns {{ slope: number, direction: string, strength: string }}
   */
  static priceTrend(prices) {
    if (!prices || prices.length < 5) {
      return { slope: 0, direction: '横盘', strength: '弱' };
    }

    const n = prices.length;
    const xMean = (n - 1) / 2;
    const yMean = prices.reduce((a, b) => a + b, 0) / n;

    let num = 0, den = 0;
    for (let i = 0; i < n; i++) {
      const dx = i - xMean;
      num += dx * (prices[i] - yMean);
      den += dx * dx;
    }

    const slope = den !== 0 ? num / den : 0;
    const pctSlope = yMean !== 0 ? (slope / yMean) * 100 * n : 0;

    let direction = '横盘';
    let strength = '弱';

    if (pctSlope > 1.5) {
      direction = '上升';
      strength = pctSlope > 3 ? '强' : '中等';
    } else if (pctSlope < -1.5) {
      direction = '下降';
      strength = pctSlope < -3 ? '强' : '中等';
    }

    return { slope, direction, strength };
  }

  /**
   * 生成分析建议（增强版）
   */
  static generateAnalysis(klines, indicators) {
    const { macd, signal, histogram } = indicators;
    const closes = klines.map(k => k.close);
    const currentPrice = closes[closes.length - 1];

    let analysis = '';
    let recommendation = '中性';

    // 根据 MACD 判断
    if (histogram > 0) {
      analysis += 'MACD 柱状图为正，多头动能占优。';
      recommendation = '看多';
    } else if (histogram < 0) {
      analysis += 'MACD 柱状图为负，空头动能占优。';
      recommendation = '看空';
    } else {
      analysis += 'MACD 处于零轴附近，方向不明确。';
    }

    // MACD 金叉/死叉
    if (indicators.crossover_type === 'golden_cross') {
      analysis += ' 出现金叉信号，短线看多。';
      recommendation = '看多';
    } else if (indicators.crossover_type === 'dead_cross') {
      analysis += ' 出现死叉信号，短线看空。';
      recommendation = '看空';
    }

    // 价格与支撑压力位关系
    const { support, resistance } = indicators;
    if (support > 0 && currentPrice < support * 1.05) {
      analysis += ` 股价 ¥${currentPrice.toFixed(2)} 接近支撑位 ¥${support.toFixed(2)}，关注支撑力度。`;
    }
    if (resistance > 0 && currentPrice > resistance * 0.95) {
      analysis += ` 股价 ¥${currentPrice.toFixed(2)} 接近压力位 ¥${resistance.toFixed(2)}，注意回调风险。`;
    }

    return { analysis, recommendation };
  }
}

module.exports = Indicators;
