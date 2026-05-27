/**
 * aiAnalysisService — AI 分析报告生成
 *
 * 基于真实技术指标生成自然语言分析报告
 *
 * 输入：
 *   - stockInfo   股票基本信息
 *   - quote       实时行情
 *   - klines      K 线数据数组
 *   - indicators  技术指标（MACD / 支撑压力位）
 *   - mas         MA 均线值 (ma5, ma10, ma20, ma60)
 *   - ocrPrice    OCR 识别的屏幕价格（可选，用于对比）
 *
 * 输出：自然人读的分析文本 + 操作建议
 */

class AIAnalysisService {

  /**
   * 主入口：生成完整分析报告
   *
   * @param {object} params
   * @param {object} params.stockInfo     - { code, name, marketName }
   * @param {object} params.quote         - { price, change, change_pct, volume, amount, turnover, preclose }
   * @param {Array}  params.klines        - K线数组
   * @param {object} params.indicators    - { macd, signal, histogram, support, resistance, crossover, crossover_type }
   * @param {object} params.mas           - { ma5, ma10, ma20, ma60 }
   * @param {number} params.ocrPrice      - OCR 识别的屏幕价格（可选）
   * @returns {{ analysis: string, recommendation: string, risk: string, keyPoints: string[] }}
   */
  static generateReport(params) {
    const {
      stockInfo = {},
      quote = {},
      klines = [],
      indicators = {},
      mas = {},
      ocrPrice = 0,
    } = params;

    const sections = [];
    const keyPoints = [];

    // ── 1. 基本信息 ──
    const name = stockInfo.name || quote.name || '未知股票';
    const code = stockInfo.code || quote.code || '000000';
    const marketName = stockInfo.marketName || '';
    const price = quote.price || 0;

    sections.push(`【${name}（${code}）${marketName}】`);

    if (price > 0) {
      const changeStr = quote.change_pct > 0
        ? `上涨 +${quote.change_pct.toFixed(2)}%`
        : quote.change_pct < 0
          ? `下跌 ${quote.change_pct.toFixed(2)}%`
          : '平盘';
      sections.push(`当前价格 ¥${price.toFixed(2)}，较昨日${changeStr}。`);

      if (quote.change_pct > 2) keyPoints.push('涨幅较大，短线注意回调风险');
      if (quote.change_pct < -2) keyPoints.push('跌幅较大，关注是否超跌反弹');
    }

    if (ocrPrice > 0 && price > 0) {
      const diff = ((price - ocrPrice) / ocrPrice * 100);
      if (Math.abs(diff) > 1) {
        sections.push(`⚠️ OCR 识别价格 ¥${ocrPrice.toFixed(2)} 与实时价格存在 ${diff > 0 ? '+' : ''}${diff.toFixed(1)}% 偏差，截图可能为历史行情。`);
      }
    }

    // ── 2. MA 均线分析 ──
    const maAnalysis = this._analyzeMA(price, mas);
    if (maAnalysis) {
      sections.push(maAnalysis.text);
      keyPoints.push(...maAnalysis.points);
    }

    // ── 3. MACD 分析 ──
    const macdAnalysis = this._analyzeMACD(indicators);
    if (macdAnalysis) {
      sections.push(macdAnalysis.text);
      keyPoints.push(...macdAnalysis.points);
    }

    // ── 4. 支撑压力位 ──
    const srAnalysis = this._analyzeSupportResistance(price, indicators);
    if (srAnalysis) {
      sections.push(srAnalysis.text);
      keyPoints.push(...srAnalysis.points);
    }

    // ── 5. 成交量分析 ──
    const volAnalysis = this._analyzeVolume(klines, quote);
    if (volAnalysis) {
      sections.push(volAnalysis.text);
      keyPoints.push(...volAnalysis.points);
    }

    // ── 6. 综合趋势判断 ──
    const trend = this._determineTrend(price, mas, indicators, klines);
    sections.push(trend.text);

    // ── 7. 操作建议 ──
    const recommendation = this._generateRecommendation(trend, indicators, mas, price);

    // 拼接
    const analysis = sections.filter(Boolean).join('\n\n');

    console.log(`🤖 [AI分析] ${name}: ${trend.bias} | ${recommendation}`);

    return {
      analysis,
      recommendation,
      risk: trend.risk,
      keyPoints,
    };
  }

  // ────────────────────────────────────────────
  // 子分析模块
  // ────────────────────────────────────────────

  /**
   * MA 均线分析
   */
  static _analyzeMA(price, mas) {
    const { ma5 = 0, ma10 = 0, ma20 = 0, ma60 = 0 } = mas;
    if (price <= 0) return null;

    const points = [];
    const lines = [];

    const checks = [
      { label: 'MA5', value: ma5, period: '5日' },
      { label: 'MA10', value: ma10, period: '10日' },
      { label: 'MA20', value: ma20, period: '20日' },
      { label: 'MA60', value: ma60, period: '60日' },
    ];

    // 价格与各均线关系
    let aboveCount = 0;
    let belowCount = 0;

    for (const { label, value, period } of checks) {
      if (value <= 0) continue;
      if (price > value) {
        aboveCount++;
      } else {
        belowCount++;
        lines.push(`当前股价位于 ${label}(${value.toFixed(2)}) 下方`);
      }
    }

    if (belowCount > aboveCount) {
      points.push('短期走势偏弱，股价承压');
    } else if (aboveCount > belowCount) {
      points.push('股价站上多条均线，短期偏强');
    }

    // 均线排列（多头/空头）
    if (ma5 > 0 && ma10 > 0 && ma20 > 0 && ma60 > 0) {
      if (ma5 > ma10 && ma10 > ma20 && ma20 > ma60) {
        points.push('均线呈多头排列，中期趋势向上');
      } else if (ma5 < ma10 && ma10 < ma20 && ma20 < ma60) {
        points.push('均线呈空头排列，中期趋势向下');
      } else {
        points.push('均线交叉缠绕，方向不明确');
      }
    }

    if (lines.length === 0 && points.length === 0) return null;

    return {
      text: `【均线分析】\n${lines.join('；')}${lines.length > 0 ? '。' : ''}`,
      points,
    };
  }

  /**
   * MACD 分析
   */
  static _analyzeMACD(indicators) {
    const { macd = 0, signal = 0, histogram = 0, crossover_type = 'none' } = indicators;
    const points = [];

    if (crossover_type === 'golden_cross') {
      points.push('MACD 金叉，短线看多信号');
    } else if (crossover_type === 'dead_cross') {
      points.push('MACD 死叉，短线看空信号');
    }

    if (histogram > 0) {
      points.push('MACD 柱状图为正，多头动能占优');
    } else if (histogram < 0) {
      points.push('MACD 柱状图为负，空头动能占优');
    }

    // DIF 与 DEA 位置
    if (macd > signal && macd > 0) {
      points.push('DIF 在零轴上方运行，强势区域');
    } else if (macd < signal && macd < 0) {
      points.push('DIF 在零轴下方运行，弱势区域');
    }

    if (points.length === 0) return null;

    return {
      text: `【MACD 指标】\nDIF ${macd.toFixed(2)} / DEA ${signal.toFixed(2)} / 柱 ${histogram.toFixed(2)}。${points[0]}`,
      points,
    };
  }

  /**
   * 支撑压力位分析
   */
  static _analyzeSupportResistance(price, indicators) {
    const { support = 0, resistance = 0 } = indicators;
    if (support <= 0 && resistance <= 0) return null;

    const lines = [];
    const points = [];

    if (support > 0) {
      const distToSupport = ((price - support) / support * 100);
      lines.push(`支撑位 ¥${support.toFixed(2)}（距当前 ${distToSupport.toFixed(1)}%）`);
      if (distToSupport < 3) {
        points.push(`股价逼近支撑位，若跌破则可能加速下行`);
      }
    }

    if (resistance > 0) {
      const distToResistance = ((resistance - price) / price * 100);
      lines.push(`压力位 ¥${resistance.toFixed(2)}（距当前 ${distToResistance.toFixed(1)}%）`);
      if (distToResistance < 3) {
        points.push(`股价逼近压力位，注意冲高回落风险`);
      }
    }

    return {
      text: `【关键价位】\n${lines.join('；')}。`,
      points,
    };
  }

  /**
   * 成交量分析
   */
  static _analyzeVolume(klines, quote) {
    if (!klines || klines.length < 10) return null;

    const recentVolumes = klines.slice(-10).map(k => k.volume || 0);
    const avgVolume = recentVolumes.reduce((a, b) => a + b, 0) / recentVolumes.length;
    const latestVolume = klines[klines.length - 1]?.volume || 0;

    if (avgVolume <= 0) return null;

    const ratio = latestVolume / avgVolume;
    const points = [];

    if (ratio > 2) {
      points.push('成交量显著放大，市场关注度提升');
    } else if (ratio < 0.5) {
      points.push('成交量萎缩，市场交投清淡');
    }

    if (points.length === 0) return null;

    return {
      text: `【成交量】\n近10日均量 ${(avgVolume / 10000).toFixed(0)} 万手，最新量 ${(latestVolume / 10000).toFixed(0)} 万手（${ratio > 1 ? '放量' : '缩量'} ${(ratio * 100).toFixed(0)}%）。${points[0]}`,
      points,
    };
  }

  /**
   * 综合趋势判断
   */
  static _determineTrend(price, mas, indicators, klines) {
    let bias = '震荡';
    let risk = '中等';

    const { crossover_type = 'none', histogram = 0 } = indicators;
    const { ma5 = 0, ma20 = 0, ma60 = 0 } = mas;

    let bullScore = 0;
    let bearScore = 0;

    // MA 信号
    if (price > ma5) bullScore++;
    else if (ma5 > 0) bearScore++;

    if (price > ma20) bullScore++;
    else if (ma20 > 0) bearScore++;

    if (ma5 > ma20 && ma5 > 0 && ma20 > 0) bullScore++;
    else if (ma20 > 0) bearScore++;

    // MACD 信号
    if (crossover_type === 'golden_cross') bullScore += 2;
    if (crossover_type === 'dead_cross') bearScore += 2;
    if (histogram > 0) bullScore++;
    else bearScore++;

    // 综合评分
    const diff = bullScore - bearScore;

    if (diff >= 3) {
      bias = '多头';
      risk = '较低';
    } else if (diff >= 1) {
      bias = '偏多';
      risk = '中等';
    } else if (diff <= -3) {
      bias = '空头';
      risk = '较高';
    } else if (diff <= -1) {
      bias = '偏空';
      risk = '中等偏高';
    }

    const priceRef = price > 0 ? `当前 ¥${price.toFixed(2)}` : '';

    return {
      bias,
      risk,
      text: `【综合判断】\n${priceRef}，综合技术指标显示市场呈「${bias}」格局，风险水平「${risk}」。`,
    };
  }

  /**
   * 操作建议
   */
  static _generateRecommendation(trend, indicators, mas, price) {
    const { bias } = trend;
    const { support = 0, resistance = 0 } = indicators;

    switch (bias) {
      case '多头':
        return `建议持有或逢低加仓，关注 ¥${resistance > 0 ? resistance.toFixed(2) : '--'} 压力位突破情况。`;
      case '偏多':
        return `短期偏多，可轻仓参与，严格设置止损于 ¥${support > 0 ? support.toFixed(2) : '--'} 下方。`;
      case '偏空':
        return `短期偏弱，建议减仓观望，等待企稳信号。关注 ¥${support > 0 ? support.toFixed(2) : '--'} 支撑位。`;
      case '空头':
        return `趋势偏空，建议回避或轻仓做空。若 ¥${support > 0 ? support.toFixed(2) : '--'} 支撑位失守，可能加速下行。`;
      default:
        return '市场方向不明，建议观望为主，等待趋势明朗。';
    }
  }
}

module.exports = AIAnalysisService;
