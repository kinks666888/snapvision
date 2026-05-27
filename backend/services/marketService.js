/**
 * marketService — 真实股票行情服务 V2
 *
 * 双数据源：
 *   腾讯财经 — 实时行情（名称可靠、格式稳定）
 *   东方财富 — 日K线（结构化 JSON）
 *
 * 特性：
 *   - 60 秒内存缓存
 *   - API 失败自动降级
 *   - 价格单位自动归一化
 */

const https = require('https');
const http = require('http');

// ────────────────────────────────────────────
// 缓存
// ────────────────────────────────────────────
const CACHE_TTL_MS = 60_000;
const cache = new Map();

function getCached(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache(key, data) {
  cache.set(key, { ts: Date.now(), data });
}

// ────────────────────────────────────────────
// HTTP
// ────────────────────────────────────────────

function httpGet(url, timeoutMs = 10_000) {
  return new Promise((resolve, reject) => {
    const transport = url.startsWith('https') ? https : http;
    const req = transport.get(url, { timeout: timeoutMs }, (res) => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => {
        const buffer = Buffer.concat(chunks);
        resolve(buffer);
      });
    });
    req.on('timeout', () => { req.destroy(); reject(new Error('Request timeout')); });
    req.on('error', reject);
  });
}

// ────────────────────────────────────────────
// 市场识别
// ────────────────────────────────────────────

function resolveMarket(code) {
  const c = String(code).trim();
  if (c.length < 6) return { market: 'SH', prefix: 'sh', marketName: '未知' };

  const prefix = c.substring(0, 3);

  if (['600', '601', '603', '605'].includes(prefix))
    return { market: 'SH', prefix: 'sh', marketName: '上海主板' };
  if (prefix === '688')
    return { market: 'SH', prefix: 'sh', marketName: '科创板' };
  if (['000', '001', '002', '003'].includes(prefix))
    return { market: 'SZ', prefix: 'sz', marketName: '深圳主板' };
  if (['300', '301'].includes(prefix))
    return { market: 'SZ', prefix: 'sz', marketName: '创业板' };
  if (['8', '9'].includes(c[0]))
    return { market: 'BJ', prefix: 'bj', marketName: '北交所' };

  return { market: 'SH', prefix: 'sh', marketName: '未知市场' };
}

// ────────────────────────────────────────────
// 腾讯财经 — 实时行情（主数据源）
// ────────────────────────────────────────────

/**
 * 腾讯财经实时行情
 *
 * API: https://qt.gtimg.cn/q=sh600519
 * 返回 GBK 编码文本，格式：
 *   v_sh600519="1~贵州茅台~600519~1303.00~1273.38~1268.02~82728~..."
 *
 * 字段索引（~ 分割）：
 *   [1]=名称, [2]=代码, [3]=最新价, [4]=昨收, [5]=开盘,
 *   [6]=成交量(手), [30]=时间, [31]=涨跌额, [32]=涨跌幅,
 *   [33]=最高, [34]=最低, [38]=换手率
 */
async function _fetchTencentQuote(code) {
  const { prefix } = resolveMarket(code);
  const url = `https://qt.gtimg.cn/q=${prefix}${code}`;

  console.log(`📡 [Tencent] 请求行情: ${prefix}${code}`);

  const buffer = await httpGet(url);
  // 腾讯返回 GBK 编码，先尝试 GBK → UTF-8 解码
  let text;
  try {
    text = new TextDecoder('gbk').decode(buffer);
  } catch {
    // 降级：latin1 兜底（会乱码但结构还在）
    text = buffer.toString('latin1');
  }

  // 提取引号内的数据
  const match = text.match(/"([^"]+)"/);
  if (!match) return null;

  const fields = match[1].split('~');
  if (fields.length < 35) return null;

  return {
    name:        (fields[1] || '未知').replace(/\s+/g, ''),  // 去空格（GBK 解码残留）
    code:        fields[2] || code,
    price:       safeNumber(fields[3]),
    preclose:    safeNumber(fields[4]),
    open:        safeNumber(fields[5]),
    volume:      safeNumber(fields[6]),
    high:        safeNumber(fields[33]),
    low:         safeNumber(fields[34]),
    change:      safeNumber(fields[31]),
    change_pct:  safeNumber(fields[32]),
    turnover:    safeNumber(fields[38]),
    updated_at:  _parseTencentTime(fields[30]),
  };
}

function _parseTencentTime(raw) {
  // raw = "20260527161406" → ISO
  if (!raw || raw.length < 8) return new Date().toISOString();
  const y = raw.slice(0, 4);
  const m = raw.slice(4, 6);
  const d = raw.slice(6, 8);
  const h = raw.slice(8, 10) || '00';
  const min = raw.slice(10, 12) || '00';
  const s = raw.slice(12, 14) || '00';
  return `${y}-${m}-${d}T${h}:${min}:${s}.000Z`;
}

// ────────────────────────────────────────────
// 东方财富 — 实时行情（备用）
// ────────────────────────────────────────────

async function _fetchEastMoneyQuote(code) {
  const { market } = resolveMarket(code);
  const secid = market === 'SH' ? `1.${code}` : `0.${code}`;

  const fields = 'f43,f44,f45,f46,f47,f48,f50,f57,f58,f60,f169,f170,f171';
  const url = `https://push2.eastmoney.com/api/qt/stock/get?secid=${secid}&fields=${fields}`;

  console.log(`📡 [EastMoney] 请求行情: ${code}`);

  const buffer = await httpGet(url);
  const text = buffer.toString('utf-8');
  const json = JSON.parse(text);

  if (!json || !json.data) return null;
  const d = json.data;

  // 单位归一化
  const rawPrice = safeNumber(d.f43);
  const priceUnit = (rawPrice > 5000 && Number.isInteger(rawPrice)) ? 100 : 1;

  const rawChangePct = safeNumber(d.f170);
  const pctUnit = Math.abs(rawChangePct) > 35 ? 100 : 1;

  const rawTurnover = safeNumber(d.f171);
  const turnoverUnit = Math.abs(rawTurnover) > 50 ? 100 : 1;

  return {
    // f58 = 名称, f57 = 代码
    name:        d.f58 || '未知',
    code:        d.f57 || code,
    price:       rawPrice / priceUnit,
    preclose:    safeNumber(d.f60) / priceUnit,
    open:        safeNumber(d.f46) / priceUnit,
    volume:      safeNumber(d.f47),
    high:        safeNumber(d.f44) / priceUnit,
    low:         safeNumber(d.f45) / priceUnit,
    change:      safeNumber(d.f169) / priceUnit,
    change_pct:  rawChangePct / pctUnit,
    turnover:    rawTurnover / turnoverUnit,
    updated_at:  new Date().toISOString(),
  };
}

// ────────────────────────────────────────────
// 获取实时行情（双源 fallback）
// ────────────────────────────────────────────

async function getRealtimeQuote(code) {
  const cacheKey = `quote:${code}`;
  const cached = getCached(cacheKey);
  if (cached) {
    console.log(`📡 行情缓存命中: ${code}`);
    return cached;
  }

  // 1) 优先腾讯（名称可靠）
  try {
    const quote = await _fetchTencentQuote(code);
    if (quote && quote.price > 0) {
      console.log(`✅ [腾讯] 行情: ${quote.name} ¥${quote.price} ${formatChange(quote.change_pct)}`);
      setCache(cacheKey, quote);
      return quote;
    }
    console.warn(`⚠️ [腾讯] 行情数据异常，降级东方财富`);
  } catch (err) {
    console.warn(`⚠️ [腾讯] 行情请求失败: ${err.message}，降级东方财富`);
  }

  // 2) 降级东方财富
  try {
    const quote = await _fetchEastMoneyQuote(code);
    if (quote && quote.price > 0) {
      console.log(`✅ [东方财富] 行情: ${quote.name} ¥${quote.price} ${formatChange(quote.change_pct)}`);
      setCache(cacheKey, quote);
      return quote;
    }
  } catch (err) {
    console.warn(`⚠️ [东方财富] 行情请求失败: ${err.message}`);
  }

  console.error(`❌ 所有行情源均失败: ${code}`);
  return emptyQuote(code);
}

// ────────────────────────────────────────────
// K 线数据（东方财富）
// ────────────────────────────────────────────

async function getKlineData(code, days = 60) {
  const cacheKey = `kline:${code}:${days}`;
  const cached = getCached(cacheKey);
  if (cached) {
    console.log(`📡 K线缓存命中: ${code} (${cached.length}条)`);
    return cached;
  }

  const { market } = resolveMarket(code);
  const secid = market === 'SH' ? `1.${code}` : `0.${code}`;
  const lmt = Math.min(days + 5, 250);

  // 优先东方财富
  let klines = await _fetchEastMoneyKline(secid, code, lmt, days);

  // 降级腾讯
  if (!klines || klines.length === 0) {
    klines = await _fetchTencentKline(code, days);
  }

  if (klines && klines.length > 0) {
    setCache(cacheKey, klines);
  }

  return klines || [];
}

async function _fetchEastMoneyKline(secid, code, lmt, days) {
  const url = [
    'https://push2his.eastmoney.com/api/qt/stock/kline/get',
    `?secid=${secid}`,
    '&fields1=f1,f2,f3,f4,f5,f6',
    '&fields2=f51,f52,f53,f54,f55,f56,f57',
    '&klt=101&fqt=1&end=20500101',
    `&lmt=${lmt}`,
  ].join('');

  console.log(`📡 [EastMoney] 请求K线: ${code}`);

  try {
    const buffer = await httpGet(url);
    const json = JSON.parse(buffer.toString('utf-8'));

    if (!json?.data?.klines) return null;

    const all = json.data.klines.map((line) => {
      const parts = String(line).split(',');
      return {
        date:   parts[0] || '',
        open:   safeNumber(parts[1]),
        close:  safeNumber(parts[2]),
        high:   safeNumber(parts[3]),
        low:    safeNumber(parts[4]),
        volume: safeNumber(parts[5]),
        amount: safeNumber(parts[6]),
      };
    });

    const result = all.slice(-days);
    console.log(`✅ [EastMoney] K线: ${result.length}条`);
    return result;
  } catch (err) {
    console.warn(`⚠️ [EastMoney] K线失败: ${err.message}`);
    return null;
  }
}

async function _fetchTencentKline(code, days = 60) {
  const { prefix } = resolveMarket(code);

  // 腾讯 K 线 API（前复权）
  const url = `https://web.ifzq.gtimg.cn/appstock/app/fqkline/get?param=${prefix}${code},day,,,${days},qfq`;

  console.log(`📡 [Tencent] 请求K线: ${code}`);

  try {
    const buffer = await httpGet(url);
    const text = buffer.toString('utf-8');
    const json = JSON.parse(text);

    const stockKey = `${prefix}${code}`;
    const klines = json?.data?.[stockKey]?.qfqday || json?.data?.[stockKey]?.day;

    if (!klines || !Array.isArray(klines)) return null;

    const result = klines.slice(-days).map(k => ({
      date:   k[0] || '',
      open:   safeNumber(k[1]),
      close:  safeNumber(k[2]),
      high:   safeNumber(k[3]),
      low:    safeNumber(k[4]),
      volume: safeNumber(k[5]),
      amount: 0,
    }));

    console.log(`✅ [Tencent] K线: ${result.length}条`);
    return result;
  } catch (err) {
    console.warn(`⚠️ [Tencent] K线失败: ${err.message}`);
    return null;
  }
}

// ────────────────────────────────────────────
// 聚合信息
// ────────────────────────────────────────────

async function getStockInfo(code) {
  const quote = await getRealtimeQuote(code);
  const marketInfo = resolveMarket(code);

  return {
    code:        code,
    name:        quote.name || '未知股票',
    market:      marketInfo.market,
    marketName:  marketInfo.marketName,
    price:       quote.price,
    open:        quote.open,
    high:        quote.high,
    low:         quote.low,
    volume:      quote.volume,
    preclose:    quote.preclose,
    change:      quote.change,
    change_pct:  quote.change_pct,
    turnover:    quote.turnover,
    updated_at:  quote.updated_at,
  };
}

// ────────────────────────────────────────────
// 工具
// ────────────────────────────────────────────

function safeNumber(val, fallback = 0) {
  if (val === null || val === undefined) return fallback;
  const n = Number(val);
  return Number.isFinite(n) ? n : fallback;
}

function formatChange(pct) {
  if (pct > 0) return `+${pct.toFixed(2)}%`;
  if (pct < 0) return `${pct.toFixed(2)}%`;
  return '0.00%';
}

function emptyQuote(code) {
  return {
    code, name: '未知', price: 0, open: 0, high: 0, low: 0,
    volume: 0, preclose: 0, change: 0, change_pct: 0,
    turnover: 0, updated_at: new Date().toISOString(),
  };
}

// ────────────────────────────────────────────
// 导出
// ────────────────────────────────────────────

module.exports = {
  resolveMarket,
  getKlineData,
  getRealtimeQuote,
  getStockInfo,
  clearCache: () => cache.clear(),
  getCacheSize: () => cache.size,
};
