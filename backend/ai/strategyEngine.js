/**
 * strategyEngine — 策略引擎
 *
 * 职责：
 *   1. 综合趋势 + 风险 → 生成操作倾向（看多/看空/观望）
 *   2. 置信度评分 (0-100)
 *   3. 止损/止盈建议价位
 *   4. 仓位建议
 *
 * 输入：trendAnalyzer + riskAnalyzer 结果 + 关键价位
 * 输出：{ bias, confidence, stopLoss, takeProfit, position, reasoning }
 */

class StrategyEngine {

  /**
   * 主入口
   * @param {object} trend   TrendAnalyzer.analyze() 输出
   * @param {object} risk    RiskAnalyzer.analyze() 输出
   * @param {object} params  { price, support, resistance, signalStrength }
   */
  static generate(trend, risk, params = {}) {
    const { price = 0, support = 0, resistance = 0, signalStrength = 50 } = params;

    // 趋势分数 (0-100, 50为中性)
    const trendScore = trend?.score ?? 50;
    // 风险分数 (0-100, 越高越危险)
    const riskScore = risk?.score ?? 30;

    // 综合置信度 = 趋势偏离度 - 风险惩罚
    const trendDeviation = Math.abs(trendScore - 50) * 2; // 0-100
    const riskPenalty = riskScore * 0.4;                   // 0-40
    let confidence = Math.round(trendDeviation - riskPenalty + (signalStrength - 50) * 0.3);
    confidence = Math.max(0, Math.min(100, confidence));

    // 操作倾向
    let bias = '观望';
    if (trendScore >= 65 && riskScore < 50) bias = '看多';
    else if (trendScore >= 55 && riskScore < 40) bias = '偏多';
    else if (trendScore <= 35 && riskScore > 40) bias = '看空';
    else if (trendScore <= 45 && riskScore > 30) bias = '偏空';

    // 止损位：支撑位下方 3%
    const stopLoss = support > 0 ? Math.round(support * 0.97 * 100) / 100 : 0;
    // 止盈位：压力位或当前价上方 10%
    const takeProfit = resistance > 0
      ? Math.round(resistance * 100) / 100
      : (price > 0 ? Math.round(price * 1.10 * 100) / 100 : 0);

    // 仓位建议
    let position = '轻仓';
    if (confidence >= 70 && riskScore < 40) position = '中等仓位';
    else if (confidence >= 60 && riskScore < 50) position = '轻仓';
    else if (confidence < 30 || riskScore > 60) position = '观望不参与';

    // 推理链
    const reasoning = [
      `趋势评分 ${trendScore}/100（${trend?.direction || '未知'}）`,
      `风险评分 ${riskScore}/100（${risk?.level || '未知'}）`,
      `综合置信度 ${confidence}/100`,
      `建议${bias}，${position}`,
    ].join(' → ');

    console.log(`🎯 [策略引擎] ${bias} | 置信度:${confidence} | ${position}`);

    return {
      bias,
      confidence,
      stopLoss,
      takeProfit,
      position,
      reasoning,
    };
  }
}

module.exports = StrategyEngine;
