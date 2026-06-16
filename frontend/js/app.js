/**
 * SnapVision — Three-Layer Analysis Display Engine
 *
 * Layer 1: AI 速览 (always visible) — score, trend, risk, suggestion, summary
 * Layer 2: AI 解释 (expandable) — plain-language explanations
 * Layer 3: 专业详情 (expandable, collapsed) — full technical indicators
 */

let currentAnalysis = null;
let currentMode = (function() {
  try { return localStorage.getItem('snapvision_mode') === 'pro' ? 'pro' : 'beginner'; }
  catch(e) { return 'beginner'; }
})(); // 'beginner' | 'pro'
let lenis = null;
let isTransitioning = false;
const totalSections = 3;
const PAGE_SIZE = 10;

// ─── Mode toggle ─────────────────────────────────────────
function toggleMode() {
  currentMode = currentMode === 'beginner' ? 'pro' : 'beginner';
  try { localStorage.setItem('snapvision_mode', currentMode); } catch(e) {}
  console.log(currentMode === 'beginner' ? 'beginner mode' : 'professional mode');
  if (currentAnalysis) renderAll(currentAnalysis);
  // Update button text WITHOUT replacing the <button> element (preserve onclick)
  var toggleDiv = document.getElementById('mode-toggle');
  if (toggleDiv) {
    var btn = toggleDiv.querySelector('button');
    if (btn) {
      btn.innerHTML = '<span class="mode-dot ' + (currentMode === 'beginner' ? 'mode-beginner-dot' : 'mode-pro-dot') + '"></span> '
        + (currentMode === 'beginner' ? '🌱 小白模式' : '🔬 专业模式');
    }
  }
}
window.toggleMode = toggleMode;

const DUR = 0.8;
const EASE = 'power3.out';

// ── Init ──
document.addEventListener('DOMContentLoaded', () => {
  initLenis();
  setupUpload();
  setupGlobalErrorHandler();
});

function setupGlobalErrorHandler() {
  window.addEventListener('error', e => console.error(e.error));
  window.addEventListener('unhandledrejection', e => console.error(e.reason));
}

// ═══════════════════════════════════════
// LENIS — smooth scroll + GSAP ticker
// ═══════════════════════════════════════
function initLenis() {
  if (typeof Lenis === 'undefined') return;
  lenis = new Lenis({
    duration: 1.2,
    easing: t => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
    wheelMultiplier: 0.8,
    touchMultiplier: 1.5,
    infinite: false,
    wrapper: document.getElementById('scroll-container'),
  });
  if (window.gsap && gsap.ticker) {
    gsap.ticker.add(time => lenis.raf(time * 1000));
  } else {
    function raf(time) { lenis.raf(time); requestAnimationFrame(raf); }
    requestAnimationFrame(raf);
  }
}

// ═══════════════════════════════════════
// SCROLL TO SECTION
// ═══════════════════════════════════════
function scrollToSection(index) {
  if (isTransitioning) return;
  const sections = document.querySelectorAll('.section');
  if (index < 0 || index >= sections.length) return;
  isTransitioning = true;

  const target = sections[index];
  const top = target.offsetTop;

  gsap.to(document.getElementById('scroll-container'), {
    scrollTop: top,
    duration: DUR,
    ease: EASE,
    onComplete: () => { isTransitioning = false; }
  });
}

// ═══════════════════════════════════════
// UPLOAD
// ═══════════════════════════════════════
function setupUpload() {
  const zone = document.getElementById('upload-zone');
  const input = document.getElementById('file-input');
  zone.addEventListener('click', () => input.click());
  zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('drag-active'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('drag-active'));
  zone.addEventListener('drop', e => {
    e.preventDefault(); zone.classList.remove('drag-active');
    if (e.dataTransfer.files.length > 0) handleFile(e.dataTransfer.files[0]);
  });
  input.addEventListener('change', e => { if (e.target.files.length > 0) handleFile(e.target.files[0]); });
}

async function handleFile(file) {
  if (!file.type.startsWith('image/')) { alert('请选择图片文件'); return; }
  if (file.size > 10485760) { alert('文件大小不能超过10MB'); return; }
  const fnEl = $('file-name'), fiEl = $('file-info'), ldEl = $('loading-indicator'), uzEl = $('upload-zone');
  if (fnEl) fnEl.textContent = file.name;
  if (fiEl) fiEl.classList.add('show');
  if (ldEl) ldEl.style.display = 'block';
  if (uzEl) uzEl.style.pointerEvents = 'none';

  const __T0 = performance.now();
  console.log('\n═══════ SnapVision 性能测量 ═══════');
  console.log(`图片上传：${((performance.now() - __T0) / 1000).toFixed(1)}s`);

  try {
    console.time('⏳ API请求（后端总耗时）');
    const analysis = await APIClient.analyzeImage(file);
    console.timeEnd('⏳ API请求（后端总耗时）');

    // Log backend timings from response
    if (analysis._timings) {
      console.log('\n════════ 性能深挖报告 ════════');
      var backendSum = 0;
      var maxStage = '', maxVal = 0;
      for (var k in analysis._timings) {
        if (k !== '后端总耗时') {
          var v = parseFloat(analysis._timings[k]);
          if (v > maxVal) { maxVal = v; maxStage = k; }
          backendSum += v;
          var bar = v > 5 ? ' ⚠️' : '';
          console.log(k + '：' + v.toFixed(1) + 's' + bar);
        }
      }
      var total = parseFloat(analysis._timings['后端总耗时']);
      var gap = total - backendSum;
      console.log('---');
      console.log('已统计耗时：' + backendSum.toFixed(1) + 's');
      console.log('后端总耗时：' + total.toFixed(1) + 's');
      if (gap > 1) {
        console.log('未解释耗时：' + gap.toFixed(1) + 's  ← ⚠️ 有耗时未被追踪');
      }
      console.log('--------');
      if (maxVal > 0) {
        var pct = (maxVal / total * 100);
        console.log('⚠️ 最大瓶颈：');
        console.log('  ' + maxStage);
        console.log('  占总耗时：' + pct.toFixed(1) + '%');
      }
    }

    currentAnalysis = analysis;

    console.time('⏳ 页面渲染');
    renderAll(analysis);
    console.timeEnd('⏳ 页面渲染');

    if (ldEl) ldEl.style.display = 'none';
    if (uzEl) uzEl.style.pointerEvents = 'auto';

    console.time('⏳ 滚动定位');
    scrollToSection(1);
    console.timeEnd('⏳ 滚动定位');

    var totalSec = ((performance.now() - __T0) / 1000).toFixed(1);
    console.log('\n全部完成：' + totalSec + 's');
    console.log('═══════════════════════════════\n');
  } catch (err) {
    if (ldEl) ldEl.style.display = 'none';
    if (uzEl) uzEl.style.pointerEvents = 'auto';
    alert('分析失败: ' + (err.message || '请重试'));
  }
}

// ═══════════════════════════════════════
// UTILITY
// ═══════════════════════════════════════
function $(id) { return document.getElementById(id); }

function safeNum(value, fallback) {
  var n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : (fallback !== undefined ? fallback : 0);
}

function safeStr(value, fallback) {
  if (value === null || value === undefined) return fallback !== undefined ? fallback : '--';
  return String(value);
}

// ═══════════════════════════════════════
// EXPANDABLE SECTION TOGGLE
// ═══════════════════════════════════════
function toggleExpand(sectionId) {
  var section = document.getElementById(sectionId);
  if (!section) return;
  var body = section.querySelector('.expand-body');
  if (!body) return;
  var wasOpen = section.classList.contains('open');
  if (wasOpen) {
    section.classList.remove('open');
    // Remove inline max-height so CSS can animate back to 0
    body.style.maxHeight = '';
  } else {
    section.classList.add('open');
    // Use exact content height instead of CSS's hardcoded 3000px cap
    body.style.maxHeight = body.scrollHeight + 'px';
  }
  // Lenis 需要重新计算页面高度。
  // CSS max-height 过渡时长 0.4s，等待过渡完成后触发 resize。
  setTimeout(function () {
    if (lenis) { lenis.resize(); }
  }, 440);
}
window.toggleExpand = toggleExpand;

// ═══════════════════════════════════════
// THREE-LAYER SYNTHESIS ENGINE
// ═══════════════════════════════════════

function mapTrend(signalTrend) {
  var map = {
    'bullish': '上涨',
    'mildly_bullish': '偏强震荡',
    'neutral': '震荡',
    'mildly_bearish': '偏弱震荡',
    'bearish': '下跌',
    '多头': '上涨',
    '偏多': '偏强震荡',
    '偏空': '偏弱震荡',
    '空头': '下跌',
  };
  return map[signalTrend] || signalTrend || '震荡';
}

function mapRisk(riskLevel) {
  if (!riskLevel) return '中';
  var r = String(riskLevel).toLowerCase();
  if (r === 'low' || r === '低' || r === '较低') return '低';
  if (r === 'high' || r === '高' || r === '较高' || r === '中等偏高') return '高';
  return '中';
}

function deriveSuggestion(a) {
  var strength = safeNum(a.signal_strength, 50);
  var trend = a.signal_trend || '';
  var support = safeNum(a.support, 0);
  var resistance = safeNum(a.resistance, 0);

  if (strength >= 70) return support > 0
    ? '继续持有，可关注 ¥' + support.toFixed(2) + ' 支撑位加仓机会'
    : '趋势向好，适合顺势持仓';

  if (strength >= 55) return resistance > 0
    ? '短期偏强，关注 ¥' + resistance.toFixed(2) + ' 压力位突破'
    : '短期偏强，可轻仓参与';

  if (strength >= 40) return '方向不明确，建议继续观察';

  if (trend === 'bearish' || trend === 'mildly_bearish') return support > 0
    ? '短期偏弱，关注 ¥' + support.toFixed(2) + ' 支撑是否有效'
    : '短期偏弱，建议观望为主';

  return '暂不建议操作，等待明确信号';
}

function deriveSummary(a) {
  var name = a.stock_name || '该股票';
  var trend = mapTrend(a.signal_trend);
  var risk = mapRisk(a.signal_risk || a.risk);
  var strength = safeNum(a.signal_strength, 50);

  var parts = [];
  if (trend === '上涨' || trend === '偏强震荡') {
    parts.push('当前处于' + trend + '趋势');
  } else if (trend === '下跌' || trend === '偏弱震荡') {
    parts.push('当前处于' + trend + '趋势');
  } else {
    parts.push('当前走势偏震荡');
  }

  if (risk === '高') {
    parts.push('风险偏高，需谨慎操作');
  } else if (risk === '低') {
    parts.push('风险可控');
  } else {
    parts.push('风险中等');
  }

  return parts.join('，') + '。AI 综合评分 ' + strength + ' 分。';
}

// ─── Beginner term labels ───────────────────────────────────────
var BEGINNER_LABELS = {
  macd: '买卖力量',
  ma: '价格走势',
  rsi: '价格强度',
  volume: '交易热度',
  support: '下方支撑',
  resistance: '上方压力',
};

// ─── Risk reasons derivation ────────────────────────────────────
function deriveRiskReasons(a) {
  var reasons = [];
  var signals = a.signals || [];
  for (var i = 0; i < signals.length; i++) {
    var sig = signals[i];
    if (sig.indexOf('死叉') >= 0) reasons.push('卖方力量增强（MACD 死叉）');
    else if (sig.indexOf('空头排列') >= 0) reasons.push('均线空头排列，趋势走弱');
    else if (sig.indexOf('顶背离') >= 0) reasons.push('顶背离出现，注意回调风险');
    else if (sig.indexOf('放量下跌') >= 0) reasons.push('放量下跌，抛压较重');
    else if (sig.indexOf('缩量上涨') >= 0) reasons.push('缩量上涨，上涨动能不足');
    else if (sig.indexOf('成交量萎缩') >= 0) reasons.push('成交量萎缩，市场热度下降');
  }
  if (reasons.length === 0) {
    var price = safeNum(a.price, 0);
    var support = safeNum(a.support, 0);
    var resistance = safeNum(a.resistance, 0);
    if (support > 0 && price > 0) {
      var dist = (price - support) / support * 100;
      if (dist < 5 && dist > 0) reasons.push('距支撑位仅 ' + dist.toFixed(1) + '%，若跌破可能加速下行');
    }
    if (resistance > 0 && price > 0) {
      var distR = (resistance - price) / price * 100;
      if (distR < 5 && distR > 0) reasons.push('距压力位仅 ' + distR.toFixed(1) + '%，关注突破情况');
    }
    var latestVol = safeNum(a.latest_volume, 0);
    var avgVol = safeNum(a.avg_volume, 0);
    if (latestVol > 0 && avgVol > 0 && latestVol / avgVol < 0.6) reasons.push('成交量偏低，市场参与度不足');
  }
  if (reasons.length === 0) reasons.push('暂无明显风险信号');
  return reasons.slice(0, 3);
}

// ─── Help content for ⓘ popovers ───────────────────────────────
function showHelp(id, event) {
  var existing = document.querySelector('.help-popover');
  if (existing) existing.remove();
  if (existing && existing.dataset.helpId === id) return;

  var helpMap = {
    dif: { title: 'DIF (快线)', what: 'DIF = 短期EMA值 - 长期EMA值，反映价格短期动量方向。', how: 'DIF > 0 → 短期偏强；DIF < 0 → 短期偏弱；DIF 上行 → 动能增强' },
    dea: { title: 'DEA (慢线)', what: 'DEA 是 DIF 的 N 日平滑移动平均线，反映中期趋势方向。', how: 'DIF 上穿 DEA → 金叉，看涨；DIF 下穿 DEA → 死叉，看跌' },
    macd: { title: 'MACD 指标', what: 'MACD 通过快慢线交叉判断买卖力量变化。', how: '金叉 → 买方力量增强；死叉 → 卖方力量增强' },
    support: { title: '支撑位', what: '价格下跌时可能止跌反弹的价格区域。', how: '价格靠近支撑位 → 可能获得买盘支撑。跌破支撑位 → 可能进一步走弱' },
    resistance: { title: '压力位', what: '价格上涨时可能遇阻回落的价格区域。', how: '价格靠近压力位 → 上方卖压增大。突破压力位 → 可能进一步走强' },
    volume: { title: '成交量', what: '反映市场参与度和资金关注程度。', how: '放量上涨 → 资金积极买入；放量下跌 → 抛压较重；缩量 → 交投清淡' },
    ma: { title: '均线 (MA)', what: '过去 N 天收盘价的平均值连线，反映趋势方向。', how: '价格在均线之上 → 偏强；之下 → 偏弱；多头排列 → 看涨' },
  };

  var info = helpMap[id] || { title: id, what: '', how: '' };
  var popover = document.createElement('div');
  popover.className = 'help-popover';
  popover.dataset.helpId = id;
  popover.innerHTML = '<strong>' + info.title + '</strong>'
    + '<p style="margin-top:6px"><span style="color:var(--t3)">作用：</span>' + info.what + '</p>'
    + '<p style="margin-top:4px"><span style="color:var(--t3)">解读：</span>' + info.how + '</p>';

  var rect = event.target.getBoundingClientRect();
  popover.style.position = 'fixed';
  popover.style.left = Math.min(rect.left, window.innerWidth - 260) + 'px';
  popover.style.top = (rect.top - 8) + 'px';
  popover.style.zIndex = '300';
  popover.style.width = '240px';
  document.body.appendChild(popover);

  setTimeout(function() {
    var closeHandler = function(e) {
      if (!popover.contains(e.target)) {
        popover.remove();
        document.removeEventListener('click', closeHandler);
      }
    };
    document.addEventListener('click', closeHandler);
  }, 10);
}
window.showHelp = showHelp;

// ─── AI Conclusion Card render ──────────────────────────────────
function renderConclusionCard(a) {
  var container = document.getElementById('conclusion-card');
  if (!container) {
    container = document.createElement('div');
    container.id = 'conclusion-card';
    container.className = 'glass';
    container.style.padding = '24px 28px';
    var layout = document.querySelector('.analysis-layout');
    if (layout) layout.insertBefore(container, layout.firstChild);
    else return;
  }

  var strength = safeNum(a.signal_strength, 50);
  var trend = mapTrend(a.signal_trend);
  var riskLevel = mapRisk(a.signal_risk || a.risk);
  var summary = a.signal_summary || deriveSummary(a);

  // Confidence
  var confText = strength >= 70 ? '🟢 高信心' : strength >= 50 ? '🟡 中等信心' : '🔴 低信心';
  var confColor = strength >= 70 ? '#51cf66' : strength >= 50 ? '#f59e0b' : '#ff6b6b';

  // Hold advice
  var holdText, holdIcon;
  if (trend === '上涨' && riskLevel === '低') { holdText = '建议继续持有'; holdIcon = '💎'; }
  else if (trend === '上涨') { holdText = '持有但注意风险'; holdIcon = '💎'; }
  else if (trend === '震荡') { holdText = '持有观望，等待方向'; holdIcon = '🕐'; }
  else if (riskLevel === '高') { holdText = '建议减仓或观望'; holdIcon = '⚠️'; }
  else { holdText = '可轻仓持有'; holdIcon = '💎'; }

  // Buy advice
  var buyText, buyIcon;
  if (riskLevel === '低' && strength >= 60) { buyText = '可逢低关注'; buyIcon = '🎯'; }
  else if (riskLevel === '中' && strength >= 50) { buyText = '分批建仓，控制仓位'; buyIcon = '🎯'; }
  else if (riskLevel === '高' || strength < 40) { buyText = '暂不建议买入'; buyIcon = '⛔'; }
  else { buyText = '等待更明确信号'; buyIcon = '🕐'; }

  container.innerHTML = ''
    + '<div style="display:flex;align-items:center;gap:8px;margin-bottom:16px">'
    + '<div style="width:22px;height:22px;border-radius:6px;background:linear-gradient(135deg,#f59e0b,#f97316);display:flex;align-items:center;justify-content:center;font-size:11px;color:#000;font-weight:700">AI</div>'
    + '<span style="font-size:15px;font-weight:700;color:var(--t1)">AI 分析结论</span>'
    + '</div>'
    + '<p style="font-size:16px;font-weight:600;line-height:1.6;color:var(--t1);margin-bottom:20px;padding:12px 16px;border-radius:12px;background:rgba(255,255,255,0.04);border-left:3px solid #f59e0b">'
    + summary + '</p>'
    + '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px">'
    + '  <div style="text-align:center;padding:12px 8px;border-radius:10px;background:rgba(255,255,255,0.03)">'
    + '    <div style="font-size:22px;margin-bottom:4px">' + holdIcon + '</div>'
    + '    <div style="font-size:10px;color:var(--t3);letter-spacing:0.5px;margin-bottom:4px">持有建议</div>'
    + '    <div style="font-size:13px;font-weight:600;color:var(--t1)">' + holdText + '</div>'
    + '  </div>'
    + '  <div style="text-align:center;padding:12px 8px;border-radius:10px;background:rgba(255,255,255,0.03)">'
    + '    <div style="font-size:22px;margin-bottom:4px">' + buyIcon + '</div>'
    + '    <div style="font-size:10px;color:var(--t3);letter-spacing:0.5px;margin-bottom:4px">买入建议</div>'
    + '    <div style="font-size:13px;font-weight:600;color:var(--t1)">' + buyText + '</div>'
    + '  </div>'
    + '  <div style="text-align:center;padding:12px 8px;border-radius:10px;background:rgba(255,255,255,0.03)">'
    + '    <div style="font-size:22px;margin-bottom:4px">📊</div>'
    + '    <div style="font-size:10px;color:var(--t3);letter-spacing:0.5px;margin-bottom:4px">AI 信心</div>'
    + '    <div style="font-size:13px;font-weight:600;color:' + confColor + '">' + confText + '</div>'
    + '  </div>'
    + '</div>';
}

// ─── Mode toggle button render ──────────────────────────────────
function renderModeToggle() {
  var container = document.getElementById('mode-toggle');
  if (container) return; // already exists

  var toggleBar = document.createElement('div');
  toggleBar.id = 'mode-toggle';
  toggleBar.style.cssText = 'display:flex;align-items:center;gap:10px;margin-bottom:0';
  var isBeginner = currentMode === 'beginner';
  toggleBar.innerHTML = ''
    + '<button onclick="toggleMode()" class="nav-btn active" style="display:flex;align-items:center;gap:6px;padding:8px 18px">'
    + '<span class="mode-dot ' + (isBeginner ? 'mode-beginner-dot' : 'mode-pro-dot') + '"></span> '
    + (isBeginner ? '🌱 小白模式' : '🔬 专业模式')
    + '</button>';

  // Insert after conclusion-card
  var conclusionCard = document.getElementById('conclusion-card');
  if (conclusionCard && conclusionCard.parentNode) {
    conclusionCard.parentNode.insertBefore(toggleBar, conclusionCard.nextSibling);
  }
}

// ─── Build plain-language explanations ─────────────────────────

var SIGNAL_EXPLAIN_MAP = {
  '股价站上 MA5':  '股价高于 5 日均线，短期趋势偏强',
  '股价站上 MA10': '股价高于 10 日均线，短中期走势偏强',
  '股价站上 MA20': '股价站稳 20 日均线，中期趋势健康',
  '股价站上 MA60': '股价高于 60 日均线，长期趋势向上',
  'MA 多头排列':   '均线呈多头排列（短期均线在上、长期在下），说明中期趋势向上，买入力量占优',
  'MA 空头排列':   '均线呈空头排列（短期均线在下、长期在上），说明中期趋势向下，卖出压力较大',
  'MACD 金叉':     'MACD 出现金叉信号，短期买盘力量增强，趋势可能转强',
  'MACD 死叉':     'MACD 出现死叉信号，短期卖盘力量增强，趋势可能转弱',
  'MACD 柱转正':   'MACD 柱状图由负转正，多头动能开始占优',
  'MACD 柱转负':   'MACD 柱状图由正转负，空头动能开始占优',
  'DIF 零轴上方向好':  'DIF 线在零轴上方上行，处于强势区域',
  'DIF 零轴下方向差':  'DIF 线在零轴下方下行，处于弱势区域',
  'DIF 高位超买':   'DIF 处于高位，注意超买回调风险',
  'DIF 低位超卖':   'DIF 处于低位，可能出现超卖反弹',
  '放量上涨':       '成交量放大配合价格上涨，说明资金活跃且方向明确',
  '放量下跌':       '成交量放大配合价格下跌，说明抛压较重',
  '缩量上涨（动能不足）': '价格上涨但成交量萎缩，上涨动能不足，可能冲高回落',
  '缩量下跌（抛压减弱）': '价格下跌但成交量萎缩，抛压有所减轻，可能企稳',
  '成交量显著放大':  '成交量明显高于近期均值，市场关注度提升',
  '成交量萎缩':     '成交量低于近期均值，市场交投清淡',
  '⚠ 顶背离':      '价格创新高但 MACD 动能减弱，出现顶背离，注意回调风险',
  '★ 底背离':      '价格创新低但 MACD 动能增强，出现底背离，可能止跌反弹',
};

function buildExplanations(a) {
  var explanations = [];

  // 1. Add signal-based explanations
  var signals = a.signals || [];
  var seenSignals = {};
  for (var i = 0; i < signals.length; i++) {
    var sig = signals[i];
    if (!sig || seenSignals[sig]) continue;
    seenSignals[sig] = true;
    var text = SIGNAL_EXPLAIN_MAP[sig] || sig;
    if (text) {
      explanations.push({ icon: '📊', text: text });
    }
  }

  // 2. Crossover signal
  if (a.crossover_type === 'golden_cross' || a.crossover === '金叉') {
    explanations.push({ icon: '📈', text: 'MACD 出现金叉信号，短期买盘力量增强，趋势可能转强' });
  } else if (a.crossover_type === 'dead_cross' || a.crossover === '死叉') {
    explanations.push({ icon: '📉', text: 'MACD 出现死叉信号，短期卖盘力量增强，趋势可能转弱' });
  }

  // 3. Trend direction
  if (a.trend_direction === '上升') {
    explanations.push({ icon: '↗', text: '价格趋势呈上升方向，整体走势偏强' });
  } else if (a.trend_direction === '下降') {
    explanations.push({ icon: '↘', text: '价格趋势呈下降方向，整体走势偏弱' });
  }

  // 4. Support/resistance proximity
  var price = safeNum(a.price, 0);
  var support = safeNum(a.support, 0);
  var resistance = safeNum(a.resistance, 0);
  if (price > 0) {
    if (support > 0) {
      var distToSupport = ((price - support) / support * 100);
      if (distToSupport < 5 && distToSupport > 0) {
        explanations.push({ icon: '🛡', text: '股价距支撑位 ¥' + support.toFixed(2) + ' 仅 ' + distToSupport.toFixed(1) + '%，若跌破可能加速下行' });
      }
    }
    if (resistance > 0) {
      var distToResistance = ((resistance - price) / price * 100);
      if (distToResistance < 5 && distToResistance > 0) {
        explanations.push({ icon: '⚡', text: '股价距压力位 ¥' + resistance.toFixed(2) + ' 仅 ' + distToResistance.toFixed(1) + '%，注意冲高回落' });
      }
    }
  }

  // 5. Volume
  var latestVol = safeNum(a.latest_volume, 0);
  var avgVol = safeNum(a.avg_volume, 0);
  if (latestVol > 0 && avgVol > 0) {
    var volRatio = latestVol / avgVol;
    if (volRatio > 1.5) {
      explanations.push({ icon: '🔥', text: '成交量高于近 5 日均值 ' + (volRatio * 100).toFixed(0) + '%，资金活跃度较高' });
    } else if (volRatio < 0.5) {
      explanations.push({ icon: '💤', text: '成交量低于近 5 日均值，市场交投清淡' });
    }
  }

  // 6. Key points from backend
  var keyPoints = a.key_points || a.keyPoints || [];
  for (var j = 0; j < keyPoints.length; j++) {
    var kp = keyPoints[j];
    if (kp && explanations.length < 8) {
      explanations.push({ icon: '💡', text: kp });
    }
  }

  return explanations;
}

// ═══════════════════════════════════════
// RENDER ALL (unified three-layer)
// ═══════════════════════════════════════
function renderAll(a) {
  renderConclusionCard(a);
  renderModeToggle();
  renderStockHeader(a);
  renderSpeedRead(a);
  renderExplanations(a);
  renderProfessionalDetails(a);

  // Update section titles based on mode
  var explainHeader = document.querySelector('#expand-explain .expand-header span:first-child');
  if (explainHeader) {
    explainHeader.textContent = currentMode === 'beginner' ? '🌱 简易解读' : '💡 AI 分析依据';
  }
  var detailHeader = document.querySelector('#expand-details .expand-header span:first-child');
  if (detailHeader) {
    detailHeader.textContent = currentMode === 'beginner' ? '📖 简易详情' : '🔬 专业详情';
  }

  // Ensure Lenis knows about height changes after content re-render
  setTimeout(function () {
    if (lenis) lenis.resize();
  }, 50);

  // K-line chart
  var kline = a.kline || a.kline_data || [];
  if (typeof ChartManager !== 'undefined') ChartManager.drawKlineChart(kline);

  // Full AI text (hidden, available in professional details)
  var at = $('analysis-text');
  if (at) {
    at.innerHTML = (a.analysis || '').replace(/\n/g, '<br>').replace(/【(.+?)】/g, '<strong>$1</strong>');
  }
}

// ── Stock header ──
function renderStockHeader(a) {
  setText('stock-name', a.stock_name);
  setText('stock-code', a.stock_code);
  var price = safeNum(a.price, 0);
  setText('current-price', '¥' + price.toFixed(2));

  var pct = safeNum(a.change_percent, 0);
  var ce = $('change-percent');
  if (ce) {
    ce.innerHTML = (pct > 0 ? '▲' : pct < 0 ? '▼' : '—') + ' ' + (pct > 0 ? '+' : '') + pct.toFixed(2) + '%';
    ce.className = 'stock-change ' + (pct > 0 ? 'up' : pct < 0 ? 'down' : 'flat');
  }
}

// ── Layer 1: AI 速览 ──
function renderSpeedRead(a) {
  var strength = safeNum(a.signal_strength, 50);
  var trend = mapTrend(a.signal_trend);
  var riskLevel = mapRisk(a.signal_risk || a.risk);
  var suggestion = a.recommendation || deriveSuggestion(a);
  var summary = a.signal_summary || deriveSummary(a);

  // Score ring animation
  var arc = $('score-arc');
  if (arc) {
    var circumference = 327;
    var offset = circumference - (strength / 100) * circumference;
    arc.setAttribute('stroke-dashoffset', offset);
    var color = strength >= 70 ? '#51cf66' : strength >= 55 ? '#f59e0b' : strength >= 40 ? '#8e8e93' : '#ff6b6b';
    arc.setAttribute('stroke', color);
  }
  var scoreNum = $('score-num');
  if (scoreNum) {
    scoreNum.textContent = strength;
    scoreNum.style.color = strength >= 55 ? '#51cf66' : strength >= 40 ? '#f59e0b' : '#ff6b6b';
  }

  // Trend badge
  var srTrend = $('sr-trend');
  if (srTrend) {
    srTrend.textContent = trend;
    srTrend.className = 'sr-badge ' + (
      trend === '上涨' || trend === '偏强震荡' ? 'up' :
      trend === '下跌' || trend === '偏弱震荡' ? 'down' : 'neutral'
    );
  }

  // Risk badge — with specific reasons
  var srRisk = $('sr-risk');
  if (srRisk) {
    srRisk.textContent = riskLevel + '风险';
    srRisk.className = 'sr-badge ' + (
      riskLevel === '低' ? 'risk-low' :
      riskLevel === '高' ? 'risk-high' : 'risk-mid'
    );
  }

  // Risk reasons (beginner-friendly)
  var riskReasons = deriveRiskReasons(a);
  var srRiskDetail = document.getElementById('sr-risk-reasons');
  if (!srRiskDetail) {
    srRiskDetail = document.createElement('div');
    srRiskDetail.id = 'sr-risk-reasons';
    srRiskDetail.style.cssText = 'margin-top:6px';
    if (srRisk) {
      var riskRow = srRisk.closest('.sr-row');
      if (riskRow && riskRow.parentNode) {
        riskRow.parentNode.insertBefore(srRiskDetail, riskRow.nextSibling);
      }
    }
  }
  srRiskDetail.innerHTML = riskReasons.map(function(r) {
    return '<p style="color:var(--t3);font-size:11px;line-height:1.5;margin:0"> · ' + r + '</p>';
  }).join('');

  // Suggestion
  setText('sr-suggestion', suggestion);

  // Summary
  setText('sr-summary', summary);
}

// ── Layer 2: AI 解释 ──
function renderExplanations(a) {
  var explanations = buildExplanations(a);
  var list = $('explain-list');
  if (!list) return;

  if (explanations.length === 0) {
    list.innerHTML = '<p style="color:var(--t3);text-align:center;padding:16px;font-size:13px">暂无分析依据</p>';
    return;
  }

  var html = '';
  for (var i = 0; i < explanations.length; i++) {
    var item = explanations[i];
    html += '<div class="explain-item">';
    html += '<div class="explain-icon">' + (item.icon || '📊') + '</div>';
    html += '<div class="explain-text">' + (item.text || '') + '</div>';
    html += '</div>';
  }
  list.innerHTML = html;
}

// ── Layer 3: 专业详情 ──
function renderProfessionalDetails(a) {
  var container = $('pro-details-content');
  if (!container) return;

  var price = safeNum(a.price, 0);
  var isBeginner = currentMode === 'beginner';
  var html = '';

  // ── Section: MACD (hidden in beginner mode) ──
  if (!isBeginner) {
    html += '<div class="pro-section-title">📉 MACD 指标 <span style="font-weight:400;color:var(--t3);font-size:10px;cursor:pointer" onclick="showHelp(\'macd\',event)"> ⓘ</span></div>';
    html += '<div class="pro-row"><span class="pro-row-label">DIF <span style="cursor:pointer;color:var(--t3)" onclick="showHelp(\'dif\',event)">ⓘ</span></span><span class="pro-row-value">' + safeNum(a.macd, 0).toFixed(3) + '</span></div>';
    html += '<div class="pro-row"><span class="pro-row-label">DEA (Signal) <span style="cursor:pointer;color:var(--t3)" onclick="showHelp(\'dea\',event)">ⓘ</span></span><span class="pro-row-value">' + safeNum(a.signal, 0).toFixed(3) + '</span></div>';
    html += '<div class="pro-row"><span class="pro-row-label">Histogram</span><span class="pro-row-value">' + safeNum(a.macd_histogram, 0).toFixed(3) + '</span></div>';
    var crossover = a.crossover || (a.crossover_type === 'golden_cross' ? '金叉' : a.crossover_type === 'dead_cross' ? '死叉' : '无');
    html += '<div class="pro-row"><span class="pro-row-label">交叉信号</span><span class="pro-row-value">' + safeStr(crossover) + '</span></div>';
  } else {
    // Beginner：MACD 简易版本
    var macdSignal = a.crossover || (a.crossover_type === 'golden_cross' ? '金叉' : a.crossover_type === 'dead_cross' ? '死叉' : '中性');
    var macdExplain = macdSignal === '金叉' ? '买方力量开始增强，趋势可能转好' : macdSignal === '死叉' ? '卖方力量开始增强，趋势可能转弱' : '信号不明确，方向待确认';
    html += '<div class="pro-section-title" style="margin-top:8px">📉 买卖力量</div>';
    html += '<div class="pro-row"><span class="pro-row-label">当前信号</span><span class="pro-row-value" style="font-size:13px">' + macdSignal + '</span></div>';
    html += '<div class="pro-row"><span class="pro-row-label">解读</span><span class="pro-row-value" style="font-size:12px;color:var(--t2);font-weight:400">' + macdExplain + '</span></div>';
  }

  // ── Section: 均线 & 价位 ──
  html += '<div class="pro-section-title" style="margin-top:8px">📊 ' + (isBeginner ? '价位分析' : '均线与价位') + '</div>';
  html += '<div class="pro-row"><span class="pro-row-label">当前价格</span><span class="pro-row-value">¥' + price.toFixed(2) + '</span></div>';
  html += '<div class="pro-row"><span class="pro-row-label">支撑位 <span style="cursor:pointer;color:var(--t3)" onclick="showHelp(\'support\',event)">ⓘ</span></span><span class="pro-row-value">¥' + safeNum(a.support, 0).toFixed(2) + '</span></div>';
  html += '<div class="pro-row"><span class="pro-row-label">压力位 <span style="cursor:pointer;color:var(--t3)" onclick="showHelp(\'resistance\',event)">ⓘ</span></span><span class="pro-row-value">¥' + safeNum(a.resistance, 0).toFixed(2) + '</span></div>';
  html += '<div class="pro-row"><span class="pro-row-label">趋势方向</span><span class="pro-row-value">' + safeStr(a.trend_direction) + '</span></div>';
  html += '<div class="pro-row"><span class="pro-row-label">趋势强度</span><span class="pro-row-value">' + safeStr(a.trend_strength) + '</span></div>';

  if (!isBeginner) {
    html += '<div class="pro-row"><span class="pro-row-label">成交量(近10日均量) <span style="cursor:pointer;color:var(--t3)" onclick="showHelp(\'volume\',event)">ⓘ</span></span><span class="pro-row-value">' + (safeNum(a.avg_volume, 0) / 10000).toFixed(0) + ' 万手</span></div>';
  } else {
    html += '<div class="pro-row"><span class="pro-row-label">成交量 <span style="cursor:pointer;color:var(--t3)" onclick="showHelp(\'volume\',event)">ⓘ</span></span><span class="pro-row-value">' + (safeNum(a.avg_volume, 0) / 10000).toFixed(0) + ' 万手</span></div>';
  }

  // ── Section: 策略建议 (hidden in beginner mode) ──
  if (!isBeginner) {
    html += '<div class="pro-section-title" style="margin-top:8px">🎯 策略建议</div>';
    html += '<div class="pro-row"><span class="pro-row-label">操作倾向</span><span class="pro-row-value">' + safeStr(a.strategy_bias) + '</span></div>';
    html += '<div class="pro-row"><span class="pro-row-label">置信度</span><span class="pro-row-value">' + safeNum(a.strategy_confidence, 0) + '%</span></div>';
    html += '<div class="pro-row"><span class="pro-row-label">止损位</span><span class="pro-row-value">¥' + safeNum(a.strategy_stop_loss, 0).toFixed(2) + '</span></div>';
    html += '<div class="pro-row"><span class="pro-row-label">止盈位</span><span class="pro-row-value">¥' + safeNum(a.strategy_take_profit, 0).toFixed(2) + '</span></div>';
    html += '<div class="pro-row"><span class="pro-row-label">仓位建议</span><span class="pro-row-value">' + safeStr(a.strategy_position) + '</span></div>';
  }

  // ── Section: 板块 ──
  var sector = a.sector || {};
  if (sector.name) {
    html += '<div class="pro-section-title" style="margin-top:8px">🏭 所属板块</div>';
    html += '<div class="pro-row"><span class="pro-row-label">板块名称</span><span class="pro-row-value">' + safeStr(sector.name) + '</span></div>';
    html += '<div class="pro-row"><span class="pro-row-label">板块热度</span><span class="pro-row-value">' + safeStr(sector.heat) + '</span></div>';
    var concepts = sector.concepts || [];
    if (concepts.length > 0) {
      html += '<div class="pro-row"><span class="pro-row-label">概念标签</span><span class="pro-row-value"><div class="tag-row" style="justify-content:flex-end">';
      for (var ci = 0; ci < concepts.length; ci++) {
        html += '<span class="tag">' + concepts[ci] + '</span>';
      }
      html += '</div></span></div>';
    }
  }

  // ── Section: 相关股票 ──
  var related = a.related_stocks || [];
  if (related.length > 0) {
    html += '<div class="pro-section-title" style="margin-top:8px">🔗 相关股票</div>';
    html += '<div class="sector-scroll" style="padding:4px 0">';
    for (var ri = 0; ri < related.length; ri++) {
      var s = related[ri];
      var sp = safeNum(s.price, 0);
      var scp = safeNum(s.change_percent, 0);
      var scpUp = scp > 0 ? 'up' : scp < 0 ? 'down' : '';
      html += '<div class="glass sector-card">';
      html += '<div class="sector-card-name">' + safeStr(s.name) + '</div>';
      html += '<div class="sector-card-price">¥' + sp.toFixed(2) + '</div>';
      html += '<div class="sector-card-change ' + scpUp + '">' + (scp > 0 ? '+' : '') + scp.toFixed(2) + '%</div>';
      if (s.tag) html += '<div class="sector-card-tag">' + safeStr(s.tag) + '</div>';
      html += '</div>';
    }
    html += '</div>';
  }

  // ── Section: 信号因子详细分数 (hidden in beginner mode) ──
  var factors = a.signal_factors || a.factors || {};
  if (!isBeginner && Object.keys(factors).length > 0) {
    html += '<div class="pro-section-title" style="margin-top:8px">⚙ 信号因子评分</div>';
    var factorKeys = Object.keys(factors);
    for (var fi = 0; fi < factorKeys.length; fi++) {
      var key = factorKeys[fi];
      var factor = factors[key];
      var label = factor.label || key;
      var fscore = safeNum(factor.score, 0);
      var fweight = safeNum(factor.weight, 0);
      html += '<div class="pro-row">';
      html += '<span class="pro-row-label">' + label + ' (权重 ' + fweight + '%)</span>';
      html += '<span class="pro-row-value">' + fscore + ' 分</span>';
      html += '</div>';
    }
  }

  // ── Section: 原始信号列表 (hidden in beginner mode — contains professional terms) ──
  var rawSignals = a.signals || [];
  if (!isBeginner && rawSignals.length > 0) {
    html += '<div class="pro-section-title" style="margin-top:8px">📋 原始信号</div>';
    html += '<div style="padding:4px 14px">';
    html += '<div class="tag-row">';
    for (var si = 0; si < rawSignals.length; si++) {
      html += '<span class="tag">' + safeStr(rawSignals[si]) + '</span>';
    }
    html += '</div></div>';
  }

  // ── Section: 完整 AI 分析报告 (hidden in beginner mode — contains professional analysis) ──
  if (!isBeginner && a.analysis) {
    html += '<div class="pro-section-title" style="margin-top:8px">📝 完整分析报告</div>';
    html += '<div style="padding:10px 14px;font-size:14px;color:var(--t2);line-height:1.7">';
    html += (a.analysis || '').replace(/\n/g, '<br>').replace(/【(.+?)】/g, '<strong>$1</strong>');
    html += '</div>';
  }

  container.innerHTML = html;
}

// ═══════════════════════════════════════
// DOM helpers
// ═══════════════════════════════════════
function setText(id, val) {
  var el = $(id);
  if (el) el.textContent = val || '--';
}

// ═══════════════════════════════════════
// HISTORY DRAWER
// ═══════════════════════════════════════
function openDrawer() { document.getElementById('drawer-overlay').classList.add('open'); document.getElementById('drawer').classList.add('open'); loadDrawerHistory(0); }
function closeDrawer() { document.getElementById('drawer-overlay').classList.remove('open'); document.getElementById('drawer').classList.remove('open'); }
async function loadDrawerHistory(page) {
  page = page || 0;
  try {
    var r = await APIClient.getHistory(PAGE_SIZE, page * PAGE_SIZE);
    var list = document.getElementById('drawer-list');
    if (!r.data || !r.data.length) { list.innerHTML = '<p style="color:var(--t3);text-align:center;padding:32px">暂无</p>'; document.getElementById('drawer-pagination').innerHTML = ''; return; }
    list.innerHTML = r.data.map(function(i) {
      var p = safeNum(i.change_percent, 0);
      return '<div class="drawer-item" onclick="viewDrawerDetail(\'' + i.id + '\')"><div class="drawer-item-name">' + safeStr(i.stock_name, '未知') + ' <span style="color:var(--t3);font-size:12px">' + safeStr(i.stock_code, '') + '</span></div><div class="drawer-item-meta"><span>¥' + safeNum(i.price, 0).toFixed(2) + '</span><span style="color:' + (p > 0 ? 'var(--up)' : p < 0 ? 'var(--down)' : 'var(--t3)') + '">' + (p > 0 ? '+' : '') + p.toFixed(2) + '%</span></div></div>';
    }).join('');
    var tp = Math.ceil((r.pagination && r.pagination.total || 0) / PAGE_SIZE);
    document.getElementById('drawer-pagination').innerHTML = tp > 1 ? Array.from({ length: tp }, function(_, i) { return '<button class="' + (i === page ? 'active' : '') + '" onclick="loadDrawerHistory(' + i + ')">' + (i + 1) + '</button>'; }).join('') : '';
  } catch (e) { document.getElementById('drawer-list').innerHTML = '<p style="color:var(--up);text-align:center;padding:32px">加载失败</p>'; }
}
async function viewDrawerDetail(id) {
  try {
    var a = await APIClient.getAnalysis(id); if (!a) { alert('不存在'); return; }
    if (!a.kline && a.kline_data) a.kline = a.kline_data;
    currentAnalysis = a; renderAll(a); closeDrawer(); scrollToSection(1);
  } catch (e) { alert('失败:' + e.message); }
}

// ═══════════════════════════════════════
// WATCHLIST — AI 自选股
// ═══════════════════════════════════════

// 当前关注的股票代码缓存（用于按钮状态切换）
let _watchlistCache = [];

/** 映射 trend 到显示文本 */
function mapWlTrend(trend) {
  var map = {
    'bullish': '增强',
    'mildly_bullish': '偏强',
    'neutral': '震荡',
    'mildly_bearish': '偏弱',
    'bearish': '减弱',
    '上涨': '增强',
    '下跌': '减弱',
  };
  return map[trend] || trend || '震荡';
}

/** 风险显示文本 */
function mapWlRisk(risk) {
  if (!risk) return '中';
  var r = String(risk).toLowerCase();
  if (r === 'low' || r === '低') return '低';
  if (r === 'high' || r === '高') return '高';
  return '中';
}

/** 刷新 watchlist 缓存并从后端加载 */
async function refreshWatchlistCache() {
  try {
    _watchlistCache = await APIClient.getWatchlist();
  } catch (e) {
    _watchlistCache = [];
  }
  return _watchlistCache;
}

/** 检查当前股票是否已在关注列表 */
function isInWatchlist(stockCode) {
  return _watchlistCache.some(function(item) {
    return item.stock_code === stockCode;
  });
}

/** 更新「加入关注」按钮状态 */
function updateWatchlistBtnState() {
  var btn = $('btn-add-watchlist');
  if (!btn) return;
  if (!currentAnalysis) { btn.style.display = 'none'; return; }
  btn.style.display = 'inline-flex';
  if (isInWatchlist(currentAnalysis.stock_code)) {
    btn.textContent = '⭐ 已关注';
    btn.disabled = true;
    btn.style.opacity = '0.6';
    btn.style.cursor = 'default';
  } else {
    btn.textContent = '⭐ 加入关注';
    btn.disabled = false;
    btn.style.opacity = '1';
    btn.style.cursor = 'pointer';
  }
}

/** 添加当前股票到关注列表 */
async function addToWatchlist() {
  if (!currentAnalysis) return;
  var a = currentAnalysis;
  var btn = $('btn-add-watchlist');
  if (!btn) return;

  // 防止重复添加
  if (isInWatchlist(a.stock_code)) {
    updateWatchlistBtnState();
    return;
  }

  btn.textContent = '⏳ 添加中…';
  btn.disabled = true;

  try {
    await APIClient.addToWatchlist({
      stock_code: a.stock_code,
      stock_name: a.stock_name,
      signal_strength: safeNum(a.signal_strength, 50),
      signal_risk: a.signal_risk || a.risk || 'medium',
      signal_trend: a.signal_trend || '',
      analysis_id: a.id
    });
    await refreshWatchlistCache();
    updateWatchlistBtnState();
  } catch (e) {
    btn.textContent = '⭐ 加入关注';
    btn.disabled = false;
    alert('添加失败: ' + e.message);
  }
}
window.addToWatchlist = addToWatchlist;

/** 打开关注列表抽屉 */
function openWatchlistDrawer() {
  document.getElementById('wl-overlay').classList.add('open');
  document.getElementById('wl-drawer').classList.add('open');
  loadWatchlist();
}
function closeWatchlistDrawer() {
  document.getElementById('wl-overlay').classList.remove('open');
  document.getElementById('wl-drawer').classList.remove('open');
}
window.openWatchlistDrawer = openWatchlistDrawer;
window.closeWatchlistDrawer = closeWatchlistDrawer;

/** 加载并渲染关注列表 */
async function loadWatchlist() {
  var list = document.getElementById('wl-list');
  if (!list) return;

  try {
    var items = await refreshWatchlistCache();
    if (!items || items.length === 0) {
      list.innerHTML = '<p style="color:var(--t3);text-align:center;padding:48px 16px;font-size:14px">暂无关注股票<br><span style="font-size:12px">分析完成后点击「加入关注」即可添加</span></p>';
      return;
    }

    list.innerHTML = items.map(function(item) {
      var trendText = mapWlTrend(item.signal_trend);
      var riskText = mapWlRisk(item.signal_risk);
      var score = safeNum(item.signal_strength, 0);
      var scoreColor = score >= 70 ? '#51cf66' : score >= 55 ? '#f59e0b' : score >= 40 ? '#8e8e93' : '#ff6b6b';
      var trendClass = item.signal_trend === 'bullish' || item.signal_trend === 'mildly_bullish' || item.signal_trend === '增强' || item.signal_trend === '上涨'
        ? 'up' : (item.signal_trend === 'bearish' || item.signal_trend === 'mildly_bearish' || item.signal_trend === '减弱' || item.signal_trend === '下跌'
          ? 'down' : 'neutral');
      var riskClass = riskText === '低' ? 'risk-low' : riskText === '高' ? 'risk-high' : 'risk-mid';

      return '<div class="drawer-item" style="padding:16px;cursor:pointer" onclick="openWatchlistItem(' + item.id + ')">' +
        '<div style="display:flex;justify-content:space-between;align-items:flex-start">' +
          '<div>' +
            '<div class="drawer-item-name">' + safeStr(item.stock_name) + '</div>' +
            '<div style="font-size:12px;color:var(--t3);margin-top:2px">' + safeStr(item.stock_code) + '</div>' +
          '</div>' +
          '<div style="text-align:right">' +
            '<div style="font-size:20px;font-weight:200;color:' + scoreColor + '">' + score + '</div>' +
            '<div style="font-size:10px;color:var(--t3);text-transform:uppercase">AI评分</div>' +
          '</div>' +
        '</div>' +
        '<div style="display:flex;gap:12px;margin-top:10px;align-items:center">' +
          '<span class="sr-badge ' + trendClass + '" style="font-size:11px;padding:2px 10px">趋势 ' + trendText + '</span>' +
          '<span class="sr-badge ' + riskClass + '" style="font-size:11px;padding:2px 10px">风险 ' + riskText + '</span>' +
          '<button class="nav-btn" style="margin-left:auto;padding:4px 12px;font-size:12px" onclick="event.stopPropagation();removeFromWatchlist(' + item.id + ', this)">🗑 删除</button>' +
        '</div>' +
      '</div>';
    }).join('');
  } catch (e) {
    list.innerHTML = '<p style="color:var(--up);text-align:center;padding:32px">加载失败</p>';
  }
}

/** 打开关注项：获取完整分析数据并渲染 */
async function openWatchlistItem(watchlistId) {
  var item = _watchlistCache.find(function(w) { return w.id === watchlistId; });
  if (!item) {
    alert('未找到该关注记录');
    return;
  }

  // 优先使用 analysis_id 获取完整分析
  var analysisId = item.analysis_id;
  var analysis = null;

  if (analysisId) {
    try {
      analysis = await APIClient.getAnalysis(analysisId);
    } catch (e) {
      console.warn('通过 analysis_id 获取失败，尝试搜索股票最新记录', e.message);
    }
  }

  // 降级：通过 stock_code 搜索最新的分析记录
  if (!analysis) {
    try {
      var searchResult = await APIClient.search(item.stock_code, 1);
      if (searchResult && searchResult.data && searchResult.data.length > 0) {
        var latest = searchResult.data[0];
        analysis = await APIClient.getAnalysis(latest.id);
      }
    } catch (e) {
      console.warn('搜索股票记录失败', e.message);
    }
  }

  if (!analysis) {
    alert('未找到该股票的分析记录，请重新上传截图分析');
    return;
  }

  // 标准化 kline 字段
  if (!analysis.kline && analysis.kline_data) analysis.kline = analysis.kline_data;

  currentAnalysis = analysis;
  renderAll(analysis);
  closeWatchlistDrawer();
  scrollToSection(1);
}
window.openWatchlistItem = openWatchlistItem;

/** 取消关注 */
async function removeFromWatchlist(id, btnEl) {
  if (!confirm('确定取消关注？')) return;
  try {
    await APIClient.removeFromWatchlist(id);
    // 重新加载列表
    await loadWatchlist();
    // 如果当前分析的股票被取消关注，更新按钮状态
    if (currentAnalysis) {
      updateWatchlistBtnState();
    }
  } catch (e) {
    alert('取消关注失败: ' + e.message);
  }
}
window.removeFromWatchlist = removeFromWatchlist;

/** 在 renderAll 后调用，刷新关注按钮状态 */
// 扩展 renderAll 以包含 watchlist 状态更新
var _origRenderAll = renderAll;
renderAll = function(a) {
  _origRenderAll(a);
  // 加载 watchlist 缓存并更新按钮状态
  refreshWatchlistCache().then(function() {
    updateWatchlistBtnState();
  });
};
