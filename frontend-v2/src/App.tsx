import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import imageCompression from 'browser-image-compression';
import { RegionType, analyzeImage, AnalysisResponse } from './api';
import {
  synthesizeAnalysis,
  scoreColor,
  scoreBgClass,
  scoreLabel,
  trendBgClass,
  riskBgClass,
  type SynthesizedAnalysis,
  type IndicatorCard,
} from './analysis-synthesis';

// ─── Constants ────────────────────────────────────────────────
const MAX_WIDTH = 800;
const MAX_HEIGHT = 800;
const COMPRESSION_QUALITY = 0.7;

const REGION_COLORS: Record<RegionType, string> = {
  kline: '#3b82f6',
  macd: '#f97316',
};

const REGION_LABELS: Record<RegionType, string> = {
  kline: 'K 线图区',
  macd: 'MACD 区',
};

// ─── Help content for ⓘ buttons ──────────────────────────────
const INDICATOR_HELP: Record<string, { title: string; what: string; how: string }> = {
  ma: {
    title: '均线 (MA)',
    what: '均线是过去 N 天收盘价的平均值连线，反映价格的中期趋势方向。',
    how: '价格在均线之上 → 趋势偏强，均线托底。价格在均线之下 → 趋势偏弱，均线压制。多条均线向上发散 → 多头排列，看涨。',
  },
  macd: {
    title: 'MACD 指标',
    what: 'MACD 通过快线与慢线的交叉，判断买卖力量的变化。',
    how: '金叉（快线上穿慢线）→ 买方力量增强，看涨。死叉（快线下穿慢线）→ 卖方力量增强，看跌。',
  },
  rsi: {
    title: 'RSI 强弱指标',
    what: 'RSI 衡量价格近期涨跌幅度，判断是否超买或超卖。',
    how: 'RSI 偏高 → 短期涨幅过大，有回调风险。RSI 偏低 → 短期跌幅过大，可能反弹。',
  },
  volume: {
    title: '成交量',
    what: '成交量反映市场参与度和资金关注程度。',
    how: '放量上涨 → 资金积极买入，趋势可信。缩量下跌 → 抛压减轻。放量下跌 → 恐慌出逃，需警惕。',
  },
  support: {
    title: '支撑位',
    what: '支撑位是价格下跌时可能止跌反弹的价格区域。',
    how: '价格靠近支撑位 → 可能获得买盘支撑，止跌企稳。跌破支撑位 → 趋势可能进一步走弱。',
  },
  resistance: {
    title: '压力位',
    what: '压力位是价格上涨时可能遇阻回落的价格区域。',
    how: '价格靠近压力位 → 上方卖压增大，可能遇阻。突破压力位 → 趋势可能进一步走强。',
  },
};

// ─── Risk reasons derivation ──────────────────────────────────
function deriveRiskReasons(cards: IndicatorCard[]): string[] {
  const reasons: string[] = [];
  for (const card of cards) {
    if (card.status === 'negative') {
      switch (card.id) {
        case 'macd': reasons.push('卖方力量增强（MACD 偏空）'); break;
        case 'rsi': reasons.push('短期涨幅偏高，有回调风险'); break;
        case 'ma': reasons.push('均线空头排列，趋势走弱'); break;
        case 'resistance': reasons.push('上方压力较重，突破难度大'); break;
        case 'support': reasons.push('支撑位待确认，下方空间不确定'); break;
        case 'volume': reasons.push('成交量萎缩，市场热度下降'); break;
      }
    }
    if (card.status === 'limited' && card.visualHint === 'caution') {
      reasons.push(`${card.term}信号不明确，需进一步确认`);
    }
  }
  if (reasons.length === 0) return ['暂无明显风险信号'];
  return reasons.slice(0, 3);
}

// ─── Beginner mode term labels ────────────────────────────────
const BEGINNER_LABELS: Record<string, string> = {
  ma: '价格走势',
  macd: '买卖力量',
  rsi: '价格强度',
  volume: '交易热度',
  support: '下跌空间',
  resistance: '上涨空间',
};

// ─── Types ────────────────────────────────────────────────────
interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface Region {
  type: RegionType;
  rect: Rect;
}

// ─── Safe number helpers ──────────────────────────────────────
function safeNumber(value: unknown, fallback = 0): number {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function clampNumber(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

// ─── Components ───────────────────────────────────────────────

// ------ Toast Notification ------
function Toast({
  message,
  type,
  onClose,
}: {
  message: string;
  type: 'error' | 'success';
  onClose: () => void;
}) {
  useEffect(() => {
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div
      className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-xl text-sm font-medium shadow-2xl
        ${type === 'error' ? 'bg-red-500/90 text-white' : 'bg-emerald-500/90 text-white'}`}
      style={{ animation: 'slideInRight 0.3s ease-out' }}
    >
      {message}
    </div>
  );
}

// ------ AI Score Ring (SVG circle) ------
function ScoreRing({ score, size = 120 }: { score: number; size?: number }) {
  const safeScore = clampNumber(safeNumber(score, 0), 0, 100);
  const strokeW = 8;
  const radius = (size - strokeW * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - safeScore / 100);
  const color = scoreColor(safeScore);

  return (
    <div className="score-ring score-animate" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          className="score-bg"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeW}
        />
        <circle
          className="score-fill"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeW}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold tabular-nums" style={{ color }}>
          {safeScore}
        </span>
        <span className="text-[10px] text-dark-400 mt-0.5">{scoreLabel(safeScore)}</span>
      </div>
    </div>
  );
}

// ------ Expandable Section (reusable) ------
function ExpandableSection({
  title,
  icon,
  badge,
  defaultOpen = false,
  children,
}: {
  title: string;
  icon: string;
  badge?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="expandable-section">
      <button
        type="button"
        className="expandable-trigger"
        onClick={() => setOpen(!open)}
      >
        <div className="flex items-center gap-2.5">
          <span className="text-base">{icon}</span>
          <span className="text-sm font-semibold text-dark-200">{title}</span>
          {badge && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-dark-700 text-dark-400">
              {badge}
            </span>
          )}
        </div>
        <svg
          className={`expandable-chevron ${open ? 'open' : ''}`}
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <path d="M4 6l4 4 4-4" />
        </svg>
      </button>
      <div className={`expandable-content ${open ? 'open' : ''}`}>
        <div className="px-1 pb-3">{children}</div>
      </div>
    </div>
  );
}

// ------ AI Conclusion Card (top priority — 3s understanding) ------
function ConclusionCard({ synthesis }: { synthesis: SynthesizedAnalysis }) {
  const { speedRead } = synthesis;
  const s = speedRead.aiScore;

  const confidenceLevel = s >= 75 ? '🟢 高信心' : s >= 50 ? '🟡 中等信心' : '🔴 低信心';
  const confidenceColor = s >= 75 ? 'text-emerald-400' : s >= 50 ? 'text-amber-400' : 'text-red-400';

  const holdAdvice = (() => {
    if (speedRead.trend === '上涨' && speedRead.riskLevel === '低') return { text: '建议继续持有', icon: '💎' };
    if (speedRead.trend === '上涨') return { text: '持有但注意风险', icon: '💎' };
    if (speedRead.trend === '震荡') return { text: '持有观望，等待方向', icon: '🕐' };
    if (speedRead.riskLevel === '高') return { text: '建议减仓或观望', icon: '⚠️' };
    return { text: '可轻仓持有', icon: '💎' };
  })();

  const buyAdvice = (() => {
    if (speedRead.riskLevel === '低' && s >= 60) return { text: '可逢低关注', icon: '🎯' };
    if (speedRead.riskLevel === '中' && s >= 50) return { text: '分批建仓，控制仓位', icon: '🎯' };
    if (speedRead.riskLevel === '高' || s < 40) return { text: '暂不建议买入', icon: '⛔' };
    return { text: '等待更明确信号', icon: '🕐' };
  })();

  return (
    <div className="glass-card p-5 glow-blue overflow-hidden border-l-[3px] border-l-blue-400">
      {/* 标题 */}
      <div className="flex items-center gap-2 mb-4">
        <div className="w-5 h-5 rounded-md gradient-primary flex items-center justify-center text-[10px] font-bold">
          AI
        </div>
        <span className="text-dark-200 text-sm font-bold tracking-wide">AI 分析结论</span>
      </div>

      {/* 一句话结论 */}
      <p className="text-dark-100 text-base font-semibold leading-relaxed mb-4 px-3 py-2.5 rounded-lg bg-dark-700/40">
        {speedRead.oneLineSummary}
      </p>

      {/* 三列建议 */}
      <div className="grid grid-cols-3 gap-3">
        <div className="flex flex-col items-center gap-1 p-2.5 rounded-lg bg-dark-800/40">
          <span className="text-lg">{holdAdvice.icon}</span>
          <span className="text-dark-400 text-[10px] uppercase tracking-wider">持有建议</span>
          <span className="text-dark-200 text-xs font-semibold text-center leading-tight">
            {holdAdvice.text}
          </span>
        </div>
        <div className="flex flex-col items-center gap-1 p-2.5 rounded-lg bg-dark-800/40">
          <span className="text-lg">{buyAdvice.icon}</span>
          <span className="text-dark-400 text-[10px] uppercase tracking-wider">买入建议</span>
          <span className="text-dark-200 text-xs font-semibold text-center leading-tight">
            {buyAdvice.text}
          </span>
        </div>
        <div className="flex flex-col items-center gap-1 p-2.5 rounded-lg bg-dark-800/40">
          <span className="text-lg">📊</span>
          <span className="text-dark-400 text-[10px] uppercase tracking-wider">AI 信心</span>
          <span className={`text-xs font-semibold ${confidenceColor}`}>
            {confidenceLevel}
          </span>
        </div>
      </div>
    </div>
  );
}

// ------ Mode Toggle (beginner / pro) ------
function ModeToggle({ mode, onToggle }: { mode: 'beginner' | 'pro'; onToggle: () => void }) {
  return (
    <div className="flex rounded-xl overflow-hidden border border-dark-700">
      <button
        type="button"
        onClick={onToggle}
        className={`px-4 py-2 text-sm font-semibold transition-all duration-200 ${
          mode === 'beginner'
            ? 'bg-emerald-500/20 text-emerald-300'
            : 'text-dark-400 hover:text-dark-200 hover:bg-dark-800'
        }`}
      >
        🟢 小白模式
      </button>
      <button
        type="button"
        onClick={onToggle}
        className={`px-4 py-2 text-sm font-semibold transition-all duration-200 ${
          mode === 'pro'
            ? 'bg-blue-500/20 text-blue-300'
            : 'text-dark-400 hover:text-dark-200 hover:bg-dark-800'
        }`}
      >
        🔵 专业模式
      </button>
    </div>
  );
}

// ------ Help Tip (ⓘ popover) ------
function HelpTip({ cardId }: { cardId: string }) {
  const [open, setOpen] = useState(false);
  const help = INDICATOR_HELP[cardId];
  if (!help) return null;

  return (
    <span className="relative inline-flex">
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
        className="w-4 h-4 rounded-full bg-dark-600/60 text-dark-400 hover:bg-dark-500 hover:text-dark-200
                   flex items-center justify-center text-[9px] font-bold leading-none
                   transition-all duration-200 flex-shrink-0"
        title="点击查看说明"
      >
        ⓘ
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 w-56
                          p-3 rounded-xl bg-dark-800 border border-dark-600 shadow-2xl
                          animate-in fade-in slide-in-from-bottom-2 duration-200">
            <p className="text-dark-200 text-xs font-semibold mb-1.5">{help.title}</p>
            <p className="text-dark-400 text-[11px] leading-relaxed mb-1.5"><span className="text-dark-500">作用：</span>{help.what}</p>
            <p className="text-dark-400 text-[11px] leading-relaxed"><span className="text-dark-500">解读：</span>{help.how}</p>
          </div>
        </>
      )}
    </span>
  );
}

// ------ AI Speed Read Panel (Layer 1 - always visible) ------
function SpeedReadPanel({ synthesis }: { synthesis: SynthesizedAnalysis }) {
  const { speedRead } = synthesis;
  const riskReasons = deriveRiskReasons(synthesis.indicatorCards);

  const suggestionIcon = (s: string) => {
    if (s.includes('持有')) return '👍';
    if (s.includes('关注') || s.includes('回踩')) return '👀';
    if (s.includes('追高')) return '⛔';
    if (s.includes('观望')) return '🕐';
    return '🤔';
  };

  return (
    <div className="glass-card p-5 glow-blue overflow-hidden">
      {/* AI 徽标 + 区域数 */}
      <div className="flex items-center gap-2 mb-4">
        <div className="w-5 h-5 rounded-md gradient-primary flex items-center justify-center text-[10px]">
          AI
        </div>
        <span className="text-dark-300 text-xs font-semibold tracking-wider">AI 速览</span>
        {synthesis.regionCount > 0 && (
          <span className="text-dark-500 text-[10px] ml-auto">
            {synthesis.regionCount} 个区域
          </span>
        )}
      </div>

      {/* 一句总结 — 大字突出 */}
      <p className="one-line-summary">
        {speedRead.oneLineSummary}
      </p>

      {/* 评分环 + 精简三行 */}
      <div className="flex items-center gap-5">
        <ScoreRing score={speedRead.aiScore} size={100} />

        <div className="flex-1 space-y-2.5 min-w-0">
          {/* 趋势 — 箭头 + 颜色 */}
          <div className="flex items-center gap-2">
            <span className="text-dark-500 text-[11px] w-8 flex-shrink-0">趋势</span>
            <span className={`ai-badge ${trendBgClass(speedRead.trend)}`}>
              {speedRead.trend === '上涨' ? '↗' : speedRead.trend === '下跌' ? '↘' : '→'}
              {' '}{speedRead.trend}
            </span>
          </div>

          {/* 风险 — 圆点 + 颜色 + 具体原因 */}
          <div className="flex items-start gap-2">
            <span className="text-dark-500 text-[11px] w-8 flex-shrink-0 mt-0.5">风险</span>
            <div className="flex-1 min-w-0">
              <span className={`ai-badge ${riskBgClass(speedRead.riskLevel)}`}>
                <span className={`status-dot ${speedRead.riskLevel === '低' ? 'dot-green' : speedRead.riskLevel === '中' ? 'dot-amber' : 'dot-red'}`} />
                {speedRead.riskLevel}风险
              </span>
              <div className="mt-1.5 space-y-0.5">
                {riskReasons.map((reason, i) => (
                  <p key={i} className="text-dark-400 text-[10px] leading-relaxed pl-0.5">
                    · {reason}
                  </p>
                ))}
              </div>
            </div>
          </div>

          {/* 建议 — 图标 + 文字 */}
          <div className="flex items-center gap-2">
            <span className="text-dark-500 text-[11px] w-8 flex-shrink-0">建议</span>
            <span className="text-dark-200 text-sm font-medium">
              {suggestionIcon(speedRead.suggestion)} {speedRead.suggestion}
            </span>
          </div>
        </div>
      </div>

      {/* 错误提示 */}
      {synthesis.errorCount > 0 && (
        <div className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
          <p className="text-red-400 text-xs">
            {synthesis.errorCount} 个区域分析失败，已自动忽略
          </p>
        </div>
      )}
    </div>
  );
}

// ------ Visual hint helpers ------
function visualHintIcon(hint: IndicatorCard['visualHint']): string {
  switch (hint) {
    case 'up': return '↗';
    case 'down': return '↘';
    case 'flat': return '→';
    case 'caution': return '⚠';
    default: return '—';
  }
}

function statusDotClass(status: IndicatorCard['status']): string {
  switch (status) {
    case 'positive': return 'dot-green';
    case 'negative': return 'dot-red';
    case 'neutral': return 'dot-amber';
    default: return 'dot-gray';
  }
}

// ------ Indicator Card List (Layer 2 — 白话解读) ------
function IndicatorCardList({ cards, mode }: { cards: IndicatorCard[]; mode: 'beginner' | 'pro' }) {
  if (cards.length === 0) {
    return (
      <p className="text-dark-500 text-xs text-center py-4">
        暂无指标数据
      </p>
    );
  }

  const beginnerTerm = (card: IndicatorCard): string => {
    if (mode === 'pro') return card.term;
    // Beginner mode: translate to plain language
    const label = BEGINNER_LABELS[card.id];
    if (!label) return card.term;
    const hint = card.visualHint === 'up' ? '：向好' : card.visualHint === 'down' ? '：走弱' : card.visualHint === 'caution' ? '：注意' : '：平稳';
    return label + hint;
  };

  return (
    <div className="space-y-2">
      {cards.map((card) => (
        <div key={card.id} className="indicator-card">
          {/* 左侧: 图标 + 方向箭头 */}
          <div className="flex items-center gap-2 flex-shrink-0 w-[60px]">
            <span className="text-lg">{card.icon}</span>
            <span className={`visual-hint visual-${card.visualHint}`}>
              {visualHintIcon(card.visualHint)}
            </span>
          </div>
          {/* 中间: 术语 + 白话 */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="text-dark-200 text-sm font-semibold">{beginnerTerm(card)}</span>
              {!card.dataAvailable && (
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-dark-700/60 text-dark-500">推断</span>
              )}
              {mode === 'pro' && (
                <span className="text-dark-500 text-[10px] ml-1">({card.term})</span>
              )}
            </div>
            <p className="text-dark-400 text-xs leading-relaxed">{card.plainText}</p>
          </div>
          {/* 右侧: ⓘ + 状态点 */}
          <div className="flex-shrink-0 ml-2 flex items-center gap-2">
            <HelpTip cardId={card.id} />
            <span className={`status-dot ${statusDotClass(card.status)}`} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ------ Technical Detail Panel (Layer 3 — 折叠) ------
function TechnicalDetailPanel({
  synthesis,
  results,
}: {
  synthesis: SynthesizedAnalysis;
  results: Record<string, AnalysisResponse & { _key: string }>;
}) {
  if (synthesis.professionalDetails.length === 0 && synthesis.errorCount === 0) {
    return (
      <p className="text-dark-500 text-xs text-center py-4">
        暂无技术数据
      </p>
    );
  }

  return (
    <div className="space-y-2.5">
      {/* 汇总条 */}
      <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-dark-800/40 border border-dark-700/20">
        <span className="text-dark-400 text-xs">
          {synthesis.regionCount} 区域 · {synthesis.regionCount - synthesis.errorCount} 成功
          {synthesis.errorCount > 0 && <span className="text-red-400"> · {synthesis.errorCount} 失败</span>}
        </span>
        <span
          className="ml-auto text-sm font-bold tabular-nums"
          style={{ color: scoreColor(synthesis.speedRead.aiScore) }}
        >
          {synthesis.speedRead.aiScore} 分
        </span>
      </div>

      {/* 各区域 */}
      {synthesis.professionalDetails.map((detail, i) => {
        const key = `${detail.regionType}_${detail.regionIndex}`;
        const raw = results[key];
        const confPct = (clampNumber(safeNumber(detail.confidence, 0) * 100, 0, 100)).toFixed(0);

        return (
          <div
            key={i}
            className="rounded-lg bg-dark-800/40 border border-dark-700/30 overflow-hidden"
          >
            <div className="flex items-center gap-2 px-3 py-2.5 border-b border-dark-700/20">
              <span className="text-sm">{detail.regionType === 'kline' ? '📈' : '📉'}</span>
              <span className="text-dark-300 text-xs font-semibold">
                {REGION_LABELS[detail.regionType]} · 区域 {detail.regionIndex + 1}
              </span>
              {/* 置信度条 */}
              <div className="ml-auto flex items-center gap-1.5">
                <div className="w-12 h-1.5 rounded-full bg-dark-700 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${confPct}%`,
                      backgroundColor: scoreColor(Number(confPct)),
                    }}
                  />
                </div>
                <span className="text-dark-500 text-[10px] tabular-nums w-7">{confPct}%</span>
              </div>
            </div>
            <div className="px-3 py-2 flex items-center gap-2">
              <span className="text-dark-200 text-xs font-medium">{detail.pattern}</span>
              {detail.cached && (
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-dark-700/60 text-dark-500">缓存</span>
              )}
              {raw?.raw_response && (
                <span
                  className="text-dark-500 text-[10px] truncate max-w-[140px] ml-auto"
                  title={raw.raw_response}
                >
                  {raw.raw_response.slice(0, 40)}…
                </span>
              )}
            </div>
          </div>
        );
      })}

      {/* 错误 */}
      {synthesis.allErrors.length > 0 && (
        <div className="p-3 rounded-lg bg-red-500/5 border border-red-500/10">
          <p className="text-red-400/70 text-[11px] font-semibold mb-1">分析失败</p>
          {synthesis.allErrors.map((err, i) => (
            <p key={i} className="text-red-400/60 text-[10px]">{err}</p>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────
export default function App() {
  // State
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [imageDimensions, setImageDimensions] = useState<{ w: number; h: number } | null>(null);

  const [regions, setRegions] = useState<Region[]>([]);
  const [activeRegionType, setActiveRegionType] = useState<RegionType>('kline');

  const [isDrawing, setIsDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null);
  const [drawCurrent, setDrawCurrent] = useState<{ x: number; y: number } | null>(null);

  const [results, setResults] = useState<Record<string, AnalysisResponse & { _key: string }>>({});
  const [analyzing, setAnalyzing] = useState(false);

  const [toast, setToast] = useState<{ message: string; type: 'error' | 'success' } | null>(null);
  const [dragOver, setDragOver] = useState(false);

  // ─── Mode (beginner / pro) ────────────────────────────────
  const [mode, setMode] = useState<'beginner' | 'pro'>('beginner');

  const toggleMode = useCallback(() => {
    setMode((prev) => {
      const next = prev === 'beginner' ? 'pro' : 'beginner';
      console.log(next === 'beginner' ? 'beginner mode' : 'professional mode');
      return next;
    });
  }, []);

  // Refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ─── Synthesize analysis from results ──────────────────────
  const synthesis: SynthesizedAnalysis = useMemo(
    () => synthesizeAnalysis(results),
    [results]
  );

  // ─── Toast helper ──────────────────────────────────────────
  const showToast = useCallback((message: string, type: 'error' | 'success') => {
    setToast({ message, type });
  }, []);

  // Clean up object URL to avoid memory leaks
  useEffect(() => {
    return () => {
      if (imageSrc) URL.revokeObjectURL(imageSrc);
    };
  }, [imageSrc]);

  // ─── Image upload & compression ─────────────────────────────
  const handleFileSelect = useCallback(
    async (file: File) => {
      if (!file.type.startsWith('image/')) {
        showToast('请上传图片文件', 'error');
        return;
      }

      try {
        const compressed = await imageCompression(file, {
          maxSizeMB: 0.5,
          maxWidthOrHeight: MAX_WIDTH,
          useWebWorker: true,
          initialQuality: COMPRESSION_QUALITY,
        });

        setImageFile(compressed);
        const url = URL.createObjectURL(compressed);
        setImageSrc(url);
        setRegions([]);
        setResults({});
        setImageDimensions(null);

        const img = new Image();
        img.onload = () => {
          setImageDimensions({ w: img.naturalWidth, h: img.naturalHeight });
        };
        img.src = url;
      } catch (err) {
        console.error(err);
        showToast('图片压缩失败', 'error');
      }
    },
    [showToast]
  );

  // Drag & Drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFileSelect(file);
    },
    [handleFileSelect]
  );

  // ─── Canvas drawing helpers ────────────────────────────────
  const getCanvasCoords = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>): { x: number; y: number } => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
      };
    },
    []
  );

  // ─── Redraw canvas ──────────────────────────────────────────
  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img || !imageSrc) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = imageDimensions?.w || img.naturalWidth || 800;
    canvas.height = imageDimensions?.h || img.naturalHeight || 600;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    // Draw saved regions
    for (const region of regions) {
      const { x, y, w, h } = region.rect;
      const color = REGION_COLORS[region.type];

      ctx.strokeStyle = color;
      ctx.lineWidth = 2.5;
      ctx.setLineDash([6, 4]);
      ctx.strokeRect(x, y, w, h);

      // Label background
      ctx.fillStyle = color + 'dd';
      ctx.font = 'bold 12px sans-serif';
      const text = REGION_LABELS[region.type];
      const textMetrics = ctx.measureText(text);
      const textW = textMetrics.width + 12;
      const textH = 22;
      ctx.fillRect(x, y - textH - 4, textW, textH);

      ctx.fillStyle = '#ffffff';
      ctx.fillText(text, x + 6, y - 10);
    }

    // Draw in-progress rectangle
    if (isDrawing && drawStart && drawCurrent) {
      const color = REGION_COLORS[activeRegionType];
      const x = Math.min(drawStart.x, drawCurrent.x);
      const y = Math.min(drawStart.y, drawCurrent.y);
      const w = Math.abs(drawCurrent.x - drawStart.x);
      const h = Math.abs(drawCurrent.y - drawStart.y);

      ctx.strokeStyle = color;
      ctx.lineWidth = 2.5;
      ctx.setLineDash([6, 4]);
      ctx.strokeRect(x, y, w, h);
    }
  }, [regions, isDrawing, drawStart, drawCurrent, activeRegionType, imageDimensions, imageSrc]);

  useEffect(() => {
    redraw();
  }, [redraw]);

  // ─── Mouse event handlers ───────────────────────────────────
  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const coords = getCanvasCoords(e);
      setDrawStart(coords);
      setIsDrawing(true);
    },
    [getCanvasCoords]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!isDrawing) return;
      setDrawCurrent(getCanvasCoords(e));
    },
    [isDrawing, getCanvasCoords]
  );

  const handleMouseUp = useCallback(() => {
    if (!isDrawing || !drawStart || !drawCurrent) {
      setIsDrawing(false);
      return;
    }

    const x = Math.min(drawStart.x, drawCurrent.x);
    const y = Math.min(drawStart.y, drawCurrent.y);
    const w = Math.abs(drawCurrent.x - drawStart.x);
    const h = Math.abs(drawCurrent.y - drawStart.y);

    setIsDrawing(false);
    setDrawStart(null);
    setDrawCurrent(null);

    if (w < 15 || h < 15) return;

    const newRegion: Region = {
      type: activeRegionType,
      rect: { x, y, w, h },
    };

    setRegions((prev) => [...prev, newRegion]);
  }, [isDrawing, drawStart, drawCurrent, activeRegionType]);

  // ─── Crop & analyze ─────────────────────────────────────────
  const cropAndAnalyze = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas || regions.length === 0) return;

    setAnalyzing(true);
    const newResults: Record<string, AnalysisResponse & { _key: string }> = {};

    try {
      for (let i = 0; i < regions.length; i++) {
        const region = regions[i];
        const { x, y, w, h } = region.rect;

        const cropCanvas = document.createElement('canvas');
        cropCanvas.width = w;
        cropCanvas.height = h;

        const cropCtx = cropCanvas.getContext('2d');
        if (!cropCtx) {
          throw new Error('无法创建裁剪画布');
        }

        cropCtx.drawImage(canvas, x, y, w, h, 0, 0, w, h);

        const base64 = cropCanvas.toDataURL('image/jpeg', 0.75).split(',')[1];
        const key = `${region.type}_${i}`;

        try {
          const result = await analyzeImage(base64, region.type);
          newResults[key] = { ...result, _key: key };
        } catch (err: any) {
          newResults[key] = {
            error: err?.message || '分析失败',
            _key: key,
          } as AnalysisResponse & { _key: string };
        }
      }

      setResults(newResults);
      showToast('分析完成', 'success');
    } catch (err: any) {
      showToast(`分析失败: ${err?.message || '未知错误'}`, 'error');
    } finally {
      setAnalyzing(false);
    }
  }, [regions, showToast]);

  // ─── Clear regions ──────────────────────────────────────────
  const clearRegions = useCallback(() => {
    setRegions([]);
    setResults({});
  }, []);

  const hasResults = Object.keys(results).length > 0;

  // ─── Render ─────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-dark-950 overflow-guard">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Header */}
      <header className="relative overflow-hidden border-b border-dark-800/50">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 via-purple-600/10 to-pink-600/10" />
        <div className="relative max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center text-xl shadow-lg shadow-blue-500/20">
              📈
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                SnapVision
              </h1>
              <p className="text-dark-400 text-xs">智能股票图表分析</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-dark-400 text-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            系统就绪
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        {!imageSrc ? (
          /* ─── Upload view ─────────────────────────────── */
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`
              glass-card p-16 flex flex-col items-center justify-center gap-6 cursor-pointer
              transition-all duration-300
              ${dragOver ? 'border-blue-400 scale-[1.01] glow-blue' : 'hover:border-dark-600'}
            `}
          >
            <div
              className={`w-24 h-24 rounded-3xl flex items-center justify-center text-4xl
                transition-all duration-500 ${dragOver ? 'gradient-primary scale-110 shadow-2xl' : 'bg-dark-700'}`}
            >
              📁
            </div>
            <div className="text-center space-y-1">
              <p className="text-dark-200 text-lg font-semibold">
                {dragOver ? '释放以上传' : '上传股票图表截图'}
              </p>
              <p className="text-dark-400 text-sm">拖拽图片到此处，或点击选择文件</p>
              <p className="text-dark-500 text-xs mt-2">支持 PNG、JPEG · 自动压缩至 800px</p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFileSelect(f);
              }}
            />
          </div>
        ) : (
          /* ─── Analysis view ──────────────────────────── */
          <>
            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-dark-400 text-xs uppercase tracking-wider">框选区域类型:</span>
                <div className="flex rounded-xl overflow-hidden border border-dark-700">
                  {(['kline', 'macd'] as RegionType[]).map((type) => (
                    <button
                      key={type}
                      onClick={() => setActiveRegionType(type)}
                      className={`px-4 py-2 text-sm font-medium transition-all duration-200 ${
                        activeRegionType === type
                          ? type === 'kline'
                            ? 'bg-blue-500/20 text-blue-300'
                            : 'bg-orange-500/20 text-orange-300'
                          : 'text-dark-400 hover:text-dark-200 hover:bg-dark-800'
                      }`}
                    >
                      {REGION_LABELS[type]}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex-1" />

              <button
                onClick={() => {
                  setImageSrc(null);
                  setImageFile(null);
                  setRegions([]);
                  setResults({});
                  setImageDimensions(null);
                }}
                className="glass-button text-dark-300 hover:text-dark-100 border border-dark-700 hover:border-dark-500"
              >
                重新上传
              </button>
              <button
                onClick={clearRegions}
                disabled={regions.length === 0}
                className="glass-button text-dark-300 hover:text-dark-100 border border-dark-700 hover:border-dark-500"
              >
                清除选框
              </button>
              <button
                onClick={cropAndAnalyze}
                disabled={regions.length === 0 || analyzing}
                className="glass-button gradient-primary text-white shadow-lg shadow-blue-500/25"
              >
                {analyzing ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    分析中...
                  </span>
                ) : (
                  `分析 ${regions.length} 个区域`
                )}
              </button>
            </div>

            {/* Main grid: image + analysis panel */}
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6">
              {/* Left: Image canvas */}
              <div className="glass-card p-4 overflow-hidden">
                <div className="relative">
                  <img ref={imageRef} src={imageSrc} alt="Stock chart" className="hidden" draggable={false} />
                  <canvas
                    ref={canvasRef}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={() => {
                      if (isDrawing) {
                        setIsDrawing(false);
                        setDrawStart(null);
                        setDrawCurrent(null);
                      }
                    }}
                    className="w-full cursor-crosshair rounded-lg"
                    style={{ maxHeight: '70vh', objectFit: 'contain' }}
                  />
                  <p className="absolute bottom-3 left-3 text-dark-500 text-[10px] bg-dark-900/70 px-2 py-0.5 rounded">
                    按住鼠标拖拽框选区域 · 当前模式: {REGION_LABELS[activeRegionType]}
                  </p>
                </div>
              </div>

              {/* Right: Three-layer analysis panel */}
              <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1 no-scrollbar">
                {!hasResults && !analyzing && (
                  <div className="glass-card p-10 text-center">
                    <div className="text-4xl mb-3 opacity-30">🎯</div>
                    <p className="text-dark-500 text-sm">在图表上框选区域后点击分析</p>
                    <p className="text-dark-600 text-xs mt-1">支持 K 线形态 和 MACD 信号识别</p>
                  </div>
                )}

                {analyzing && (
                  <div className="glass-card p-10 text-center animate-pulse-glow">
                    <div className="w-10 h-10 mx-auto mb-4 rounded-full border-2 border-blue-400 border-t-transparent animate-spin" />
                    <p className="text-dark-300 text-sm">正在调用视觉分析...</p>
                    <p className="text-dark-500 text-xs mt-1">请稍候</p>
                  </div>
                )}

                {hasResults && (
                  <>
                    {/* ── AI 结论卡 (最高优先级 — 3秒看懂) ── */}
                    <ConclusionCard synthesis={synthesis} />

                    {/* ── 模式切换按钮 ── */}
                    <ModeToggle mode={mode} onToggle={toggleMode} />

                    {/* ── 第一层: AI 速览 ── */}
                    <SpeedReadPanel synthesis={synthesis} />

                    {/* ── 第二层: 白话解读 ── */}
                    <div className="glass-card overflow-hidden">
                      <ExpandableSection
                        title={mode === 'beginner' ? '🌱 白话解读' : '💬 白话解读'}
                        icon={mode === 'beginner' ? '🌱' : '💬'}
                        badge={synthesis.indicatorCards.length > 0
                          ? `${synthesis.indicatorCards.length} 项`
                          : undefined}
                        defaultOpen={true}
                      >
                        <IndicatorCardList cards={synthesis.indicatorCards} mode={mode} />
                      </ExpandableSection>
                    </div>

                    {/* ── 第三层: 技术详情 ── */}
                    <div className="glass-card overflow-hidden">
                      <ExpandableSection
                        title="技术详情"
                        icon="🔍"
                        badge={synthesis.professionalDetails.length > 0
                          ? `${synthesis.professionalDetails.length} 项`
                          : undefined}
                        defaultOpen={false}
                      >
                        <TechnicalDetailPanel synthesis={synthesis} results={results} />
                      </ExpandableSection>
                    </div>
                  </>
                )}
              </div>
            </div>
          </>
        )}
      </main>

      <footer className="border-t border-dark-800/50 mt-12">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between text-dark-500 text-xs">
          <span>SnapVision · 基于视觉识别</span>
          <span>所有分析仅供参考 · 不构成投资建议</span>
        </div>
      </footer>
    </div>
  );
}
