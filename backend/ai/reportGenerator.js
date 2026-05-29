/**
 * reportGenerator — 分析报告生成器
 *
 * 职责：
 *   1. 生成自然语言分析报告（中文）
 *   2. 综合趋势、风险、策略结果
 *   3. 输出统一格式的 analysis + recommendation
 *
 * 注意：当前为规则引擎版本，后续可替换为 LLM 调用
 */

const PromptBuilder = require('./promptBuilder');

class ReportGenerator {

  /**
   * 主入口：生成完整分析报告
   * @param {object} data — 统一数据结构 { stock, indicators, market, signals, strategy }
   * @returns {{ analysis, recommendation, risk, keyPoints }}
   */
  static generate(data) {
    const stock = data.stock || {};
    const indicators = data.indicators || {};
    const signals = data.signals || {};
    const market = data.market || {};
    const strategy = data.strategy || {};

    const sections = [];
    const keyPoints = [];

    const name = stock.name || '未知股票';
    const code = stock.code || '--';
    const price = stock.price || 0;
    const changePct = stock.change_percent || 0;

    // ── 1. 基本信息 ──
    const marketName = market.sector || '';
    sections.push(`【${name}（${code}）${marketName}】`);

    if (price > 0) {
      const changeStr = changePct > 0 ? `上涨 +${changePct.toFixed(2)}%`
        : changePct < 0 ? `下跌 ${changePct.toFixed(2)}%` : '平盘';
      sections.push(`当前价格 ¥${price.toFixed(2)}，较昨日${changeStr}。`);
    }

    // ── 2. 均线分析 ──
    const maSection = _analyzeMA(price, indicators);
    if (maSection) {
      sections.push(maSection.text);
      if (maSection.points) keyPoints.push(...maSection.points);
    }

    // ── 3. MACD 分析 ──
    const macdSection = _analyzeMACD(indicators);
    if (macdSection) {
      sections.push(macdSection.text);
      if (macdSection.points) keyPoints.push(...macdSection.points);
    }

    // ── 4. 关键价位 ──
    const srSection = _analyzeSupportResistance(price, indicators);
    if (srSection) {
      sections.push(srSection.text);
      if (srSection.points) keyPoints.push(...srSection.points);
    }

    // ── 5. 信号引擎摘要 ──
    if (signals.summary) {
      sections.push(`【信号引擎】\n${signals.summary}`);
    }

    // ── 6. 策略建议 ──
    if (strategy.reasoning) {
      sections.push(`【策略建议】\n${strategy.reasoning}`);
    }

    // ── 7. 操作建议 ──
    const recommendation = _generateRecommendation(signals, strategy, price, indicators);

    // 拼接最终报告
    const analysis = sections.filter(Boolean).join('\n\n');

    console.log(`📝 [报告生成] ${name}: ${signals.trend || '未知'} | ${recommendation}`);

    return {
      analysis,
      recommendation,
      risk: signals.risk_level || '中等',
      keyPoints,
    };
  }
}

// ═══════════════════════════════════════
// 子分析模块
// ═══════════════════════════════════════

function _analyzeMA(price, ind) {
  const { ma5 = 0, ma10 = 0, ma20 = 0, ma60 = 0 } = ind;
  if (price <= 0) return null;

  const points = [];
  const lines = [];

  if (ma5 > 0 && price < ma5)    lines.push(`当前股价位于 MA5(${ma5.toFixed(2)}) 下方`);
  if (ma20 > 0 && price < ma20)  lines.push(`当前股价位于 MA20(${ma20.toFixed(2)}) 下方`);
  if (ma60 > 0 && price < ma60)  lines.push(`当前股价位于 MA60(${ma60.toFixed(2)}) 下方`);

  if (ma5 > ma10 && ma10 > ma20 && ma60 > 0) points.push('均线呈多头排列，中期趋势向上');
  else if (ma5 < ma10 && ma10 < ma20 && ma60 > 0) points.push('均线呈空头排列，中期趋势向下');

  if (lines.length === 0 && points.length === 0) return null;

  return {
    text: `【均线分析】\n${lines.join('；')}${lines.length > 0 ? '。' : ''}`,
    points,
  };
}

function _analyzeMACD(ind) {
  const { dif = 0, dea = 0, macd = 0, crossover_type = 'none' } = ind;
  const points = [];

  if (crossover_type === 'golden_cross')     points.push('MACD 金叉，短线看多信号');
  else if (crossover_type === 'dead_cross')  points.push('MACD 死叉，短线看空信号');
  if (macd > 0) points.push('MACD 柱状图为正，多头动能占优');
  else if (macd < 0) points.push('MACD 柱状图为负，空头动能占优');

  if (points.length === 0) return null;

  return {
    text: `【MACD 指标】\nDIF ${dif.toFixed(2)} / DEA ${dea.toFixed(2)} / 柱 ${macd.toFixed(2)}。${points[0]}`,
    points,
  };
}

function _analyzeSupportResistance(price, ind) {
  const { support = 0, resistance = 0 } = ind;
  if (support <= 0 && resistance <= 0) return null;

  const lines = [];
  if (support > 0) lines.push(`支撑位 ¥${support.toFixed(2)}`);
  if (resistance > 0) lines.push(`压力位 ¥${resistance.toFixed(2)}`);

  return { text: `【关键价位】\n${lines.join('；')}。`, points: [] };
}

function _generateRecommendation(signals, strategy, price, indicators) {
  const bias = strategy.bias || '观望';
  const support = indicators.support || 0;
  const resistance = indicators.resistance || 0;

  switch (bias) {
    case '看多':
      return `建议持有或逢低加仓，关注 ¥${resistance > 0 ? resistance.toFixed(2) : '--'} 压力位突破情况。`;
    case '偏多':
      return `短期偏多，可轻仓参与，严格设置止损于 ¥${support > 0 ? support.toFixed(2) : '--'} 下方。`;
    case '偏空':
      return `短期偏弱，建议减仓观望，等待企稳信号。关注 ¥${support > 0 ? support.toFixed(2) : '--'} 支撑位。`;
    case '看空':
      return `趋势偏空，建议回避。若 ¥${support > 0 ? support.toFixed(2) : '--'} 支撑位失守，可能加速下行。`;
    default:
      return '市场方向不明，建议观望为主，等待趋势明朗。';
  }
}

module.exports = ReportGenerator;
