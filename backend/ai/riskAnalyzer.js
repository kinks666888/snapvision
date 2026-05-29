/**
 * riskAnalyzer — 风险分析器
 *
 * 职责：
 *   1. 多因子风险评估（波动率、关键价位距离、MACD状态、量价异常）
 *   2. 风险等级分类（低/中等/较高）
 *   3. 风险因素明细
 *
 * 输入：价格、涨跌幅、支撑/压力位、MACD、成交量、K线
 * 输出：{ level, score, factors }
 */

class RiskAnalyzer {

  /**
   * 主入口
   * @returns {{ level: string, score: number, factors: object }}
   */
  static analyze(params) {
    const {
      price = 0, changePct = 0,
      support = 0, resistance = 0,
      histogram = 0, crossoverType = 'none',
      latestVol = 0, avgVol = 0, klines = [],
    } = params;

    const factors = {};

    // 1. 波动率风险（涨跌幅越大，风险越高）
    factors.volatility = this._scoreVolatility(changePct);

    // 2. 关键价位风险（逼近支撑/压力位）
    factors.keyLevel = this._scoreKeyLevelRisk(price, support, resistance);

    // 3. MACD 风险（柱转负、死叉）
    factors.macd = this._scoreMACDRisk(histogram, crossoverType);

    // 4. 量价异常风险
    factors.volume = this._scoreVolumeRisk(changePct, latestVol, avgVol);

    // 5. 加权总分（波动率 30%、关键价位 25%、MACD 25%、量价 20%）
    let totalScore = 0;
    totalScore += factors.volatility.score * 30;
    totalScore += factors.keyLevel.score * 25;
    totalScore += factors.macd.score * 25;
    totalScore += factors.volume.score * 20;
    const score = Math.round(totalScore / 100);

    // 风险等级（分数越高 = 风险越大）
    let level = '低';
    if (score >= 70) level = '高';
    else if (score >= 45) level = '中等';
    else if (score >= 25) level = '较低';

    console.log(`⚠️ [风险分析] 等级:${level} 评分:${score}`);

    return { level, score, factors };
  }

  // ── 波动率风险 ──
  static _scoreVolatility(changePct) {
    const absPct = Math.abs(changePct || 0);
    let score = 20;
    if (absPct > 8)       { score = 90; }
    else if (absPct > 5)  { score = 70; }
    else if (absPct > 3)  { score = 50; }
    else if (absPct > 1)  { score = 30; }
    else                  { score = 15; }
    return { score, detail: `涨跌幅 ${changePct > 0 ? '+' : ''}${(changePct || 0).toFixed(2)}%` };
  }

  // ── 关键价位风险 ──
  static _scoreKeyLevelRisk(price, support, resistance) {
    let score = 30;
    const details = [];

    if (support > 0 && price > 0) {
      const dist = ((price - support) / support) * 100;
      if (dist < 2)       { score += 30; details.push('紧贴支撑位'); }
      else if (dist < 5)  { score += 15; details.push('接近支撑位'); }
    }
    if (resistance > 0 && price > 0) {
      const dist = ((resistance - price) / price) * 100;
      if (dist < 2)       { score += 20; details.push('逼近压力位'); }
      else if (dist < 5)  { score += 10; details.push('接近压力位'); }
    }
    if (details.length === 0) details.push('距关键价位较远');

    return { score: Math.min(100, score), detail: details.join('；') };
  }

  // ── MACD 风险 ──
  static _scoreMACDRisk(histogram, crossoverType) {
    let score = 30;
    const details = [];

    if (crossoverType === 'dead_cross')  { score += 30; details.push('MACD 死叉'); }
    else if (crossoverType === 'golden_cross') { score -= 15; details.push('MACD 金叉'); }
    if (histogram < -0.1)  { score += 15; details.push('MACD 柱转负'); }
    else if (histogram > 0.1) { score -= 10; details.push('MACD 柱为正'); }
    if (details.length === 0) details.push('MACD 中性');

    return { score: Math.max(5, Math.min(100, score)), detail: details.join('；') };
  }

  // ── 量价异常风险 ──
  static _scoreVolumeRisk(changePct, latestVol, avgVol) {
    let score = 20;
    const details = [];

    if (avgVol > 0 && latestVol > 0) {
      const ratio = latestVol / avgVol;
      if (ratio > 3)  { score += 25; details.push('异常放量'); }
      else if (ratio > 2 && changePct < 0) { score += 20; details.push('放量下跌'); }
      else if (ratio > 2) { score += 10; details.push('显著放量'); }
      else if (ratio < 0.3) { score += 15; details.push('极度缩量'); }
      else { details.push('量能正常'); }
    } else {
      details.push('量能数据不足');
    }

    return { score: Math.min(100, score), detail: details.join('；') };
  }
}

module.exports = RiskAnalyzer;
