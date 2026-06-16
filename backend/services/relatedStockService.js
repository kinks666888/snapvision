/**
 * relatedStockService — 相关股票服务
 *
 * 基于板块获取同行业/同概念相关标的
 * API: 东方财富板块成分股 + 预置映射表
 */

const https = require('https');
const http = require('http');

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
// 预置相关股票映射（兜底数据）
// ═══════════════════════════════════════════
const PEER_MAP = {
  '通信设备': [
    { code:'000063', name:'中兴通讯',   tag:'龙头' },
    { code:'600498', name:'烽火通信',   tag:'跟涨' },
    { code:'002396', name:'星网锐捷',   tag:'概念' },
    { code:'300502', name:'新易盛',     tag:'强势' },
    { code:'300308', name:'中际旭创',   tag:'龙头' },
    { code:'688313', name:'仕佳光子',   tag:'概念' },
  ],
  '半导体': [
    { code:'688981', name:'中芯国际',   tag:'龙头' },
    { code:'002371', name:'北方华创',   tag:'强势' },
    { code:'603986', name:'兆易创新',   tag:'跟涨' },
    { code:'300782', name:'卓胜微',     tag:'概念' },
    { code:'688012', name:'中微公司',   tag:'龙头' },
    { code:'002049', name:'紫光国微',   tag:'回调' },
  ],
  '酿酒行业': [
    { code:'000858', name:'五粮液',     tag:'龙头' },
    { code:'000568', name:'泸州老窖',   tag:'跟涨' },
    { code:'002304', name:'洋河股份',   tag:'回调' },
    { code:'000596', name:'古井贡酒',   tag:'强势' },
    { code:'600809', name:'山西汾酒',   tag:'龙头' },
  ],
  '汽车整车': [
    { code:'002594', name:'比亚迪',     tag:'龙头' },
    { code:'000625', name:'长安汽车',   tag:'跟涨' },
    { code:'601633', name:'长城汽车',   tag:'回调' },
    { code:'600104', name:'上汽集团',   tag:'概念' },
    { code:'601238', name:'广汽集团',   tag:'概念' },
    { code:'000800', name:'一汽解放',   tag:'跟涨' },
  ],
  '银行': [
    { code:'600036', name:'招商银行',   tag:'龙头' },
    { code:'601398', name:'工商银行',   tag:'龙头' },
    { code:'000001', name:'平安银行',   tag:'跟涨' },
    { code:'601166', name:'兴业银行',   tag:'回调' },
  ],
  '家电行业': [
    { code:'000651', name:'格力电器',   tag:'龙头' },
    { code:'000333', name:'美的集团',   tag:'龙头' },
    { code:'600690', name:'海尔智家',   tag:'跟涨' },
    { code:'002032', name:'苏泊尔',     tag:'概念' },
  ],
  '光伏设备': [
    { code:'601012', name:'隆基绿能',   tag:'龙头' },
    { code:'600438', name:'通威股份',   tag:'跟涨' },
    { code:'002459', name:'晶澳科技',   tag:'强势' },
    { code:'688599', name:'天合光能',   tag:'概念' },
    { code:'300274', name:'阳光电源',   tag:'龙头' },
  ],
  '电力行业': [
    { code:'600900', name:'长江电力',   tag:'龙头' },
    { code:'600011', name:'华能国际',   tag:'跟涨' },
    { code:'601985', name:'中国核电',   tag:'强势' },
    { code:'003816', name:'中国广核',   tag:'概念' },
  ],
  '房地产开发': [
    { code:'000002', name:'万科A',      tag:'龙头' },
    { code:'600048', name:'保利发展',   tag:'跟涨' },
    { code:'001979', name:'招商蛇口',   tag:'回调' },
  ],
  '证券': [
    { code:'600030', name:'中信证券',   tag:'龙头' },
    { code:'601688', name:'华泰证券',   tag:'跟涨' },
    { code:'300059', name:'东方财富',   tag:'强势' },
  ],
};

// ═══════════════════════════════════════════
// 主入口
// ═══════════════════════════════════════════
async function getRelatedStocks(stockCode, industry) {
  const cacheKey = `related:${stockCode}:${industry}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  console.log(`📡 [Related] 查询相关股票: ${stockCode} (${industry})`);

  // 1) 兜底：预置映射表（作为基础）
  const peers = PEER_MAP[industry] || _guessPeers(stockCode);
  const filteredPeers = peers.filter(p => p.code !== stockCode).slice(0, 6);

  // 2) 用实时行情丰富价格数据
  const result = await _fetchLivePrices(filteredPeers);

  console.log(`✅ [Related] ${stockCode} → ${result.length} 只相关股票`);
  setCache(cacheKey, result);
  return result;
}

// ═══════════════════════════════════════════
// (deprecated — 板块API代码不稳定，使用预置映射+实时价格)
// ═══════════════════════════════════════════
async function _fetchSectorStocks(industry) {
  // 尝试用板块代码查询
  const SECTOR_CODES = {
    '通信设备':'BK0730','半导体':'BK0487','光伏设备':'BK0732',
    '酿酒行业':'BK0477','银行':'BK0475','证券':'BK0473',
    '汽车整车':'BK0481','家电行业':'BK0736','电力行业':'BK0428',
    '房地产开发':'BK0451',
  };
  const bkCode = SECTOR_CODES[industry];
  if (!bkCode) return [];

  try {
    const url = `https://push2.eastmoney.com/api/qt/clist/get?pn=1&pz=10&po=1&np=1&fltt=2&invt=2&fs=b:${bkCode}&fields=f2,f3,f12,f14`;
    const raw = await httpGet(url);
    const json = JSON.parse(raw);
    const list = json?.data?.diff || [];
    return list.map(s => ({
      code: s.f12, name: s.f14 || '',
      price: safeNumber(s.f2),
      change_pct: Math.abs(safeNumber(s.f3)) > 35 ? safeNumber(s.f3) / 100 : safeNumber(s.f3),
    }));
  } catch(e) {
    return [];
  }
}

async function _fetchLivePrices(peers) {
  if (peers.length === 0) return [];
  const codes = peers.map(p => {
    const mkt = p.code.startsWith('6') ? '1' : '0';
    return `${mkt}.${p.code}`;
  }).join(',');

  try {
    const url = `https://push2.eastmoney.com/api/qt/ulist.np/get?secids=${codes}&fields=f2,f3,f12,f14`;
    const raw = await httpGet(url);
    const json = JSON.parse(raw);
    const list = json?.data?.diff || [];
    const priceMap = {};
    list.forEach(s => {
      const rawPrice = safeNumber(s.f2);
      // ulist API 统一返回「分」，>100 且为整数即判定为分
      const priceUnit = (rawPrice > 100 && Number.isInteger(rawPrice)) ? 100 : 1;
      const rawPct = safeNumber(s.f3);
      const pctUnit = Math.abs(rawPct) > 30 ? 100 : 1;
      priceMap[s.f12] = {
        price: rawPrice / priceUnit,
        change_pct: rawPct / pctUnit,
      };
    });

    return peers.map(p => ({
      code: p.code, name: p.name, tag: p.tag,
      price: priceMap[p.code]?.price || 0,
      change_pct: priceMap[p.code]?.change_pct || 0,
    }));
  } catch(e) {
    return peers.map(p => ({ code:p.code, name:p.name, tag:p.tag, price:0, change_pct:0 }));
  }
}

// ═══════════════════════════════════════════
// 降级：根据代码前缀猜测板块
// ═══════════════════════════════════════════
function _guessPeers(code) {
  const prefix = code.substring(0, 3);
  const candidates = [];
  for (const [industry, peers] of Object.entries(PEER_MAP)) {
    for (const p of peers) {
      if (p.code.startsWith(prefix) && p.code !== code) {
        candidates.push(p);
      }
    }
  }
  return candidates.slice(0, 6);
}

function safeNumber(val, fallback = 0) {
  if (val === null || val === undefined) return fallback;
  const n = Number(val);
  return Number.isFinite(n) ? n : fallback;
}

module.exports = { getRelatedStocks };
