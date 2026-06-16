/**
 * promptBuilder — 提示词构建器
 *
 * 职责：将结构化数据拼接为 AI 可读的上下文提示词
 * 用于后续接入 LLM 时作为 system prompt
 */

class PromptBuilder {

  /**
   * 构建完整分析上下文
   * @param {object} data — 统一数据结构
   * @returns {string} 中文提示词
   */
  static buildAnalysisPrompt(data) {
    const stock = data.stock || {};
    const indicators = data.indicators || {};
    const signals = data.signals || {};
    const market = data.market || {};

    const lines = [];

    lines.push('你是一个专业的A股技术分析助手。请基于以下数据给出分析：');
    lines.push('');

    // 基本信息
    lines.push(`【股票信息】`);
    lines.push(`名称：${stock.name || '未知'}（${stock.code || '--'}）`);
    lines.push(`最新价：¥${(stock.price || 0).toFixed(2)}`);
    lines.push(`涨跌幅：${(stock.change_percent || 0) > 0 ? '+' : ''}${(stock.change_percent || 0).toFixed(2)}%`);
    lines.push(`所属板块：${market.sector || '未知'}`);
    lines.push('');

    // 技术指标
    lines.push(`【技术指标】`);
    lines.push(`MA5: ${indicators.ma5?.toFixed(2) || '--'}  MA10: ${indicators.ma10?.toFixed(2) || '--'}`);
    lines.push(`MA20: ${indicators.ma20?.toFixed(2) || '--'}  MA60: ${indicators.ma60?.toFixed(2) || '--'}`);
    lines.push(`DIF: ${indicators.dif?.toFixed(3) || '--'}  DEA: ${indicators.dea?.toFixed(3) || '--'}  MACD: ${indicators.macd?.toFixed(3) || '--'}`);
    lines.push(`支撑位：¥${(indicators.support || 0).toFixed(2)}  压力位：¥${(indicators.resistance || 0).toFixed(2)}`);
    lines.push('');

    // 信号
    lines.push(`【信号引擎判断】`);
    lines.push(`趋势：${signals.trend || '--'}  信号强度：${signals.signal_strength || 50}/100`);
    lines.push(`风险等级：${signals.risk_level || '--'}`);
    if (signals.active_signals?.length) {
      lines.push(`活跃信号：${signals.active_signals.join('、')}`);
    }
    lines.push('');

    // 要求
    lines.push(`【分析要求】`);
    lines.push(`1. 判断当前多空格局`);
    lines.push(`2. 指出关键支撑/压力位`);
    lines.push(`3. 评估短期风险`);
    lines.push(`4. 给出操作建议（看多/看空/观望）`);
    lines.push(`5. 用中文回复，简洁专业，200字以内`);

    return lines.join('\n');
  }

  /**
   * 构建信号摘要提示词
   */
  static buildSignalSummary(signals) {
    return `当前信号强度 ${signals.signal_strength || 50}/100，` +
      `趋势为「${signals.trend || '未知'}」，` +
      `风险等级「${signals.risk_level || '未知'}」。`;
  }
}

module.exports = PromptBuilder;
