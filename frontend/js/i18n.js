/**
 * SnapVision i18n — 简体中文 / English
 * Usage: I18n.t('key')  →  current language string
 *        I18n.switch('zh-CN'|'en')  →  switch language
 *        I18n.apply()  →  re-render all [data-i18n] elements
 */
window.I18n = (() => {

  const DICT = {

    'zh-CN': {
      // ── App ──
      'app.title': 'SnapVision',
      'app.subtitle': 'AI 金融终端',
      'app.nav.analyze': '分析',
      'app.nav.history': '历史',
      'app.lang': 'EN',

      // ── Upload ──
      'upload.title': '拖拽截图开始分析',
      'upload.desc': '支持 JPG、PNG、GIF、WebP — 最大 10MB',
      'upload.hint': 'AI 将自动提取股票代码，获取实时行情，生成分析报告',
      'upload.processing': '正在分析截图…',
      'upload.chosen': '已选择',

      // ── Error ──
      'error.title': '分析出错',
      'error.retry': '重新尝试',
      'error.file_type': '请选择图片文件 (JPG, PNG, GIF, WebP)',
      'error.file_size': '文件大小不能超过 10MB',
      'error.network': '无法连接到服务器，请检查后端是否运行',
      'error.timeout': '请求超时，请稍后重试',
      'error.unknown': '分析失败，请重试',

      // ── Stock Header ──
      'stock.price': '最新价',
      'stock.code': '代码',
      'stock.market': '市场',
      'stock.change': '涨跌幅',
      'stock.change_amount': '涨跌额',

      // ── Indicators ──
      'indicator.title': '技术指标',
      'indicator.support': '支撑位',
      'indicator.resistance': '压力位',
      'indicator.macd': 'MACD',
      'indicator.signal': '信号线',
      'indicator.histogram': '柱状图',
      'indicator.trend': '趋势方向',
      'indicator.risk': '风险等级',
      'indicator.crossover': '信号',
      'indicator.recommendation': '操作建议',

      // ── Crossover ──
      'crossover.golden': '金叉',
      'crossover.dead': '死叉',
      'crossover.none': '无',

      // ── Trend ──
      'trend.up': '上升',
      'trend.down': '下降',
      'trend.flat': '横盘',

      // ── Risk ──
      'risk.high': '较高',
      'risk.mid': '中等',
      'risk.mid_high': '中等偏高',
      'risk.low': '较低',

      // ── Recommendation ──
      'rec.bull': '看多',
      'rec.bear': '看空',
      'rec.neutral': '中性',
      'rec.hold': '持有',
      'rec.reduce': '减仓',
      'rec.add': '加仓',
      'rec.wait': '观望',

      // ── Market ──
      'market.sh': '上海主板',
      'market.sz': '深圳主板',
      'market.kcb': '科创板',
      'market.cyb': '创业板',
      'market.bj': '北交所',
      'market.unknown': '未知市场',

      // ── AI Panel ──
      'ai.title': 'AI 智能分析',
      'ai.generated': '已生成',
      'ai.key_points': '关键要点',

      // ── Data Source ──
      'source.eastmoney': '东方财富实时行情',
      'source.tencent': '腾讯实时行情',
      'source.failed': '行情获取失败',
      'source.local': '本地计算',

      // ── Buttons ──
      'btn.download': '下载报告',
      'btn.new_analysis': '重新分析',
      'btn.try_again': '重新尝试',

      // ── History ──
      'history.title': '分析历史',
      'history.empty': '暂无分析历史',
      'history.loading': '加载中…',
      'history.error': '加载失败',
      'history.price': '价格',

      // ── Strength ──
      'strength.strong': '强',
      'strength.mid': '中等',
      'strength.weak': '弱',

      // ── Chart ──
      'chart.close': '收盘价',
      'chart.ma5': 'MA5',
      'chart.ma10': 'MA10',
      'chart.ma20': 'MA20',
      'chart.ma60': 'MA60',
      'chart.volume': '成交量',
      'chart.price_label': '价格 (¥)',
      'chart.date_label': '日期',
      'chart.volume_label': '成交量 (手)',
      'chart.kline_title': 'K 线走势图（含 MA 均线）',
      'chart.volume_title': '成交量',

      // ── Status ──
      'status.analyzing': '正在分析图片…',
      'status.no_data': '暂无数据',
    },

    'en': {
      // ── App ──
      'app.title': 'SnapVision',
      'app.subtitle': 'AI Financial Terminal',
      'app.nav.analyze': 'Analyze',
      'app.nav.history': 'History',
      'app.lang': '中文',

      // ── Upload ──
      'upload.title': 'Drop screenshot to analyze',
      'upload.desc': 'Supports JPG, PNG, GIF, WebP — Max 10MB',
      'upload.hint': 'AI will extract stock code, fetch real‑time data, and generate analysis',
      'upload.processing': 'Processing screenshot…',
      'upload.chosen': 'Selected',

      // ── Error ──
      'error.title': 'Analysis Error',
      'error.retry': 'Try Again',
      'error.file_type': 'Please select an image file (JPG, PNG, GIF, WebP)',
      'error.file_size': 'File size must not exceed 10MB',
      'error.network': 'Cannot connect to server. Please check if backend is running',
      'error.timeout': 'Request timed out. Please try again later',
      'error.unknown': 'Analysis failed. Please try again',

      // ── Stock Header ──
      'stock.price': 'Price',
      'stock.code': 'Code',
      'stock.market': 'Market',
      'stock.change': 'Change',
      'stock.change_amount': 'Amount',

      // ── Indicators ──
      'indicator.title': 'Technical Indicators',
      'indicator.support': 'Support',
      'indicator.resistance': 'Resistance',
      'indicator.macd': 'MACD',
      'indicator.signal': 'Signal',
      'indicator.histogram': 'Histogram',
      'indicator.trend': 'Trend',
      'indicator.risk': 'Risk',
      'indicator.crossover': 'Signal',
      'indicator.recommendation': 'Recommendation',

      // ── Crossover ──
      'crossover.golden': 'Golden Cross',
      'crossover.dead': 'Dead Cross',
      'crossover.none': 'None',

      // ── Trend ──
      'trend.up': 'Up',
      'trend.down': 'Down',
      'trend.flat': 'Sideways',

      // ── Risk ──
      'risk.high': 'High',
      'risk.mid': 'Medium',
      'risk.mid_high': 'Medium–High',
      'risk.low': 'Low',

      // ── Recommendation ──
      'rec.bull': 'Bullish',
      'rec.bear': 'Bearish',
      'rec.neutral': 'Neutral',
      'rec.hold': 'Hold',
      'rec.reduce': 'Reduce',
      'rec.add': 'Add',
      'rec.wait': 'Wait',

      // ── Market ──
      'market.sh': 'Shanghai Main',
      'market.sz': 'Shenzhen Main',
      'market.kcb': 'STAR Market',
      'market.cyb': 'ChiNext',
      'market.bj': 'Beijing Exchange',
      'market.unknown': 'Unknown Market',

      // ── AI Panel ──
      'ai.title': 'AI Intelligence',
      'ai.generated': 'GENERATED',
      'ai.key_points': 'Key Points',

      // ── Data Source ──
      'source.eastmoney': 'East Money Live',
      'source.tencent': 'Tencent Live',
      'source.failed': 'Market Data Unavailable',
      'source.local': 'Local Compute',

      // ── Buttons ──
      'btn.download': 'Download Report',
      'btn.new_analysis': 'New Analysis',
      'btn.try_again': 'Try Again',

      // ── History ──
      'history.title': 'Analysis History',
      'history.empty': 'No analysis history',
      'history.loading': 'Loading…',
      'history.error': 'Load failed',
      'history.price': 'Price',

      // ── Strength ──
      'strength.strong': 'Strong',
      'strength.mid': 'Medium',
      'strength.weak': 'Weak',

      // ── Chart ──
      'chart.close': 'Close',
      'chart.ma5': 'MA5',
      'chart.ma10': 'MA10',
      'chart.ma20': 'MA20',
      'chart.ma60': 'MA60',
      'chart.volume': 'Volume',
      'chart.price_label': 'Price (¥)',
      'chart.date_label': 'Date',
      'chart.volume_label': 'Volume (lots)',
      'chart.kline_title': 'K‑line with Moving Averages',
      'chart.volume_title': 'Volume',

      // ── Status ──
      'status.analyzing': 'Analyzing image…',
      'status.no_data': 'No data available',
    }
  };

  const STORAGE_KEY = 'snapvision_lang';
  let _current = localStorage.getItem(STORAGE_KEY) || 'zh-CN';

  function t(key, fallback) {
    const dict = DICT[_current] || DICT['zh-CN'];
    return dict[key] ?? fallback ?? key;
  }

  function current() { return _current; }

  function switchLang(lang) {
    _current = lang;
    localStorage.setItem(STORAGE_KEY, lang);
    applyDom();
    // Notify other modules
    if (window._onLangChange) window._onLangChange(lang);
  }

  function toggle() {
    switchLang(_current === 'zh-CN' ? 'en' : 'zh-CN');
  }

  function applyDom() {
    // Update all [data-i18n] elements
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (!key) return;
      const text = t(key);
      if (text) el.textContent = text;
    });
    // Update all [data-i18n-placeholder]
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const key = el.getAttribute('data-i18n-placeholder');
      if (key) el.setAttribute('placeholder', t(key));
    });
    // Update <title>
    const titleEl = document.querySelector('title');
    if (titleEl && titleEl.hasAttribute('data-i18n')) {
      titleEl.textContent = t('app.title') + ' — ' + t('app.subtitle');
    }
    // Update lang switcher button text
    const langBtn = document.getElementById('lang-switch');
    if (langBtn) langBtn.textContent = t('app.lang');
    // Update html lang attribute
    document.documentElement.lang = _current;
  }

  // Map backend Chinese terms to i18n keys
  function mapRecommendation(cn) {
    if (!cn) return 'rec.neutral';
    if (cn.includes('看多') || cn.includes('Bullish') || cn.includes('buy')) return 'rec.bull';
    if (cn.includes('看空') || cn.includes('Bearish') || cn.includes('sell')) return 'rec.bear';
    if (cn.includes('中性') || cn.includes('Neutral')) return 'rec.neutral';
    if (cn.includes('持有') || cn.includes('Hold')) return 'rec.hold';
    if (cn.includes('减仓') || cn.includes('Reduce')) return 'rec.reduce';
    if (cn.includes('加仓') || cn.includes('Add')) return 'rec.add';
    if (cn.includes('观望') || cn.includes('Wait')) return 'rec.wait';
    return 'rec.neutral';
  }

  function mapCrossover(cn) {
    if (!cn) return 'crossover.none';
    if (cn.includes('金') || cn.includes('golden')) return 'crossover.golden';
    if (cn.includes('死') || cn.includes('dead')) return 'crossover.dead';
    return 'crossover.none';
  }

  function mapTrend(cn) {
    if (!cn) return 'trend.flat';
    if (cn.includes('上升') || cn.includes('Up')) return 'trend.up';
    if (cn.includes('下降') || cn.includes('Down')) return 'trend.down';
    return 'trend.flat';
  }

  function mapRisk(cn) {
    if (!cn) return 'risk.mid';
    if (cn.includes('较高') || cn.includes('High')) return 'risk.high';
    if (cn.includes('中等偏高') || cn.includes('Medium–High')) return 'risk.mid_high';
    if (cn.includes('中等') || cn.includes('Medium')) return 'risk.mid';
    if (cn.includes('较低') || cn.includes('Low')) return 'risk.low';
    return 'risk.mid';
  }

  function mapStrength(cn) {
    if (!cn) return 'strength.weak';
    if (cn.includes('强') || cn.includes('Strong')) return 'strength.strong';
    if (cn.includes('中等') || cn.includes('Medium')) return 'strength.mid';
    return 'strength.weak';
  }

  function mapMarket(cn) {
    if (!cn) return 'market.unknown';
    if (cn.includes('上海') || cn.includes('Shanghai')) return 'market.sh';
    if (cn.includes('深圳') || cn.includes('Shenzhen')) return 'market.sz';
    if (cn.includes('科创') || cn.includes('STAR')) return 'market.kcb';
    if (cn.includes('创业') || cn.includes('ChiNext')) return 'market.cyb';
    if (cn.includes('北交') || cn.includes('Beijing')) return 'market.bj';
    return 'market.unknown';
  }

  // Initialize on load
  document.addEventListener('DOMContentLoaded', () => {
    applyDom();
  });

  const api = { t, current, switchLang, toggle, applyDom,
    mapRecommendation, mapCrossover, mapTrend, mapRisk, mapStrength, mapMarket };
  return api;
})();
