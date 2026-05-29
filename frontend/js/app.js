/**
 * SnapVision — Smooth Scroll Transition Engine
 */

let currentAnalysis = null;
let lenis = null;
let isTransitioning = false;
const totalSections = 3;
const PAGE_SIZE = 10;

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
// SCROLL TO SECTION — GSAP smooth scroll
// ═══════════════════════════════════════
function scrollToSection(index) {
  if (isTransitioning) return;
  const sections = document.querySelectorAll('.section');
  if (index < 0 || index >= sections.length) return;
  isTransitioning = true;

  const target = sections[index];
  const top = target.offsetTop;

  // GSAP 平滑滚动到目标 section
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
  const fnEl=$('file-name'), fiEl=$('file-info'), ldEl=$('loading-indicator'), uzEl=$('upload-zone');
  if (fnEl) fnEl.textContent = file.name;
  if (fiEl) fiEl.classList.add('show');
  if (ldEl) ldEl.style.display = 'block';
  if (uzEl) uzEl.style.pointerEvents = 'none';
  try {
    const analysis = await APIClient.analyzeImage(file);
    currentAnalysis = analysis;
    displayAnalysis(analysis);
    displayScore(analysis);
    displaySector(analysis);
    displayStrategy(analysis);
    if (ldEl) ldEl.style.display = 'none';
    if (uzEl) uzEl.style.pointerEvents = 'auto';
    scrollToSection(1);
  } catch (err) {
    if (ldEl) ldEl.style.display = 'none';
    if (uzEl) uzEl.style.pointerEvents = 'auto';
    alert('分析失败: ' + (err.message || '请重试'));
  }
}

// ═══════════════════════════════════════
// DISPLAY
// ═══════════════════════════════════════
function $(id) { return document.getElementById(id); }

function displayScore(a) {
  const strength = a.signal_strength || 50;
  // Score ring animation
  const arc = document.getElementById('score-arc');
  if (arc) {
    const circumference = 377;
    const offset = circumference - (strength / 100) * circumference;
    arc.setAttribute('stroke-dashoffset', offset);
    const color = strength >= 70 ? '#51cf66' : strength >= 55 ? '#f59e0b' : strength >= 40 ? '#8e8e93' : '#ff6b6b';
    arc.setAttribute('stroke', color);
  }
  const num = document.getElementById('score-num');
  if (num) { num.textContent = strength; num.style.color = strength >= 55 ? '#51cf66' : strength >= 40 ? '#f59e0b' : '#ff6b6b'; }
  setText('score-trend', a.signal_trend || '--');
  setText('score-risk', a.signal_risk || a.risk || '--');
}

function displayAnalysis(a) {
  setText('stock-name', a.stock_name);
  setText('stock-code', a.stock_code);
  setText('current-price', '¥' + (a.price || 0).toFixed(2));
  const pct = a.change_percent || 0;
  const ce = $('change-percent'); if (ce) {
    ce.innerHTML = (pct > 0 ? '▲' : pct < 0 ? '▼' : '—') + ' ' + (pct > 0 ? '+' : '') + pct.toFixed(2) + '%';
    ce.className = 'stock-change ' + (pct > 0 ? 'up' : pct < 0 ? 'down' : 'flat');
  }
  setText('trend-direction', a.signal_trend);
  setText('signal-strength', (a.signal_strength || 0) + '/100');
  setText('risk-level', a.signal_risk || a.risk);
  setText('macd-value', (a.macd || 0).toFixed(3));
  setText('support-value', '¥' + (a.support || 0).toFixed(2));
  setText('resistance-value', '¥' + (a.resistance || 0).toFixed(2));
  const at = $('analysis-text'); if (at) at.innerHTML = (a.analysis||'').replace(/\n/g,'<br>').replace(/【(.+?)】/g,'<strong>$1</strong>');
  const kline = a.kline || a.kline_data || [];
  if (typeof ChartManager !== 'undefined') ChartManager.drawKlineChart(kline);
}

function displaySector(a) {
  const sector = a.sector || {};
  setText('sector-name', sector.name);
  setText('sector-heat', sector.heat);
  const sc = $('sector-concepts'); if (sc) sc.innerHTML = (sector.concepts||[]).map(c=>`<span class="tag">${c}</span>`).join('');
  const cards = $('sector-cards'); if (cards) {
    cards.innerHTML = (a.related_stocks||[]).map(s => {
      const p = s.change_percent || 0;
      return `<div class="glass sector-card"><div class="sector-card-name">${s.name||'--'}</div><div class="sector-card-price">¥${(s.price||0).toFixed(2)}</div><div class="sector-card-change ${p>0?'up':p<0?'down':''}">${p>0?'+':''}${p.toFixed(2)}%</div><div class="sector-card-tag">${s.tag||''}</div></div>`;
    }).join('');
  }
}

function displayStrategy(a) {
  setText('strategy-bias', a.strategy_bias);
  setText('strategy-position', a.strategy_position);
  setText('strategy-confidence', (a.strategy_confidence || 0) + '%');
  setText('strategy-stop', '¥' + (a.strategy_stop_loss || 0).toFixed(2));
  setText('strategy-take', '¥' + (a.strategy_take_profit || 0).toFixed(2));
}

function setText(id, val) {
  const el = $(id);
  if (el) el.textContent = val || '--';
}

// ═══════════════════════════════════════
// HISTORY DRAWER
// ═══════════════════════════════════════
function openDrawer(){document.getElementById('drawer-overlay').classList.add('open');document.getElementById('drawer').classList.add('open');loadDrawerHistory(0)}
function closeDrawer(){document.getElementById('drawer-overlay').classList.remove('open');document.getElementById('drawer').classList.remove('open')}
async function loadDrawerHistory(page=0){
  try{
    const r=await APIClient.getHistory(PAGE_SIZE,page*PAGE_SIZE);
    const list=document.getElementById('drawer-list');
    if(!r.data||!r.data.length){list.innerHTML='<p style="color:var(--t3);text-align:center;padding:32px">暂无</p>';document.getElementById('drawer-pagination').innerHTML='';return}
    list.innerHTML=r.data.map(i=>{const p=i.change_percent||0;return`<div class="drawer-item" onclick="viewDrawerDetail('${i.id}')"><div class="drawer-item-name">${i.stock_name||'未知'} <span style="color:var(--t3);font-size:12px">${i.stock_code||''}</span></div><div class="drawer-item-meta"><span>¥${(i.price||0).toFixed(2)}</span><span style="color:${p>0?'var(--up)':p<0?'var(--down)':'var(--t3)'}">${p>0?'+':''}${p.toFixed(2)}%</span></div></div>`}).join('');
    const tp=Math.ceil((r.pagination?.total||0)/PAGE_SIZE);
    document.getElementById('drawer-pagination').innerHTML=tp>1?Array.from({length:tp},(_,i)=>`<button class="${i===page?'active':''}" onclick="loadDrawerHistory(${i})">${i+1}</button>`).join(''):'';
  }catch(e){document.getElementById('drawer-list').innerHTML='<p style="color:var(--up);text-align:center;padding:32px">加载失败</p>'}
}
async function viewDrawerDetail(id){
  try{
    const a=await APIClient.getAnalysis(id);if(!a){alert('不存在');return}
    if(!a.kline&&a.kline_data)a.kline=a.kline_data;
    currentAnalysis=a;displayAnalysis(a);displayScore(a);displaySector(a);displayStrategy(a);closeDrawer();scrollToSection(1);
  }catch(e){alert('失败:'+e.message)}
}
