/**
 * sectorService — 板块信息服务
 *
 * 数据源：
 *   东方财富 f127(行业) f128(地区板块) f129(概念)
 *   + 预置板块映射表兜底
 */

const https = require('https');
const http = require('http');

// ── 缓存 ──
const CACHE_TTL = 120_000;
const cache = new Map();
function getCached(key) { const e = cache.get(key); if (!e || Date.now()-e.ts > CACHE_TTL) { cache.delete(key); return null; } return e.data; }
function setCache(key, data) { cache.set(key, { ts: Date.now(), data }); }

function httpGet(url, timeoutMs = 8000) {
  return new Promise((resolve, reject) => {
    const t = url.startsWith('https') ? https : http;
    t.get(url, { timeout: timeoutMs }, (res) => {
      let body = ''; res.on('data', c => body += c); res.on('end', () => resolve(body));
    }).on('error', reject).on('timeout', function() { this.destroy(); reject(new Error('timeout')); });
  });
}

// ═══════════════════════════════════════════
// 板块代码映射表（常用板块 → 东方财富 BK 代码）
// ═══════════════════════════════════════════
const SECTOR_MAP = {
  '通信设备':     { code:'BK0730', type:'industry',   keywords:['通信','光通信','5G','光纤'] },
  '半导体':       { code:'BK0487', type:'industry',   keywords:['半导体','芯片','集成电路'] },
  '电子元件':     { code:'BK0738', type:'industry',   keywords:['电子','元件','PCB'] },
  '光伏设备':     { code:'BK0732', type:'industry',   keywords:['光伏','太阳能'] },
  '电力行业':     { code:'BK0428', type:'industry',   keywords:['电力','电网','能源'] },
  '汽车整车':     { code:'BK0481', type:'industry',   keywords:['汽车','新能源车'] },
  '互联网服务':   { code:'BK0739', type:'industry',   keywords:['互联网','软件'] },
  '银行':         { code:'BK0475', type:'industry',   keywords:['银行','金融'] },
  '证券':         { code:'BK0473', type:'industry',   keywords:['证券','券商'] },
  '医药制造':     { code:'BK0465', type:'industry',   keywords:['医药','制药'] },
  '房地产开发':   { code:'BK0451', type:'industry',   keywords:['房地产','地产'] },
  '家电行业':     { code:'BK0736', type:'industry',   keywords:['家电','电器'] },
  '农牧饲渔':     { code:'BK0437', type:'industry',   keywords:['农牧','农业'] },
  '航天航空':     { code:'BK0485', type:'industry',   keywords:['航天','航空'] },
  '酿酒行业':     { code:'BK0477', type:'industry',   keywords:['酿酒','白酒'] },
  '钢铁行业':     { code:'BK0478', type:'industry',   keywords:['钢铁'] },
};

const REGION_MAP = {
  '江苏板块': '江苏', '浙江板块': '浙江', '上海板块': '上海', '广东板块': '广东',
  '北京板块': '北京', '深圳板块': '深圳', '山东板块': '山东',
};

// ═══════════════════════════════════════════
// 获取行业/概念信息
// ═══════════════════════════════════════════
async function getSectorInfo(code) {
  const cacheKey = `sector:${code}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const market = code.startsWith('6') ? '1' : '0';
  const secid = `${market}.${code}`;

  // 字段：f127=行业, f128=地区, f129=概念列表
  const url = `https://push2.eastmoney.com/api/qt/stock/get?secid=${secid}&fields=f57,f58,f127,f128,f129`;

  console.log(`📡 [Sector] 请求板块信息: ${code}`);

  try {
    const raw = await httpGet(url);
    const json = JSON.parse(raw);
    const d = json?.data || {};

    const industry  = d.f127 || '';
    const region    = d.f128 || '';
    const concepts  = (d.f129 || '').split(',').filter(Boolean).slice(0, 5);

    // 尝试获取板块实时数据
    let sectorData = { change_pct: 0, heat: '中性' };
    const sectorEntry = SECTOR_MAP[industry];
    if (sectorEntry) {
      try {
        const sectorQuote = await _fetchSectorQuote(sectorEntry.code);
        if (sectorQuote) sectorData = sectorQuote;
      } catch(e) { /* 降级 */ }
    }

    const result = {
      industry,
      industry_code: sectorEntry?.code || '',
      region: REGION_MAP[region] || region,
      concepts: concepts.slice(0, 3),
      all_concepts: concepts,
      change_percent: sectorData.change_pct,
      heat: sectorData.heat,
      description: _buildDescription(industry, sectorData.change_pct),
    };

    console.log(`✅ [Sector] ${code} → ${industry} | ${concepts.slice(0,2).join(', ')}`);
    setCache(cacheKey, result);
    return result;
  } catch (err) {
    console.warn(`⚠️ [Sector] API 失败: ${code} — 使用映射表`);
    return _fallbackSector(code);
  }
}

// ═══════════════════════════════════════════
// 获取板块实时涨跌
// ═══════════════════════════════════════════
async function _fetchSectorQuote(bkCode) {
  const url = `https://push2.eastmoney.com/api/qt/stock/get?secid=90.${bkCode}&fields=f43,f170,f171`;
  const raw = await httpGet(url);
  const json = JSON.parse(raw);
  const d = json?.data || {};

  const rawPct = safeNumber(d.f170);
  // 东方财富 sector API f170 统一返回 百分比×100
  const changePct = rawPct / 100;

  let heat = '中性';
  if (changePct > 2) heat = '强势';
  else if (changePct > 0.5) heat = '偏强';
  else if (changePct < -2) heat = '弱势';
  else if (changePct < -0.5) heat = '偏弱';

  return { change_pct: changePct, heat };
}

// ═══════════════════════════════════════════
// 降级：预置映射
// ═══════════════════════════════════════════
function _fallbackSector(code) {
  // 通过代码前缀推断行业
  const map = {
    '600522':'通信设备', '000063':'通信设备', '600498':'通信设备',
    '600519':'酿酒行业', '000858':'酿酒行业',
    '300750':'电池',     '002594':'汽车整车',
    '000002':'房地产开发','600036':'银行',
    '601318':'保险',     '000651':'家电行业',
    '688981':'半导体',
  };
  const industry = map[code] || '综合行业';
  const concepts = [];
  for (const [kw, bk] of Object.entries(SECTOR_MAP)) {
    if (bk.keywords?.some(k => industry.includes(k))) concepts.push(kw);
  }
  return {
    industry, industry_code: '', region: '',
    concepts: concepts.slice(0, 3), all_concepts: concepts,
    change_percent: 0, heat: '中性',
    description: `当前股票属于${industry}板块（映射数据）。`,
  };
}

function _buildDescription(industry, pct) {
  if (!industry) return '暂无板块信息。';
  const status = pct > 1 ? '表现偏强' : pct < -1 ? '表现偏弱' : '走势平稳';
  return `当前股票属于${industry}板块，板块今日${status}。`;
}

function safeNumber(val, fallback = 0) {
  if (val === null || val === undefined) return fallback;
  const n = Number(val);
  return Number.isFinite(n) ? n : fallback;
}

module.exports = { getSectorInfo };
