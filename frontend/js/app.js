/**
 * SnapVision App — Liquid Glass Edition
 * Apple-style interactions, spring animations, AI terminal effects
 */

let currentAnalysis = null;
let currentHistoryPage = 0;
const HISTORY_LIMIT = 10;

// ── DOM ──
const uploadZone    = document.getElementById('upload-zone');
const fileInput     = document.getElementById('file-input');
const fileInfo      = document.getElementById('file-info');
const fileName      = document.getElementById('file-name');
const resultSection = document.getElementById('result-section');
const loadingState  = document.getElementById('loading-state');
const errorState    = document.getElementById('error-state');
const errorMessage  = document.getElementById('error-message');
const historySection = document.getElementById('history-section');
const uploadSection  = document.getElementById('upload-section');
const scanLine      = document.querySelector('.scan-line');

// ── Init ──
document.addEventListener('DOMContentLoaded', () => {
  setupUploadZone();
  setupGlobalErrorHandler();
  loadHistory();
});

function setupGlobalErrorHandler() {
  window.addEventListener('error', (e) => console.error('Global error:', e.error));
  window.addEventListener('unhandledrejection', (e) => console.error('Promise:', e.reason));
}

// ── Utilities ──
function toNumber(value, fallback = 0) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : fallback;
  if (typeof value === 'string') {
    const cleaned = value.replace(/[￥,\s]/g, '').replace(/%/g, '').replace(/[^\d.-]/g, '');
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : fallback;
  }
  return fallback;
}
function formatPrice(value, digits = 2) { return (toNumber(value, 0) || 0).toFixed(digits); }
function formatPercent(value, digits = 2) { const n = toNumber(value, 0) || 0; return `${n > 0 ? '+' : ''}${n.toFixed(digits)}%`; }

// ── Upload Zone — Liquid Glass scan effect ──
function setupUploadZone() {
  uploadZone.addEventListener('click', () => fileInput.click());

  uploadZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadZone.classList.add('drag-active');
  });
  uploadZone.addEventListener('dragleave', () => {
    uploadZone.classList.remove('drag-active');
  });
  uploadZone.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadZone.classList.remove('drag-active');
    if (e.dataTransfer.files.length > 0) handleFileSelect(e.dataTransfer.files[0]);
  });
  fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) handleFileSelect(e.target.files[0]);
  });
}

async function handleFileSelect(file) {
  try {
    if (!file.type.startsWith('image/')) throw new Error(I18n.t('error.file_type'));
    if (file.size > 10485760) throw new Error(I18n.t('error.file_size'));

    fileName.textContent = file.name;
    fileInfo.classList.remove('hidden');

    // Start scan animation
    uploadZone.classList.add('scanning');
    showLoading();

    const analysis = await APIClient.analyzeImage(file);
    currentAnalysis = analysis;

    uploadZone.classList.remove('scanning');
    displayAnalysisResults(analysis);
    showResults();
  } catch (error) {
    console.error('File error:', error);
    uploadZone.classList.remove('scanning');
    showError(error.message || I18n.t('error.unknown'));
  }
}

// ── Display Results ──
function displayAnalysisResults(analysis) {
  const stockName = analysis?.stock_name ?? '未知股票';
  const stockCode = analysis?.stock_code ?? '--';
  const price = analysis?.price ?? 0;
  const changePct = toNumber(analysis?.change_percent, 0);
  const changeAmt = toNumber(analysis?.change, 0);

  // ── Stock Header ──
  document.getElementById('stock-name').textContent = stockName;
  document.getElementById('stock-code').textContent = stockCode;
  document.getElementById('current-price').textContent = `¥${formatPrice(price)}`;

  const changeEl = document.getElementById('change-percent');
  const isUp = changePct > 0, isDown = changePct < 0;
  changeEl.innerHTML = `
    <span>${isUp ? '▲' : isDown ? '▼' : '—'} ${formatPercent(changePct)}</span>
    <span style="font-size:14px;opacity:0.7">${changeAmt !== 0 ? (changeAmt > 0 ? '+' : '') + changeAmt.toFixed(2) : ''}</span>
  `;
  changeEl.className = `stock-change ${isUp ? 'up' : isDown ? 'down' : ''}`;

  // ── Indicators ──
  const support = analysis?.support ?? 0;
  const resistance = analysis?.resistance ?? 0;
  document.getElementById('support-value').textContent = `¥${formatPrice(support)}`;
  document.getElementById('resistance-value').textContent = `¥${formatPrice(resistance)}`;
  // Distance indicators
  if (price > 0 && support > 0) {
    const dist = ((price - support) / support * 100).toFixed(1);
    document.getElementById('support-dist').textContent = dist > 0 ? `${dist}% ↑` : `${Math.abs(dist)}% ↓`;
  }
  if (price > 0 && resistance > 0) {
    const dist = ((resistance - price) / price * 100).toFixed(1);
    document.getElementById('resistance-dist').textContent = dist > 0 ? `${dist}% ↑` : `${Math.abs(dist)}% ↓`;
  }

  const macd = analysis?.macd ?? 0;
  const signal = analysis?.signal ?? 0;
  const histogram = analysis?.macd_histogram ?? 0;
  document.getElementById('macd-value').textContent = Number(macd).toFixed(3);
  document.getElementById('signal-value').textContent = Number(signal).toFixed(3);
  document.getElementById('histogram-value').textContent = Number(histogram).toFixed(3);
  // MACD color coding
  document.getElementById('macd-value').className = 'indicator-value ' + (macd > 0 ? 'text-positive' : 'text-negative');
  document.getElementById('histogram-value').className = 'indicator-value ' + (histogram > 0 ? 'text-positive' : 'text-negative');

  // ── Crossover Badge ──
  const xBadge = document.getElementById('crossover-badge');
  const xType = analysis?.crossover_type;
  xBadge.textContent = I18n.t(I18n.mapCrossover(analysis?.crossover));
  xBadge.className = 'badge ' + (xType === 'golden_cross' ? 'badge-golden' : xType === 'dead_cross' ? 'badge-dead' : 'badge-neutral');

  // ── Recommendation ──
  const recBadge = document.getElementById('recommendation-badge');
  const rec = analysis?.recommendation ?? '';
  recBadge.textContent = rec ? I18n.t(I18n.mapRecommendation(rec)) : '—';
  if (rec) {
    const recKey = I18n.mapRecommendation(rec);
    if (recKey === 'rec.bull' || recKey === 'rec.hold' || recKey === 'rec.add') recBadge.className = 'badge badge-bull';
    else if (recKey === 'rec.bear' || recKey === 'rec.reduce' || recKey === 'rec.wait') recBadge.className = 'badge badge-bear';
    else recBadge.className = 'badge badge-neutral';
  }

  // ── Trend & Risk ──
  const trendDir = analysis?.trend_direction ?? '';
  document.getElementById('trend-direction').textContent = trendDir ? I18n.t(I18n.mapTrend(trendDir)) : '—';
  const risk = analysis?.risk ?? '';
  const riskEl = document.getElementById('risk-level');
  riskEl.textContent = risk ? I18n.t(I18n.mapRisk(risk)) : '—';
  const riskKey = I18n.mapRisk(risk);
  riskEl.className = 'risk-value ' + (riskKey === 'risk.high' ? 'risk-high' : riskKey === 'risk.mid' || riskKey === 'risk.mid_high' ? 'risk-mid' : 'risk-low');

  // ── Market Info ──
  const mktName = analysis?.market_name ?? '';
  document.getElementById('market-tag').textContent = mktName ? I18n.t(I18n.mapMarket(mktName)) : '';
  document.getElementById('data-source-tag').textContent = analysis?.data_source ?? '';
  if (analysis?.data_updated_at) {
    document.getElementById('data-time').textContent = new Date(analysis.data_updated_at).toLocaleString('zh-CN');
  }

  // ── AI Signal Engine ──
  displaySignalCard(analysis);

  // ── AI Analysis ──
  const aiText = analysis?.analysis ?? '暂无分析结果';
  document.getElementById('analysis-text').innerHTML = aiText
    .replace(/\n/g, '<br>')
    .replace(/【(.+?)】/g, '<strong class="section-tag">$1</strong>');

  // Key points
  const kp = document.getElementById('key-points');
  const points = Array.isArray(analysis?.key_points) ? analysis.key_points : [];
  kp.innerHTML = points.length ? points.map(p => `<span class="kp-tag">✦ ${p}</span>`).join('') : '';

  // ── Draw Chart ──
  const kline = Array.isArray(analysis?.kline) ? analysis.kline : [];
  ChartManager.drawKlineChart(kline);
}

// ── Signal Engine Card ──
function displaySignalCard(analysis) {
  const strength = analysis?.signal_strength ?? 50;
  const trend = analysis?.signal_trend ?? 'neutral';
  const risk = analysis?.signal_risk ?? 'medium';
  const signals = Array.isArray(analysis?.signals) ? analysis.signals : [];
  const summary = analysis?.signal_summary ?? '';
  const factors = analysis?.signal_factors ?? {};

  // Strength ring
  const arc = document.getElementById('signal-arc');
  const circumference = 188.5;
  const offset = circumference - (strength / 100) * circumference;
  arc.setAttribute('stroke-dashoffset', offset);

  // Color the arc by strength
  if (strength >= 70) arc.setAttribute('stroke', '#32d74b');
  else if (strength >= 55) arc.setAttribute('stroke', '#ff9f0a');
  else if (strength >= 40) arc.setAttribute('stroke', '#8e8e93');
  else arc.setAttribute('stroke', '#ff3b6f');

  document.getElementById('signal-num').textContent = strength;

  // Trend badge
  const trendBadge = document.getElementById('signal-trend-badge');
  const trendLabels = { bullish:'▲ BULL', mildly_bullish:'↗ BIASED UP', neutral:'— HOLD',
    mildly_bearish:'↘ BIASED DOWN', bearish:'▼ BEAR' };
  trendBadge.textContent = trendLabels[trend] || trend;
  trendBadge.className = 'signal-badge ' + (trend.includes('bull') ? 'bullish' : trend.includes('bear') ? 'bearish' : 'neutral');

  // Signal tags
  const tagsEl = document.getElementById('signal-tags');
  if (signals.length > 0) {
    tagsEl.innerHTML = signals.slice(0, 6).map(s => {
      const isBull = /多头|上涨|突破|金叉|放量|超卖|转正|转强|底背离|站上/.test(s);
      const isBear = /空头|下跌|跌破|死叉|缩量.*不足|超买|转弱|顶背离/.test(s);
      const cls = isBull ? 'bull' : isBear ? 'bear' : '';
      return `<span class="signal-tag ${cls}">${s}</span>`;
    }).join('');
  } else {
    tagsEl.innerHTML = '<span style="color:var(--text-tertiary);font-size:12px">无活跃信号</span>';
  }

  // Summary
  document.getElementById('signal-summary').textContent = summary;

  // Factor bars
  const factorEl = document.getElementById('signal-factors');
  if (Object.keys(factors).length > 0) {
    factorEl.innerHTML = Object.entries(factors).map(([key, f]) => {
      const pct = f.score || 50;
      const color = pct >= 70 ? '#32d74b' : pct >= 55 ? '#ff9f0a' : pct >= 40 ? '#8e8e93' : '#ff3b6f';
      return `<div class="factor-bar">
        <span class="factor-label">${f.label || key}</span>
        <div class="factor-track"><div class="factor-fill" style="width:${pct}%;background:${color}"></div></div>
        <span style="font-size:10px;color:var(--text-tertiary);width:24px">${pct}</span>
      </div>`;
    }).join('');
  }
}

// ── State Transitions ──
function showResults() {
  loadingState.classList.add('hidden');
  errorState.classList.add('hidden');
  resultSection.classList.remove('hidden');
  // Staggered card reveal
  requestAnimationFrame(() => {
    resultSection.classList.add('visible');
    document.querySelectorAll('.glass-card').forEach((c, i) => {
      c.style.animationDelay = `${i * 0.06}s`;
      c.classList.add('card-enter');
    });
  });
}

function showLoading() {
  resultSection.classList.add('hidden');
  resultSection.classList.remove('visible');
  errorState.classList.add('hidden');
  loadingState.classList.remove('hidden');
  // Reset card animations
  document.querySelectorAll('.glass-card').forEach(c => c.classList.remove('card-enter'));
}

function showError(message) {
  errorMessage.textContent = message;
  loadingState.classList.add('hidden');
  resultSection.classList.add('hidden');
  resultSection.classList.remove('visible');
  errorState.classList.remove('hidden');
}

function resetUpload() {
  fileInput.value = '';
  fileInfo.classList.add('hidden');
  resultSection.classList.add('hidden');
  resultSection.classList.remove('visible');
  loadingState.classList.add('hidden');
  errorState.classList.add('hidden');
  uploadZone.classList.remove('scanning');
  currentAnalysis = null;
}

// ── History ──
async function loadHistory(page = 0) {
  try {
    const offset = page * HISTORY_LIMIT;
    const result = await APIClient.getHistory(HISTORY_LIMIT, offset);
    const list = document.getElementById('history-list');

    if (!result.data.length) {
      list.innerHTML = `<p style="color:var(--text-secondary);text-align:center;padding:48px 0">${I18n.t('history.empty')}</p>`;
      document.getElementById('pagination').innerHTML = '';
      return;
    }

    list.innerHTML = result.data.map(item => {
      const chg = toNumber(item.change_percent, 0);
      return `
      <div class="history-item glass-card" onclick="viewHistoryDetail('${item.id}')">
        <div class="history-left">
          <div class="history-name">${item.stock_name ?? '未知'}</div>
          <div class="history-code">${item.stock_code ?? '--'} · ${item.market_name ?? ''}</div>
        </div>
        <div class="history-right">
          <div class="history-price">¥${formatPrice(item.price)}</div>
          <div class="history-change ${chg > 0 ? 'up' : chg < 0 ? 'down' : ''}">${formatPercent(chg)}</div>
          <div class="history-date">${item.created_at ? new Date(item.created_at).toLocaleDateString('zh-CN') : ''}</div>
        </div>
      </div>`;
    }).join('');

    const totalPages = Math.ceil(result.pagination.total / HISTORY_LIMIT);
    const pag = document.getElementById('pagination');
    pag.innerHTML = totalPages > 1 ? Array.from({length: totalPages}, (_, i) =>
      `<button class="page-btn ${i === page ? 'active' : ''}" onclick="loadHistory(${i})">${i + 1}</button>`
    ).join('') : '';
    currentHistoryPage = page;
  } catch (error) {
    document.getElementById('history-list').innerHTML = `<p style="color:var(--negative);text-align:center;padding:48px 0">${I18n.t('history.error')}: ${error.message}</p>`;
  }
}

async function viewHistoryDetail(id) {
  try {
    const analysis = await APIClient.getAnalysis(id);
    currentAnalysis = analysis;
    displayAnalysisResults(analysis);
    showSection('upload');
    setTimeout(() => resultSection.scrollIntoView({ behavior: 'smooth' }), 100);
  } catch (error) {
    alert(I18n.t('history.error') + ': ' + error.message);
  }
}

function showSection(section) {
  if (section === 'upload') {
    uploadSection.classList.remove('hidden');
    historySection.classList.add('hidden');
  } else {
    uploadSection.classList.add('hidden');
    historySection.classList.remove('hidden');
    loadHistory(0);
  }
}

function downloadReport() {
  if (!currentAnalysis) return;
  const json = JSON.stringify(currentAnalysis, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${currentAnalysis.stock_code ?? 'report'}_analysis.json`;
  a.click();
  URL.revokeObjectURL(a.href);
}
