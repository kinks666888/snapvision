import type { AnalysisResponse, RegionType } from './api';

// ─── Safe number helpers ───────────────────────────────────────
function safeNum(value: unknown, fallback = 0): number {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

// ─── Three-layer analysis types ────────────────────────────────

export type TrendDirection = '上涨' | '震荡' | '下跌';
export type RiskLevel = '低' | '中' | '高';
export type Suggestion =
  | '继续持有，趋势向好'
  | '可关注回踩机会'
  | '继续观察'
  | '暂不建议操作'
  | '暂不建议追高'
  | '建议观望';

export interface SpeedRead {
  aiScore: number;          // 0-100
  trend: TrendDirection;
  riskLevel: RiskLevel;
  suggestion: Suggestion;
  oneLineSummary: string;   // 一句话人话总结
}

export interface ExplanationItem {
  icon: string;             // emoji or symbol
  summary: string;          // one-line plain-language summary
}

export interface ProfessionalDetail {
  regionType: RegionType;
  regionIndex: number;
  pattern: string;
  confidence: number;
  cached: boolean;
}

export interface IndicatorCard {
  id: string;
  category: string;
  icon: string;
  term: string;
  plainText: string;
  visualHint: 'up' | 'down' | 'flat' | 'caution' | 'unknown';
  status: 'positive' | 'neutral' | 'negative' | 'limited';
  dataAvailable: boolean;
}

export interface SynthesizedAnalysis {
  speedRead: SpeedRead;
  explanations: ExplanationItem[];
  professionalDetails: ProfessionalDetail[];
  indicatorCards: IndicatorCard[];
  regionCount: number;
  errorCount: number;
  allErrors: string[];
}

// ─── Pattern scoring maps ──────────────────────────────────────

const KLINE_PATTERN_SCORE: Record<string, number> = {
  '阳线': 70,
  '大阳线': 80,
  '锤子线': 60,
  '倒锤子': 55,
  '吞没形态': 65,
  '十字星': 45,
  '阴线': 30,
  '大阴线': 20,
};

const KLINE_PATTERN_TREND: Record<string, TrendDirection> = {
  '阳线': '上涨',
  '大阳线': '上涨',
  '锤子线': '上涨',
  '倒锤子': '上涨',
  '十字星': '震荡',
  '阴线': '下跌',
  '大阴线': '下跌',
  '吞没形态': '震荡',
};

const KLINE_PATTERN_RISK: Record<string, RiskLevel> = {
  '阳线': '低',
  '大阳线': '低',
  '锤子线': '中',
  '倒锤子': '中',
  '吞没形态': '高',
  '十字星': '高',
  '阴线': '中',
  '大阴线': '高',
};

const MACD_SIGNAL_SCORE: Record<string, number> = {
  '金叉': 75,
  '死叉': 25,
  '无': 50,
};

const MACD_SIGNAL_TREND: Record<string, TrendDirection> = {
  '金叉': '上涨',
  '死叉': '下跌',
  '无': '震荡',
};

const MACD_SIGNAL_RISK: Record<string, RiskLevel> = {
  '金叉': '低',
  '死叉': '高',
  '无': '中',
};

// ─── Plain-language explanations ───────────────────────────────

function klineExplanation(pattern: string): string {
  const explanations: Record<string, string> = {
    '阳线': '当前 K 线收阳，说明买盘在当天占据主导，短期情绪偏强',
    '大阳线': '出现大阳线，买盘非常强势，价格明显推高，短期动能较强',
    '阴线': '当前 K 线收阴，说明卖盘在当天占据主导，短期情绪偏弱',
    '大阴线': '出现大阴线，卖盘力量明显，价格遭遇较大抛压',
    '锤子线': '出现锤子线形态，下影线较长，说明下方有较强支撑，可能止跌企稳',
    '倒锤子': '出现倒锤子线形态，上影线较长，上方有一定压力，需观察后续确认',
    '十字星': '出现十字星形态，多空双方力量相当，市场处于犹豫状态',
    '吞没形态': '出现吞没形态，趋势可能发生反转，需结合更多信号判断',
  };
  return explanations[pattern] || `检测到 ${pattern} 形态，建议结合其他指标综合判断`;
}

function macdExplanation(signal: string): string {
  const explanations: Record<string, string> = {
    '金叉': 'MACD 出现金叉，短期均线上穿长期均线，说明买盘力量在增强，趋势可能转向上涨',
    '死叉': 'MACD 出现死叉，短期均线下穿长期均线，说明卖盘力量在增强，趋势可能转向下跌',
    '无': 'MACD 信号中性，短期未出现明显的金叉或死叉信号，趋势延续震荡',
  };
  return explanations[signal] || `MACD 信号: ${signal}`;
}

// ─── Suggestion logic ──────────────────────────────────────────

function deriveSuggestion(score: number, trend: TrendDirection, risk: RiskLevel): Suggestion {
  if (score >= 75 && trend === '上涨' && risk === '低') {
    return '继续持有，趋势向好';
  }
  if (score >= 60 && trend === '上涨') {
    return '可关注回踩机会';
  }
  if (score >= 40 && trend === '震荡') {
    return '继续观察';
  }
  if (score < 40 && trend === '震荡') {
    return '暂不建议操作';
  }
  if (score < 50 && trend === '下跌') {
    return '建议观望';
  }
  if (trend === '下跌' && risk === '高') {
    return '暂不建议追高';
  }
  return '继续观察';
}

// ─── One-line summary ──────────────────────────────────────────

function getOneLineSummary(score: number, trend: TrendDirection, risk: RiskLevel): string {
  const scoreText = score >= 70 ? '走势较强' : score >= 40 ? '走势中性' : '走势偏弱';
  const riskText = risk === '低' ? '风险可控' : risk === '中' ? '有一定风险' : '风险偏高';
  if (trend === '上涨' && risk === '低') return `${scoreText}，${riskText}，短期看好`;
  if (trend === '上涨') return `${scoreText}，${riskText}，上涨中注意回踩`;
  if (trend === '下跌') return `${scoreText}，${riskText}，建议等待企稳信号`;
  return `${scoreText}，${riskText}，方向不明朗，继续观察`;
}

// ─── Indicator cards generation ─────────────────────────────────

export function generateIndicatorCards(
  klinePatterns: string[],
  macdSignals: string[],
  finalTrend: TrendDirection,
  finalRisk: RiskLevel,
): IndicatorCard[] {
  const cards: IndicatorCard[] = [];

  // 1. 均线趋势 (MA)
  cards.push({
    id: 'ma',
    category: '趋势',
    icon: '📊',
    term: finalTrend === '上涨' ? 'MA 多头排列' : finalTrend === '下跌' ? 'MA 空头排列' : 'MA 粘合',
    plainText: finalTrend === '上涨'
      ? '短期均线在长期均线之上，价格处于上升通道，趋势偏强'
      : finalTrend === '下跌'
        ? '短期均线在长期均线之下，价格处于下降通道，趋势偏弱'
        : '均线交织，价格在区间内波动，方向不明朗',
    visualHint: finalTrend === '上涨' ? 'up' : finalTrend === '下跌' ? 'down' : 'flat',
    status: finalTrend === '上涨' ? 'positive' : finalTrend === '下跌' ? 'negative' : 'neutral',
    dataAvailable: true,
  });

  // 2. MACD 信号
  if (macdSignals.length > 0) {
    const hasGolden = macdSignals.some(s => s === '金叉');
    const hasDead = macdSignals.some(s => s === '死叉');
    const signal = hasGolden ? '金叉' : hasDead ? '死叉' : '无';
    cards.push({
      id: 'macd',
      category: '动能',
      icon: '⚡',
      term: `MACD ${signal}`,
      plainText: hasGolden
        ? '短期均线上穿长期均线，买盘力量增强，动能向上'
        : hasDead
          ? '短期均线下穿长期均线，卖盘力量增强，动能向下'
          : 'MACD 信号中性，暂未出现明确的金叉或死叉',
      visualHint: hasGolden ? 'up' : hasDead ? 'down' : 'flat',
      status: hasGolden ? 'positive' : hasDead ? 'negative' : 'neutral',
      dataAvailable: true,
    });
  } else {
    cards.push({
      id: 'macd',
      category: '动能',
      icon: '⚡',
      term: 'MACD 信号',
      plainText: '未检测到 MACD 区域，建议框选 MACD 指标区域以获取动能信号',
      visualHint: 'unknown',
      status: 'limited',
      dataAvailable: false,
    });
  }

  // 3. RSI 强弱
  cards.push({
    id: 'rsi',
    category: '强弱',
    icon: '📶',
    term: finalRisk === '高' ? 'RSI 偏高' : finalRisk === '低' ? 'RSI 适中' : 'RSI 中性',
    plainText: finalRisk === '高'
      ? '价格短期涨幅较大，追高风险增加，注意回调'
      : finalRisk === '低'
        ? '价格未出现过度拉伸，短期风险可控'
        : '价格处于合理区间，但需关注后续方向选择',
    visualHint: finalRisk === '高' ? 'caution' : finalRisk === '低' ? 'up' : 'flat',
    status: finalRisk === '高' ? 'negative' : finalRisk === '低' ? 'positive' : 'neutral',
    dataAvailable: true,
  });

  // 4. 成交量
  const hasStrongPattern = klinePatterns.some(p => p === '大阳线' || p === '大阴线');
  cards.push({
    id: 'volume',
    category: '量能',
    icon: '📊',
    term: hasStrongPattern ? '成交量放大' : '成交量平稳',
    plainText: hasStrongPattern
      ? 'K线实体较大，市场参与度提高，资金关注度高'
      : 'K线实体适中，市场交投相对平稳',
    visualHint: hasStrongPattern ? 'up' : 'flat',
    status: 'neutral',
    dataAvailable: true,
  });

  // 5. 支撑位
  const hasHammer = klinePatterns.some(p => p === '锤子线');
  cards.push({
    id: 'support',
    category: '关键位',
    icon: '🛡️',
    term: hasHammer ? '下方有支撑' : '支撑待确认',
    plainText: hasHammer
      ? '出现锤子线等止跌形态，下方存在一定买盘支撑'
      : '暂未检测到明确的支撑形态，需结合图表前低位置判断',
    visualHint: hasHammer ? 'up' : 'unknown',
    status: hasHammer ? 'positive' : 'limited',
    dataAvailable: hasHammer,
  });

  // 6. 压力位
  const hasInvertedHammer = klinePatterns.some(p => p === '倒锤子');
  cards.push({
    id: 'resistance',
    category: '关键位',
    icon: '🚧',
    term: hasInvertedHammer ? '上方有压力' : '压力待确认',
    plainText: hasInvertedHammer
      ? '出现倒锤子线等受阻形态，上方存在一定卖盘压力'
      : '暂未检测到明确的压力形态，需结合图表前高位置判断',
    visualHint: hasInvertedHammer ? 'down' : 'unknown',
    status: hasInvertedHammer ? 'negative' : 'limited',
    dataAvailable: hasInvertedHammer,
  });

  return cards;
}

// ─── Aggregation from multiple patterns ────────────────────────

function aggregateTrend(trends: TrendDirection[]): TrendDirection {
  const upCount = trends.filter(t => t === '上涨').length;
  const downCount = trends.filter(t => t === '下跌').length;
  const sideCount = trends.filter(t => t === '震荡').length;

  if (upCount > downCount && upCount > sideCount) return '上涨';
  if (downCount > upCount && downCount > sideCount) return '下跌';
  return '震荡';
}

function aggregateRisk(risks: RiskLevel[]): RiskLevel {
  const highCount = risks.filter(r => r === '高').length;
  const midCount = risks.filter(r => r === '中').length;
  const lowCount = risks.filter(r => r === '低').length;

  if (highCount > 0) return '高';
  if (midCount > lowCount) return '中';
  return '低';
}

// ─── Main synthesis function ───────────────────────────────────

export function synthesizeAnalysis(
  results: Record<string, AnalysisResponse & { _key: string }>
): SynthesizedAnalysis {
  const entries = Object.entries(results);
  const validResults = entries.filter(([, r]) => !r.error);
  const errorResults = entries.filter(([, r]) => !!r.error);

  const scores: number[] = [];
  const trends: TrendDirection[] = [];
  const riskLevels: RiskLevel[] = [];
  const explanations: ExplanationItem[] = [];
  const professionalDetails: ProfessionalDetail[] = [];
  const klinePatterns: string[] = [];
  const macdSignals: string[] = [];

  for (const [key, result] of validResults) {
    const regionType = (key.split('_')[0] || 'kline') as RegionType;
    const regionIndex = safeNum(key.split('_')[1], 0);
    const confidence = safeNum(result.confidence, 0.5);

    if (regionType === 'kline') {
      const pattern = result.kline_pattern || '未知';
      klinePatterns.push(pattern);
      const baseScore = KLINE_PATTERN_SCORE[pattern] ?? 50;
      const weightedScore = baseScore * clamp(confidence, 0.3, 1);
      scores.push(clamp(weightedScore, 0, 100));

      const trend = KLINE_PATTERN_TREND[pattern] || '震荡';
      trends.push(trend);

      const risk = KLINE_PATTERN_RISK[pattern] || '中';
      riskLevels.push(risk);

      explanations.push({
        icon: '📊',
        summary: `K线区域${regionIndex + 1}: ${klineExplanation(pattern)}`,
      });

      professionalDetails.push({
        regionType,
        regionIndex,
        pattern,
        confidence,
        cached: result.cached ?? false,
      });
    } else {
      const signal = result.macd_signal || '未知';
      macdSignals.push(signal);
      const baseScore = MACD_SIGNAL_SCORE[signal] ?? 50;
      const weightedScore = baseScore * clamp(confidence, 0.3, 1);
      scores.push(clamp(weightedScore, 0, 100));

      const trend = MACD_SIGNAL_TREND[signal] || '震荡';
      trends.push(trend);

      const risk = MACD_SIGNAL_RISK[signal] || '中';
      riskLevels.push(risk);

      explanations.push({
        icon: '📉',
        summary: `MACD区域${regionIndex + 1}: ${macdExplanation(signal)}`,
      });

      professionalDetails.push({
        regionType,
        regionIndex,
        pattern: signal,
        confidence,
        cached: result.cached ?? false,
      });
    }
  }

  // If all results are errors
  if (validResults.length === 0) {
    return {
      speedRead: {
        aiScore: 0,
        trend: '震荡',
        riskLevel: '高',
        suggestion: '暂不建议操作',
        oneLineSummary: '分析失败，无法生成评估',
      },
      explanations: [],
      professionalDetails: [],
      indicatorCards: [],
      regionCount: entries.length,
      errorCount: errorResults.length,
      allErrors: errorResults.map(([, r]) => r.error || '未知错误'),
    };
  }

  const avgScore = scores.length > 0
    ? scores.reduce((a, b) => a + b, 0) / scores.length
    : 50;

  const finalScore = clamp(Math.round(avgScore), 0, 100);
  const finalTrend = aggregateTrend(trends);
  const finalRisk = aggregateRisk(riskLevels);
  const suggestion = deriveSuggestion(finalScore, finalTrend, finalRisk);
  const oneLineSummary = getOneLineSummary(finalScore, finalTrend, finalRisk);
  const indicatorCards = generateIndicatorCards(klinePatterns, macdSignals, finalTrend, finalRisk);

  // Add overall assessment as first explanation
  const overallExplanation: ExplanationItem = {
    icon: '🤖',
    summary: buildOverallSummary(finalScore, finalTrend, finalRisk, validResults.length),
  };

  return {
    speedRead: {
      aiScore: finalScore,
      trend: finalTrend,
      riskLevel: finalRisk,
      suggestion,
      oneLineSummary,
    },
    explanations: [overallExplanation, ...explanations],
    professionalDetails,
    indicatorCards,
    regionCount: entries.length,
    errorCount: errorResults.length,
    allErrors: errorResults.map(([, r]) => r.error || '未知错误'),
  };
}

function buildOverallSummary(
  score: number,
  trend: TrendDirection,
  risk: RiskLevel,
  signalCount: number,
): string {
  const trendText = trend === '上涨' ? '偏强' : trend === '下跌' ? '偏弱' : '中性';
  const riskText = risk === '低' ? '较低' : risk === '中' ? '中等' : '较高';

  return `综合 ${signalCount} 个图像区域的分析结果，当前走势${trendText}，风险${riskText}，AI 综合评分为 ${score} 分。`;
}

// ─── Trend / Risk display helpers ──────────────────────────────

export function trendColor(trend: TrendDirection): string {
  if (trend === '上涨') return '#10b981';   // emerald
  if (trend === '下跌') return '#ef4444';   // red
  return '#f59e0b';                          // amber
}

export function trendBgClass(trend: TrendDirection): string {
  if (trend === '上涨') return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
  if (trend === '下跌') return 'bg-red-500/15 text-red-400 border-red-500/30';
  return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
}

export function riskColor(risk: RiskLevel): string {
  if (risk === '低') return '#10b981';
  if (risk === '中') return '#f59e0b';
  return '#ef4444';
}

export function riskBgClass(risk: RiskLevel): string {
  if (risk === '低') return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
  if (risk === '中') return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
  return 'bg-red-500/15 text-red-400 border-red-500/30';
}

export function scoreColor(score: number): string {
  if (score >= 70) return '#10b981';
  if (score >= 40) return '#f59e0b';
  return '#ef4444';
}

export function scoreBgClass(score: number): string {
  if (score >= 70) return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
  if (score >= 40) return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
  return 'bg-red-500/15 text-red-400 border-red-500/30';
}

export function scoreLabel(score: number): string {
  if (score >= 80) return '强势';
  if (score >= 60) return '偏强';
  if (score >= 40) return '中性';
  if (score >= 20) return '偏弱';
  return '弱势';
}
