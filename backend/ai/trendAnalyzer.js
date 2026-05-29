/**
 * trendAnalyzer — 趋势分析器
 *
 * 职责：
 *   1. MA 均线排列评分（多头/空头/缠绕）
 *   2. 价格趋势强度（线性回归斜率）
 *   3. 趋势分类（上升/下降/横盘 + 强度）
 *
 * 输入：价格、MA 值、K线收盘价序列
 * 输出：{ direction, strength, score, ma_alignment, signals }
 */

class TrendAnalyzer {

  /**
   * 主入口：综合分析趋势
   * @param {object} params
   * @param {number} params.price        当前价格
   * @param {object} params.mas         { ma5, ma10, ma20, ma60 }
   * @param {number[]} params.closes    收盘价序列（用于计算回归斜率）
   * @returns {{ direction, strength, score, ma_alignment, signals }}
   */
  static analyze(params) {
    const { price = 0, mas = {}, closes = [] } = params;

    // 1. MA 排列分析
    const maResult = this._analyzeMA(price, mas);

    // 2. 价格趋势（线性回归）
    const trendResult = this._analyzePriceTrend(closes);

    // 3. 综合评分
    const score = Math.round((maResult.score * 0.5) + (trendResult.score * 0.5));

    // 4. 汇总信号
    const signals = [...maResult.signals, ...trendResult.signals];

    // 5. 趋势判定
    let direction = '横盘';
    if (score >= 70) direction = '上升';
    else if (score >= 55) direction = '偏多震荡';
    else if (score >= 45) direction = '横盘';
    else if (score >= 30) direction = '偏空震荡';
    else direction = '下降';

    let strength = '弱';
    if (Math.abs(score - 50) >= 30) strength = '强';
    else if (Math.abs(score - 50) >= 15) strength = '中等';

    console.log(`📈 [趋势分析] 方向:${direction} 强度:${strength} 评分:${score}`);

    return {
      direction,
      strength,
      score,
      ma_alignment: maResult.alignment,
      signals,
    };
  }

  // ═══════════════════════════════════════
  // MA 均线分析
  // ═══════════════════════════════════════
  static _analyzeMA(price, mas) {
    const { ma5 = 0, ma10 = 0, ma20 = 0, ma60 = 0 } = mas;
    const signals = [];
    let score = 50;
    let alignment = '缠绕';

    if (price <= 0) return { score: 50, alignment: '未知', signals: [] };

    // 价格相对于各均线位置
    if (ma5 > 0 && price > ma5)   { score += 8;  signals.push('股价站上 MA5'); }
    else if (ma5 > 0)             { score -= 8;  signals.push('股价跌破 MA5'); }
    if (ma20 > 0 && price > ma20) { score += 7;  signals.push('股价站上 MA20'); }
    else if (ma20 > 0)            { score -= 7;  signals.push('股价跌破 MA20'); }
    if (ma60 > 0 && price > ma60) { score += 5; }
    else if (ma60 > 0)            { score -= 5; }

    // 均线排列判断
    const valid = [ma5, ma10, ma20, ma60].filter(v => v > 0);
    if (valid.length >= 3) {
      if (ma5 > ma10 && ma10 > ma20 && ma20 > ma60) {
        score += 12;
        alignment = '多头排列';
        signals.push('MA 多头排列');
      } else if (ma5 < ma10 && ma10 < ma20 && ma20 < ma60) {
        score -= 12;
        alignment = '空头排列';
        signals.push('MA 空头排列');
      } else if (ma5 > ma20 && ma10 > ma20) {
        alignment = '偏多';
        score += 4;
      } else if (ma5 < ma20 && ma10 < ma20) {
        alignment = '偏空';
        score -= 4;
      } else {
        alignment = '缠绕';
        signals.push('MA 交叉缠绕');
      }
    }

    return { score: Math.max(0, Math.min(100, score)), alignment, signals };
  }

  // ═══════════════════════════════════════
  // 价格趋势（线性回归）
  // ═══════════════════════════════════════
  static _analyzePriceTrend(closes) {
    const signals = [];
    let score = 50;

    if (!closes || closes.length < 5) {
      return { score, signals: [] };
    }

    const n = closes.length;
    const xMean = (n - 1) / 2;
    const yMean = closes.reduce((a, b) => a + b, 0) / n;

    let num = 0, den = 0;
    for (let i = 0; i < n; i++) {
      const dx = i - xMean;
      num += dx * (closes[i] - yMean);
      den += dx * dx;
    }

    const slope = den !== 0 ? num / den : 0;
    const pctSlope = yMean !== 0 ? (slope / yMean) * 100 * n : 0;

    if (pctSlope > 2) {
      score += 15;
      signals.push('价格趋势强劲上升');
    } else if (pctSlope > 1) {
      score += 8;
      signals.push('价格趋势温和上升');
    } else if (pctSlope < -2) {
      score -= 15;
      signals.push('价格趋势强劲下降');
    } else if (pctSlope < -1) {
      score -= 8;
      signals.push('价格趋势温和下降');
    } else {
      signals.push('价格趋势横盘整理');
    }

    return { score: Math.max(0, Math.min(100, score)), signals };
  }
}

module.exports = TrendAnalyzer;
