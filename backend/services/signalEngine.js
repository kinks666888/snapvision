/**
 * Signal Engine — 多因子 AI 信号引擎
 *
 * 将原始技术指标转换为标准化信号对象：
 *   trend, signal_strength (0-100), risk_level, active signals, summary
 *
 * 评分因子（各 0-100 分）：
 *   1. MA 排列  — 价格与多周期均线关系
 *   2. MACD     — 动量方向 + 金叉/死叉
 *   3. 量价关系 — 放量/缩量与价格方向
 *   4. 关键价位 — 支撑/压力位距离
 *   5. 趋势强度 — 线性回归斜率
 *   6. 背离检测 — 价格与 MACD 柱背离
 */

class SignalEngine {

  // ═══════════════════════════════════════════
  // 主入口
  // ═══════════════════════════════════════════

  /**
   * @param {object} params
   * @param {number} params.price          当前价格
   * @param {number} params.change_pct     涨跌幅
   * @param {object} params.mas           { ma5, ma10, ma20, ma60 }
   * @param {number} params.macd          MACD DIF 线
   * @param {number} params.signal        MACD 信号线
   * @param {number} params.histogram     MACD 柱状图
   * @param {string} params.crossover_type 'golden_cross'|'dead_cross'|'none'
   * @param {number} params.support       支撑位
   * @param {number} params.resistance    压力位
   * @param {string} params.trend_dir     趋势方向 '上升'|'下降'|'横盘'
   * @param {string} params.trend_strength 趋势强度 '强'|'中等'|'弱'
   * @param {Array}  params.klines        K 线数组 (用于量价分析+背离)
   * @param {number} params.latest_volume 最新成交量
   * @param {number} params.avg_volume    均量
   * @returns {{ trend, signal_strength, risk_level, signals, summary, factors }}
   */
  static generate(params) {
    const p = { price:0, change_pct:0, mas:{}, macd:0, signal:0, histogram:0,
      crossover_type:'none', support:0, resistance:0,
      trend_dir:'横盘', trend_strength:'弱', klines:[], latest_volume:0, avg_volume:0,
      ...params };

    const factors = {};

    // 逐个因子评分
    factors.ma       = this._scoreMA(p.price, p.mas);
    factors.macd     = this._scoreMACD(p.macd, p.signal, p.histogram, p.crossover_type);
    factors.volume   = this._scoreVolume(p.price, p.change_pct, p.klines, p.latest_volume, p.avg_volume);
    factors.keyLevel = this._scoreKeyLevels(p.price, p.support, p.resistance);
    factors.trend    = this._scoreTrend(p.trend_dir, p.trend_strength);
    factors.divergence = this._scoreDivergence(p.price, p.histogram, p.klines);

    // 汇总信号列表
    const allSignals = [];
    for (const f of Object.values(factors)) {
      if (f.signals) allSignals.push(...f.signals);
    }

    // 加权总分 (MA 25%, MACD 25%, Volume 15%, KeyLevels 10%, Trend 15%, Divergence 10%)
    const weights = { ma:25, macd:25, volume:15, keyLevel:10, trend:15, divergence:10 };
    let totalScore = 0, totalWeight = 0;
    for (const [key, w] of Object.entries(weights)) {
      if (factors[key]) {
        totalScore += factors[key].score * w;
        totalWeight += w;
      }
    }
    const signalStrength = totalWeight > 0
      ? Math.round(totalScore / totalWeight)
      : 50;

    // 趋势判定
    const trend = this._classifyTrend(signalStrength, factors);

    // 风险等级
    const riskLevel = this._classifyRisk(signalStrength, factors, p);

    // 生成中文摘要
    const summary = this._buildSummary(trend, signalStrength, riskLevel, factors, p);

    console.log(`📡 [SignalEngine] 趋势:${trend} 强度:${signalStrength} 风险:${riskLevel} | ${allSignals.length}个信号`);

    return {
      trend,
      signal_strength: signalStrength,
      risk_level: riskLevel,
      signals: allSignals,
      summary,
      factors: {
        ma:        { score: factors.ma.score,        label: 'MA排列',    weight: weights.ma },
        macd:      { score: factors.macd.score,      label: 'MACD动量',  weight: weights.macd },
        volume:    { score: factors.volume.score,    label: '量价关系',  weight: weights.volume },
        keyLevel:  { score: factors.keyLevel.score,  label: '关键价位',  weight: weights.keyLevel },
        trend:     { score: factors.trend.score,     label: '趋势强度',  weight: weights.trend },
        divergence:{ score: factors.divergence.score,label: '背离检测',  weight: weights.divergence },
      }
    };
  }

  // ═══════════════════════════════════════════
  // 因子 1: MA 排列评分
  // ═══════════════════════════════════════════
  static _scoreMA(price, mas) {
    const { ma5=0, ma10=0, ma20=0, ma60=0 } = mas;
    if (price <= 0) return { score: 50, signals: [] };

    const signals = [];
    let score = 50;

    // 价格相对于各均线
    if (ma5 > 0 && price > ma5)  { score += 8;  signals.push('股价站上 MA5'); }
    else if (ma5 > 0)            { score -= 8;  signals.push('股价跌破 MA5'); }
    if (ma20 > 0 && price > ma20){ score += 7;  signals.push('股价站上 MA20'); }
    else if (ma20 > 0)           { score -= 7;  signals.push('股价跌破 MA20'); }
    if (ma60 > 0 && price > ma60){ score += 5;  /* 长周期不单独发信号 */ }
    else if (ma60 > 0)           { score -= 5; }

    // 均线排列
    const valid = [ma5, ma10, ma20, ma60].filter(v => v > 0);
    if (valid.length >= 3) {
      if (ma5 > ma10 && ma10 > ma20) {
        score += 12;
        signals.push('MA 多头排列');
      } else if (ma5 < ma10 && ma10 < ma20) {
        score -= 12;
        signals.push('MA 空头排列');
      } else {
        // 交叉缠绕
        score -= 3;
        signals.push('MA 交叉缠绕');
      }
    }

    // MA5 与 MA10 金叉/死叉
    if (ma5 > 0 && ma10 > 0 && ma20 > 0) {
      // 短期上穿中期
      if (ma5 > ma20 && price > ma5) {
        signals.push('短期均线突破中期均线');
        score += 5;
      }
    }

    return { score: Math.max(0, Math.min(100, score)), signals };
  }

  // ═══════════════════════════════════════════
  // 因子 2: MACD 动量评分
  // ═══════════════════════════════════════════
  static _scoreMACD(dif, dea, histogram, crossoverType) {
    const signals = [];
    let score = 50;

    // 柱状图方向
    if (histogram > 0.05)        { score += 10; signals.push('MACD 柱转正'); }
    else if (histogram < -0.05)  { score -= 10; signals.push('MACD 柱转负'); }
    else if (Math.abs(histogram) > 0.02) {
      // 柱在缩小但仍为正/负
      if (histogram > 0) { score += 5; }
      else { score -= 5; }
    }

    // DIF 位置
    if (dif > 0 && dif > dea)    { score += 8;  signals.push('DIF 零轴上方向好'); }
    else if (dif > 0 && dif < dea){ score += 2; }
    else if (dif < 0 && dif < dea){ score -= 8;  signals.push('DIF 零轴下方向差'); }
    else if (dif < 0 && dif > dea){ score -= 3; }

    // 金叉/死叉
    if (crossoverType === 'golden_cross') {
      score += 15;
      signals.push('MACD 金叉');
    } else if (crossoverType === 'dead_cross') {
      score -= 15;
      signals.push('MACD 死叉');
    }

    // DIF 远离零轴（超买/超卖）
    if (Math.abs(dif) > 5) {
      if (dif > 5)  { score -= 5; signals.push('DIF 高位超买'); }
      else          { score += 5; signals.push('DIF 低位超卖'); }
    }

    return { score: Math.max(0, Math.min(100, score)), signals };
  }

  // ═══════════════════════════════════════════
  // 因子 3: 量价关系评分
  // ═══════════════════════════════════════════
  static _scoreVolume(price, changePct, klines, latestVol, avgVol) {
    const signals = [];
    let score = 50;
    if (avgVol <= 0 || !klines || klines.length < 5) return { score, signals };

    const volRatio = latestVol / avgVol;

    // 放量/缩量
    if (volRatio > 2.0) {
      score += 8;
      signals.push('成交量显著放大');
    } else if (volRatio > 1.3) {
      score += 3;
    } else if (volRatio < 0.5) {
      score -= 3;
      signals.push('成交量萎缩');
    }

    // 量价配合
    const isUp = changePct > 0;
    if (volRatio > 1.3 && isUp) {
      score += 7;
      signals.push('放量上涨');
    } else if (volRatio > 1.3 && !isUp) {
      score -= 7;
      signals.push('放量下跌');
    } else if (volRatio < 0.6 && isUp) {
      score -= 4;
      signals.push('缩量上涨（动能不足）');
    } else if (volRatio < 0.6 && !isUp) {
      score += 4;
      signals.push('缩量下跌（抛压减弱）');
    }

    // 近5日量趋势
    if (klines.length >= 5) {
      const recent5Vol = klines.slice(-5).map(k => k.volume || 0);
      const vol5Avg = recent5Vol.reduce((a,b)=>a+b,0)/5;
      if (latestVol > vol5Avg * 1.5) {
        score += 3;
      }
    }

    // 连续放量
    if (klines.length >= 3) {
      const last3 = klines.slice(-3).map(k => k.volume || 0);
      const allAboveAvg = last3.every(v => v > avgVol);
      if (allAboveAvg) {
        signals.push('连续3日放量');
        score += 5;
      }
    }

    return { score: Math.max(0, Math.min(100, score)), signals };
  }

  // ═══════════════════════════════════════════
  // 因子 4: 关键价位评分
  // ═══════════════════════════════════════════
  static _scoreKeyLevels(price, support, resistance) {
    const signals = [];
    let score = 50;
    if (price <= 0) return { score, signals };

    if (support > 0) {
      const dist = (price - support) / support * 100;
      if (dist < 3) {
        score -= 10;
        signals.push(`逼近支撑位 ¥${support.toFixed(2)}`);
      } else if (dist < 8) {
        score -= 3;
      } else {
        score += 5;
      }
    }

    if (resistance > 0) {
      const dist = (resistance - price) / price * 100;
      if (dist < 3) {
        score += 5;
        signals.push(`逼近压力位 ¥${resistance.toFixed(2)}`);
      } else if (dist < 8) {
        score += 2;
      } else {
        score += 3;
      }
    }

    return { score: Math.max(0, Math.min(100, score)), signals };
  }

  // ═══════════════════════════════════════════
  // 因子 5: 趋势强度评分
  // ═══════════════════════════════════════════
  static _scoreTrend(direction, strength) {
    const signals = [];
    let score = 50;

    if (direction === '上升') {
      if (strength === '强')        { score += 15; signals.push('趋势强劲上升'); }
      else if (strength === '中等') { score += 8;  signals.push('趋势温和上升'); }
      else                          { score += 3; }
    } else if (direction === '下降') {
      if (strength === '强')        { score -= 15; signals.push('趋势强劲下降'); }
      else if (strength === '中等') { score -= 8;  signals.push('趋势温和下降'); }
      else                          { score -= 3; }
    } else {
      signals.push('趋势横盘整理');
    }

    return { score: Math.max(0, Math.min(100, score)), signals };
  }

  // ═══════════════════════════════════════════
  // 因子 6: 背离检测
  // ═══════════════════════════════════════════
  static _scoreDivergence(price, histogram, klines) {
    const signals = [];
    let score = 50;
    if (!klines || klines.length < 10) return { score, signals };

    // 简化背离检测：比较近5日价格趋势与 MACD 柱趋势
    const recent5 = klines.slice(-5);
    const price5Ago = recent5[0]?.close || price;
    const priceNow = recent5[recent5.length - 1]?.close || price;

    // 需要 MACD 柱历史数据 — 这里用 K 线收盘价近似
    // 真正的背离需要 MACD 柱序列，由 Indicators.macd() 返回
    // 这里做简化版：价格新高/新低 vs 趋势方向

    const priceUp = priceNow > price5Ago;
    const macdUp = histogram > 0;

    // 顶背离：价格涨 + MACD 柱变弱/转负
    if (priceUp && histogram < -0.1) {
      score -= 12;
      signals.push('⚠ 量价背离（价格涨 MACD 转弱）');
    }
    // 底背离：价格跌 + MACD 柱转强/转正
    else if (!priceUp && histogram > 0.1) {
      score += 12;
      signals.push('★ 底背离（价格跌 MACD 转强）');
    }
    // 同步
    else if (priceUp && histogram > 0.1) {
      score += 5;
    } else if (!priceUp && histogram < -0.1) {
      score -= 5;
    }

    return { score: Math.max(0, Math.min(100, score)), signals };
  }

  // ═══════════════════════════════════════════
  // 趋势分类
  // ═══════════════════════════════════════════
  static _classifyTrend(strength, factors) {
    if (strength >= 75) return 'bullish';
    if (strength >= 55) return 'mildly_bullish';
    if (strength >= 45) return 'neutral';
    if (strength >= 25) return 'mildly_bearish';
    return 'bearish';
  }

  // ═══════════════════════════════════════════
  // 风险分类
  // ═══════════════════════════════════════════
  static _classifyRisk(strength, factors, params) {
    // 高波动 = 高风险
    const volatility = Math.abs(params.change_pct || 0);
    const nearSupport = params.support > 0 && ((params.price - params.support) / params.support) < 0.03;
    const nearResist  = params.resistance > 0 && ((params.resistance - params.price) / params.price) < 0.03;

    if (strength < 30 || (volatility > 8) || (nearSupport && strength < 50)) return 'high';
    if (strength < 45 || volatility > 4 || nearSupport || nearResist) return 'medium';
    if (strength < 60) return 'medium';
    return 'low';
  }

  // ═══════════════════════════════════════════
  // 中文摘要
  // ═══════════════════════════════════════════
  static _buildSummary(trend, strength, risk, factors, params) {
    const trendMap = {
      bullish: '多头强势', mildly_bullish: '偏多震荡', neutral: '方向不明',
      mildly_bearish: '偏空承压', bearish: '空头主导'
    };
    const riskMap = { low: '风险较低', medium: '风险中等', high: '风险较高' };

    const lines = [];
    lines.push(`当前信号强度 ${strength}/100，市场呈「${trendMap[trend] || trend}」格局，${riskMap[risk] || risk}。`);

    // 挑选最重要的 3 个信号说明
    const topSignals = this._topSignals(factors, 3);
    if (topSignals.length > 0) {
      lines.push(`核心信号：${topSignals.join('；')}。`);
    }

    // 操作倾向
    if (strength >= 70) {
      lines.push('短线动能充足，可顺势持仓，关注上方压力突破。');
    } else if (strength >= 55) {
      lines.push('短线偏强，但需防范回踩，适合轻仓参与。');
    } else if (strength >= 40) {
      lines.push('方向不明确，建议观望为主，等待趋势明朗。');
    } else {
      lines.push('短线偏弱，建议控制仓位，关注下方支撑力度。');
    }

    return lines.join(' ');
  }

  static _topSignals(factors, n) {
    const priority = [];
    for (const f of Object.values(factors)) {
      if (f.signals) priority.push(...f.signals);
    }
    // 去重 + 去带有 ⚠/★ 前缀的二次信号
    const unique = [...new Set(priority)].filter(s =>
      !s.startsWith('⚠') && !s.startsWith('★')
    );
    return unique.slice(0, n);
  }
}

module.exports = SignalEngine;
