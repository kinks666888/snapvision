/**
 * signalEngine — AI 信号引擎（重构版）
 *
 * 编排 TrendAnalyzer + RiskAnalyzer + MACD/量价/背离评分
 * 输出统一信号对象
 */

const TrendAnalyzer = require('./trendAnalyzer');
const RiskAnalyzer = require('./riskAnalyzer');

class SignalEngine {

  static generate(params) {
    const p = {
      price: 0, change_pct: 0, mas: {},
      macd: 0, signal: 0, histogram: 0,
      crossover_type: 'none', support: 0, resistance: 0,
      klines: [], latest_volume: 0, avg_volume: 0,
      ...params
    };

    // ── 1. 趋势分析 ──
    const closes = p.klines.map(k => k.close).filter(v => v > 0);
    const trend = TrendAnalyzer.analyze({
      price: p.price, mas: p.mas, closes,
    });

    // ── 2. 风险分析 ──
    const risk = RiskAnalyzer.analyze({
      price: p.price, changePct: p.change_pct,
      support: p.support, resistance: p.resistance,
      histogram: p.histogram, crossoverType: p.crossover_type,
      latestVol: p.latest_volume, avgVol: p.avg_volume, klines: p.klines,
    });

    // ── 3. MACD 动量评分 ──
    const macdFactor = _scoreMACD(p.macd, p.signal, p.histogram, p.crossover_type);

    // ── 4. 量价关系评分 ──
    const volumeFactor = _scoreVolume(p.price, p.change_pct, p.klines, p.latest_volume, p.avg_volume);

    // ── 5. 背离检测 ──
    const divergenceFactor = _scoreDivergence(p.price, p.histogram, p.klines);

    // ── 6. 加权综合分数 ──
    const weights = { trend: 30, macd: 25, volume: 15, risk: 15, divergence: 15 };
    let totalScore = 0;
    totalScore += trend.score * weights.trend;
    totalScore += macdFactor.score * weights.macd;
    totalScore += volumeFactor.score * weights.volume;
    totalScore += (100 - risk.score) * weights.risk; // 风险=低分好，反转
    totalScore += divergenceFactor.score * weights.divergence;
    const signalStrength = Math.round(totalScore / 100);

    // ── 7. 汇总信号 ──
    const allSignals = [
      ...trend.signals,
      ...macdFactor.signals,
      ...volumeFactor.signals,
      ...divergenceFactor.signals,
    ];

    // ── 8. 趋势分类 ──
    const signalTrend = _classifyTrend(signalStrength);

    // ── 9. 摘要 ──
    const summary = _buildSummary(signalTrend, signalStrength, risk.level, allSignals);

    console.log(`📡 [信号引擎] ${signalTrend} | 强度:${signalStrength} | 风险:${risk.level}`);

    return {
      trend: signalTrend,
      signal_strength: signalStrength,
      risk_level: risk.level,
      signals: allSignals,
      summary,
      factors: {
        trend:      { score: trend.score,       label: '趋势分析', weight: weights.trend },
        macd:       { score: macdFactor.score,  label: 'MACD动量', weight: weights.macd },
        volume:     { score: volumeFactor.score,label: '量价关系', weight: weights.volume },
        risk:       { score: risk.score,        label: '风险评估', weight: weights.risk },
        divergence: { score: divergenceFactor.score, label: '背离检测', weight: weights.divergence },
      }
    };
  }
}

// ═══════════════════════════════════════
// MACD 动量评分
// ═══════════════════════════════════════
function _scoreMACD(dif, dea, histogram, crossoverType) {
  const signals = [];
  let score = 50;

  if (histogram > 0.05)        { score += 10; signals.push('MACD 柱转正'); }
  else if (histogram < -0.05)  { score -= 10; signals.push('MACD 柱转负'); }

  if (crossoverType === 'golden_cross') {
    score += 15; signals.push('MACD 金叉');
  } else if (crossoverType === 'dead_cross') {
    score -= 15; signals.push('MACD 死叉');
  }

  if (dif > 0 && dif > dea)    { score += 8; signals.push('DIF 零轴上方向好'); }
  else if (dif < 0 && dif < dea){ score -= 8; signals.push('DIF 零轴下方向差'); }

  if (Math.abs(dif) > 5) {
    if (dif > 5)  { score -= 5; signals.push('DIF 高位超买'); }
    else          { score += 5; signals.push('DIF 低位超卖'); }
  }

  return { score: Math.max(0, Math.min(100, score)), signals };
}

// ═══════════════════════════════════════
// 量价关系评分
// ═══════════════════════════════════════
function _scoreVolume(price, changePct, klines, latestVol, avgVol) {
  const signals = [];
  let score = 50;
  if (avgVol <= 0) return { score, signals };

  const volRatio = latestVol / avgVol;
  const isUp = changePct > 0;

  if (volRatio > 2.0) { score += 8; signals.push('成交量显著放大'); }
  else if (volRatio < 0.5) { score -= 3; signals.push('成交量萎缩'); }

  if (volRatio > 1.3 && isUp)      { score += 7; signals.push('放量上涨'); }
  else if (volRatio > 1.3 && !isUp){ score -= 7; signals.push('放量下跌'); }
  else if (volRatio < 0.6 && isUp) { score -= 4; signals.push('缩量上涨（动能不足）'); }
  else if (volRatio < 0.6 && !isUp){ score += 4; signals.push('缩量下跌（抛压减弱）'); }

  return { score: Math.max(0, Math.min(100, score)), signals };
}

// ═══════════════════════════════════════
// 背离检测
// ═══════════════════════════════════════
function _scoreDivergence(price, histogram, klines) {
  const signals = [];
  let score = 50;
  if (!klines || klines.length < 5) return { score, signals };

  const recent5 = klines.slice(-5);
  const priceNow = recent5[recent5.length - 1]?.close || price;
  const price5Ago = recent5[0]?.close || price;
  const priceUp = priceNow > price5Ago;

  if (priceUp && histogram < -0.1)       { score -= 12; signals.push('⚠ 顶背离'); }
  else if (!priceUp && histogram > 0.1)  { score += 12; signals.push('★ 底背离'); }
  else if (priceUp && histogram > 0.1)   { score += 5; }
  else if (!priceUp && histogram < -0.1) { score -= 5; }

  return { score: Math.max(0, Math.min(100, score)), signals };
}

// ═══════════════════════════════════════
// 趋势分类 + 摘要
// ═══════════════════════════════════════
function _classifyTrend(strength) {
  if (strength >= 70) return 'bullish';
  if (strength >= 55) return 'mildly_bullish';
  if (strength >= 45) return 'neutral';
  if (strength >= 30) return 'mildly_bearish';
  return 'bearish';
}

function _buildSummary(trend, strength, riskLevel, signals) {
  const trendMap = {
    bullish: '多头强势', mildly_bullish: '偏多震荡', neutral: '方向不明',
    mildly_bearish: '偏空承压', bearish: '空头主导'
  };
  const unique = [...new Set(signals)].slice(0, 3);
  const signalStr = unique.length > 0 ? `核心信号：${unique.join('；')}。` : '';
  let advice = '';
  if (strength >= 70)      advice = '短线动能充足，可顺势持仓。';
  else if (strength >= 55) advice = '短线偏强，适合轻仓参与。';
  else if (strength >= 40) advice = '方向不明确，建议观望。';
  else                     advice = '短线偏弱，建议控制仓位。';

  return `信号强度 ${strength}/100，市场呈「${trendMap[trend] || trend}」格局，风险${riskLevel}。${signalStr} ${advice}`;
}

module.exports = SignalEngine;
