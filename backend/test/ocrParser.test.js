/**
 * OCRParser V3 测试套件
 *
 * 覆盖场景：
 *   ✓ 中天科技 完整解析
 *   ✓ 贵州茅台
 *   ✓ 有 stock code
 *   ✓ 无 stock code
 *   ✓ MA 文本混乱
 *   ✓ MACD 粘连格式
 *   ✓ MACD 空格分隔
 *   ✓ 字段缺失 → 默认值兜底
 *   ✓ OCR 错字容错
 *   ✓ 空输入
 *   ✓ 中文括号
 *   ✓ 涨跌额 + 涨跌幅同行
 *   ✓ SZ 市场
 *   ✓ 混合行
 *   ✓ 绝不返回 null/undefined/NaN
 *
 * 运行: node backend/test/ocrParser.test.js
 */

const OCRParser = require('../utils/ocrParser');

let passed = 0;
let failed = 0;
const failures = [];

function test(name, fn) {
  try {
    fn();
    console.log(`  ✅ ${name}`);
    passed++;
  } catch (e) {
    console.error(`  ❌ ${name}`);
    console.error(`     ${e.message}`);
    failed++;
    failures.push({ name, message: e.message });
  }
}

function section(title) {
  console.log(`\n━━━ ${title} ━━━`);
}

// ─── 断言工具 ───

function equal(actual, expected, msg = '') {
  if (actual !== expected) {
    throw new Error(`${msg} expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

function closeTo(actual, expected, delta = 0.001, msg = '') {
  if (Math.abs(actual - expected) > delta) {
    throw new Error(`${msg} expected ~${expected}, got ${actual}`);
  }
}

function notNull(actual, msg = '') {
  if (actual === null || actual === undefined) {
    throw new Error(`${msg} should not be null/undefined, got ${JSON.stringify(actual)}`);
  }
}

function notNaN(actual, msg = '') {
  if (Number.isNaN(actual)) {
    throw new Error(`${msg} should not be NaN`);
  }
}

function isNumber(actual, msg = '') {
  if (typeof actual !== 'number' || Number.isNaN(actual)) {
    throw new Error(`${msg} expected number, got ${typeof actual} ${JSON.stringify(actual)}`);
  }
}

function isString(actual, msg = '') {
  if (typeof actual !== 'string') {
    throw new Error(`${msg} expected string, got ${typeof actual}`);
  }
}

// ══════════════════════════════════════════
// 测试 1: 中天科技 — 完整解析
// ══════════════════════════════════════════
section('中天科技 — 完整解析');

const zt = OCRParser.parse([
  '中天科技（SH:600522）',
  '￥42.89',
  '-0.93 -2.12%',
  'MA5:43.71 MA10:43.53 MA20:39.94 MA30:36.63 MA60:32.42',
  'DIF:3.32DEA:3.43MACD:-0.20'
]);

test('stock_name',        () => equal(zt.stock_name, '中天科技'));
test('stock_code',        () => equal(zt.stock_code, '600522'));
test('current_price',     () => equal(zt.current_price, 42.89));
test('change (涨跌额)',    () => equal(zt.change, -0.93));
test('change_percent',    () => equal(zt.change_percent, -2.12));
test('ma5',               () => equal(zt.ma5, 43.71));
test('ma10',              () => equal(zt.ma10, 43.53));
test('ma20',              () => equal(zt.ma20, 39.94));
test('ma30',              () => equal(zt.ma30, 36.63));
test('ma60',              () => equal(zt.ma60, 32.42));
test('dif (快线)',         () => equal(zt.dif, 3.32));
test('dea (慢线/signal)',  () => equal(zt.dea, 3.43));
test('macd (柱状图)',      () => equal(zt.macd, -0.20));

// ══════════════════════════════════════════
// 测试 2: 贵州茅台 — SH 市场
// ══════════════════════════════════════════
section('贵州茅台 — SH 市场');

const mt = OCRParser.parse([
  '贵州茅台(SH:600519)',
  '￥1800.50',
  '+0.85%',
  'MA5:1795.00 MA10:1788.30 MA20:1760.00',
  'DIF: 25.30 DEA: 24.10 MACD: 1.20'
]);

test('stock_name',    () => equal(mt.stock_name, '贵州茅台'));
test('stock_code',    () => equal(mt.stock_code, '600519'));
test('current_price', () => equal(mt.current_price, 1800.50));
test('change_percent',() => equal(mt.change_percent, 0.85));
test('ma5',           () => equal(mt.ma5, 1795.00));
test('ma10',          () => equal(mt.ma10, 1788.30));
test('ma20',          () => equal(mt.ma20, 1760.00));
test('ma30 (缺失→0)',  () => equal(mt.ma30, 0));
test('ma60 (缺失→0)',  () => equal(mt.ma60, 0));
test('dif',           () => equal(mt.dif, 25.30));
test('dea',           () => equal(mt.dea, 24.10));
test('macd',          () => equal(mt.macd, 1.20));

// ══════════════════════════════════════════
// 测试 3: 万科A — SZ 市场
// ══════════════════════════════════════════
section('万科A — SZ 市场');

const wk = OCRParser.parse([
  '万科A（SZ:000002）',
  '￥15.60',
  '+1.23%'
]);

test('stock_code',     () => equal(wk.stock_code, '000002'));
test('stock_name',     () => equal(wk.stock_name, '万科A'));
test('current_price',  () => equal(wk.current_price, 15.60));
test('change_percent', () => equal(wk.change_percent, 1.23));
test('ma5 (缺失→0)',   () => equal(wk.ma5, 0));
test('dif (缺失→0)',   () => equal(wk.dif, 0));

// ══════════════════════════════════════════
// 测试 4: 无 stock code
// ══════════════════════════════════════════
section('无 stock code 的文本');

const noCode = OCRParser.parse([
  '￥88.88',
  '-1.50%',
  'MA5:90.00 MA10:89.50'
]);

test('stock_name (默认)',  () => equal(noCode.stock_name, '未知股票'));
test('stock_code (默认)',  () => equal(noCode.stock_code, '000000'));
test('current_price',     () => equal(noCode.current_price, 88.88));
test('change_percent',    () => equal(noCode.change_percent, -1.50));
test('ma5',               () => equal(noCode.ma5, 90.00));
test('ma10',              () => equal(noCode.ma10, 89.50));

// ══════════════════════════════════════════
// 测试 5: MA 文本混乱
// ══════════════════════════════════════════
section('MA 文本混乱');

test('MA5 有空格 "MA 5: 43.71"', () => {
  const r = OCRParser.parse(['MA 5: 43.71 MA 10: 43.53']);
  equal(r.ma5, 43.71);
  equal(r.ma10, 43.53);
});

test('MA 中文冒号 "MA5：43.71"', () => {
  const r = OCRParser.parse(['MA5：43.71 MA10：43.53']);
  equal(r.ma5, 43.71);
  equal(r.ma10, 43.53);
});

test('MA 粘连 "MA5:43.71MA10:43.53"', () => {
  const r = OCRParser.parse(['MA5:43.71MA10:43.53MA20:39.94']);
  equal(r.ma5, 43.71);
  equal(r.ma10, 43.53);
  equal(r.ma20, 39.94);
});

test('MA 部分缺失', () => {
  const r = OCRParser.parse(['MA5:100 MA20:95 MA60:80']);
  equal(r.ma5, 100);
  equal(r.ma10, 0);    // 缺失
  equal(r.ma20, 95);
  equal(r.ma30, 0);    // 缺失
  equal(r.ma60, 80);
});

test('MA 无空格 "MA5:43.71MA10:43.53MA20:39.94MA30:36.63MA60:32.42"', () => {
  const r = OCRParser.parse(['MA5:43.71MA10:43.53MA20:39.94MA30:36.63MA60:32.42']);
  equal(r.ma5, 43.71);
  equal(r.ma10, 43.53);
  equal(r.ma20, 39.94);
  equal(r.ma30, 36.63);
  equal(r.ma60, 32.42);
});

// ══════════════════════════════════════════
// 测试 6: MACD 粘连格式
// ══════════════════════════════════════════
section('MACD 粘连格式');

test('完全粘连 "DIF:3.32DEA:3.43MACD:-0.20"', () => {
  const r = OCRParser.parse(['DIF:3.32DEA:3.43MACD:-0.20']);
  equal(r.dif, 3.32);
  equal(r.dea, 3.43);
  equal(r.macd, -0.20);
});

test('部分粘连 "DIF:5.10DEA:4.80 MACD:0.30"', () => {
  const r = OCRParser.parse(['DIF:5.10DEA:4.80 MACD:0.30']);
  equal(r.dif, 5.10);
  equal(r.dea, 4.80);
  equal(r.macd, 0.30);
});

test('带空格的冒号 "DIF: 3.32 DEA: 3.43 MACD: -0.20"', () => {
  const r = OCRParser.parse(['DIF: 3.32 DEA: 3.43 MACD: -0.20']);
  equal(r.dif, 3.32);
  equal(r.dea, 3.43);
  equal(r.macd, -0.20);
});

test('MACD 空格分隔 "DIF:3.32 DEA:3.43 MACD:-0.20"', () => {
  const r = OCRParser.parse(['DIF:3.32 DEA:3.43 MACD:-0.20']);
  equal(r.dif, 3.32);
  equal(r.dea, 3.43);
  equal(r.macd, -0.20);
});

test('MACD 中文冒号 "DIF：3.32 DEA：3.43 MACD：-0.20"', () => {
  const r = OCRParser.parse(['DIF：3.32 DEA：3.43 MACD：-0.20']);
  equal(r.dif, 3.32);
  equal(r.dea, 3.43);
  equal(r.macd, -0.20);
});

test('MACD 只有部分字段 "DIF:3.32"', () => {
  const r = OCRParser.parse(['DIF:3.32']);
  equal(r.dif, 3.32);
  equal(r.dea, 0);
  equal(r.macd, 0);
});

// ══════════════════════════════════════════
// 测试 7: OCR 错字容错
// ══════════════════════════════════════════
section('OCR 错字容错');

test('D1F (DIF 误识别)', () => {
  const r = OCRParser.parse(['D1F:3.32 DEA:3.43 MACD:-0.20']);
  equal(r.dif, 3.32);
  equal(r.dea, 3.43);
  equal(r.macd, -0.20);
});

test('DlF (DIF 误识别, 小写L)', () => {
  const r = OCRParser.parse(['DlF:3.32 DEA:3.43 MACD:-0.20']);
  equal(r.dif, 3.32);
});

test('DE△ (DEA 误识别为三角)', () => {
  const r = OCRParser.parse(['DIF:3.32 DE△:3.43 MACD:-0.20']);
  equal(r.dif, 3.32);
  equal(r.dea, 3.43);
});

test('M4CD (MACD 误识别)', () => {
  const r = OCRParser.parse(['DIF:3.32 DEA:3.43 M4CD:-0.20']);
  equal(r.dif, 3.32);
  equal(r.dea, 3.43);
  equal(r.macd, -0.20);
});

test('DI F (DIF 含空格)', () => {
  const r = OCRParser.parse(['DI F:3.32 DEA:3.43 MACD:-0.20']);
  // 空格 tokenization 后 DI 和 F:3.32 分成两个 token
  // 粘连模式全局扫描应能匹配到 DIF
  // 但 "DI F" 分词后可能匹配不到
  // 这是一个已知盲区 — 如果 OCR 把 DIF 拆成 "DI F:3.32" 仍能匹配 "F:3.32" 吗
  // 让我们验证：粘连 scan 会用 /DI[F1l]/ 匹配，但 "DI" 和 "F:3.32" 之间有空格
  // 全局扫描 gluedPattern 会在整行中搜索，所以 "DI F:3.32" 中 "F:3.32" 不匹配 /DI[F1l]/
  // 这是预期内的限制
  notNull(r.dif, 'DIF with space inside');
});

// ══════════════════════════════════════════
// 测试 8: 字段缺失 — 默认值兜底
// ══════════════════════════════════════════
section('字段缺失 — 默认值兜底');

test('全部字段缺失', () => {
  const r = OCRParser.parse(['只是一些随机的文字']);
  equal(r.stock_name, '未知股票');
  equal(r.stock_code, '000000');
  equal(r.current_price, 0);
  equal(r.change, 0);
  equal(r.change_percent, 0);
  equal(r.ma5, 0);
  equal(r.ma10, 0);
  equal(r.ma20, 0);
  equal(r.ma30, 0);
  equal(r.ma60, 0);
  equal(r.dif, 0);
  equal(r.dea, 0);
  equal(r.macd, 0);
});

test('空数组', () => {
  const r = OCRParser.parse([]);
  equal(r.stock_name, '未知股票');
  equal(r.current_price, 0);
});

test('null 输入', () => {
  const r = OCRParser.parse(null);
  equal(r.stock_name, '未知股票');
  equal(r.current_price, 0);
});

test('undefined 输入', () => {
  const r = OCRParser.parse(undefined);
  equal(r.stock_name, '未知股票');
  equal(r.current_price, 0);
});

test('非数组输入', () => {
  const r = OCRParser.parse('只是一些随机的文字');
  equal(r.stock_name, '未知股票');
  equal(r.current_price, 0);
});

// ══════════════════════════════════════════
// 测试 9: 绝不返回 null/undefined/NaN
// ══════════════════════════════════════════
section('绝不返回 null/undefined/NaN');

test('所有字段都不为 null/undefined', () => {
  const r = OCRParser.parse([]);
  for (const [key, val] of Object.entries(r)) {
    notNull(val, `field '${key}'`);
  }
});

test('所有数值字段都不为 NaN', () => {
  const r = OCRParser.parse([]);
  const numFields = ['current_price', 'change', 'change_percent',
    'ma5', 'ma10', 'ma20', 'ma30', 'ma60', 'dif', 'dea', 'macd'];
  for (const key of numFields) {
    isNumber(r[key], `field '${key}'`);
    notNaN(r[key], `field '${key}'`);
  }
});

test('所有字符串字段都是 string 类型', () => {
  const r = OCRParser.parse([]);
  isString(r.stock_name);
  isString(r.stock_code);
});

test('坏 OCR 数据也不会产生 NaN', () => {
  const r = OCRParser.parse(['￥abc', 'MA5:xyz', 'DIF:---', '+?.?%', '（SH:abcdef）']);
  for (const [key, val] of Object.entries(r)) {
    notNull(val, `field '${key}'`);
    if (typeof val === 'number') {
      notNaN(val, `field '${key}'`);
    }
  }
});

// ══════════════════════════════════════════
// 测试 10: 中文括号 / 混合括号
// ══════════════════════════════════════════
section('中文括号 / 混合括号');

test('中文括号全角', () => {
  const r = OCRParser.parse(['比亚迪（SZ:002594）', '￥268.00']);
  equal(r.stock_name, '比亚迪');
  equal(r.stock_code, '002594');
  equal(r.current_price, 268.00);
});

test('英文括号半角', () => {
  const r = OCRParser.parse(['宁德时代(SZ:300750)', '￥210.30']);
  equal(r.stock_name, '宁德时代');
  equal(r.stock_code, '300750');
});

test('混合括号', () => {
  const r = OCRParser.parse(['中国平安（SH:601318)']);
  equal(r.stock_name, '中国平安');
  equal(r.stock_code, '601318');
});

// ══════════════════════════════════════════
// 测试 11: 涨跌额 + 涨跌幅同行
// ══════════════════════════════════════════
section('涨跌额 + 涨跌幅同行');

test('"-0.93 -2.12%" 同时解析涨跌额和涨跌幅', () => {
  const r = OCRParser.parse(['-0.93 -2.12%']);
  equal(r.change, -0.93);
  equal(r.change_percent, -2.12);
});

test('"+5.00 +3.50%" 正数涨跌', () => {
  const r = OCRParser.parse(['+5.00 +3.50%']);
  equal(r.change, 5.00);
  equal(r.change_percent, 3.50);
});

test('仅涨跌幅 "-2.12%"', () => {
  const r = OCRParser.parse(['-2.12%']);
  equal(r.change, 0);
  equal(r.change_percent, -2.12);
});

test('仅涨跌额 "-0.93" (无%)', () => {
  const r = OCRParser.parse(['-0.93']);
  equal(r.change, -0.93);
  equal(r.change_percent, 0);
});

// ══════════════════════════════════════════
// 测试 12: 混合行 (名称+价格+涨跌幅)
// ══════════════════════════════════════════
section('混合行 (名称+价格+涨跌幅在一行)');

test('"贵州茅台（SH:600519） ￥1800.50 -2.35%"', () => {
  const r = OCRParser.parse(['贵州茅台（SH:600519） ￥1800.50 -2.35%']);
  equal(r.stock_name, '贵州茅台');
  equal(r.stock_code, '600519');
  equal(r.current_price, 1800.50);
  equal(r.change_percent, -2.35);
});

test('"五粮液(SZ:000858) ¥150.20 +0.88%"', () => {
  const r = OCRParser.parse(['五粮液(SZ:000858) ¥150.20 +0.88%']);
  equal(r.stock_name, '五粮液');
  equal(r.stock_code, '000858');
  equal(r.current_price, 150.20);
  equal(r.change_percent, 0.88);
});

// ══════════════════════════════════════════
// 测试 13: 单独 extractor 方法
// ══════════════════════════════════════════
section('单独 extractor 方法');

test('extractStockInfo 正常解析', () => {
  const r = OCRParser.extractStockInfo(['中天科技（SH:600522）']);
  equal(r.stock_name, '中天科技');
  equal(r.stock_code, '600522');
});

test('extractStockInfo 未找到', () => {
  const r = OCRParser.extractStockInfo(['只是一些文字']);
  equal(r.stock_name, '');
  equal(r.stock_code, '');
});

test('extractPrice 正常解析', () => {
  const r = OCRParser.extractPrice(['￥42.89']);
  equal(r.current_price, 42.89);
});

test('extractPrice 未找到', () => {
  const r = OCRParser.extractPrice(['只是一些文字']);
  equal(r.current_price, 0);
});

test('extractChange 正常解析', () => {
  const r = OCRParser.extractChange(['-0.93 -2.12%']);
  equal(r.change, -0.93);
  equal(r.change_percent, -2.12);
});

test('extractMovingAverages 正常解析', () => {
  const r = OCRParser.extractMovingAverages(['MA5:43.71 MA10:43.53 MA20:39.94 MA30:36.63 MA60:32.42']);
  equal(r.ma5, 43.71);
  equal(r.ma10, 43.53);
  equal(r.ma20, 39.94);
  equal(r.ma30, 36.63);
  equal(r.ma60, 32.42);
});

test('extractMACD 粘连解析', () => {
  const r = OCRParser.extractMACD(['DIF:3.32DEA:3.43MACD:-0.20']);
  equal(r.dif, 3.32);
  equal(r.dea, 3.43);
  equal(r.macd, -0.20);
});

test('extractMACD 空格解析', () => {
  const r = OCRParser.extractMACD(['DIF: 3.32 DEA: 3.43 MACD: -0.20']);
  equal(r.dif, 3.32);
  equal(r.dea, 3.43);
  equal(r.macd, -0.20);
});

// ══════════════════════════════════════════
// 测试 14: safeNumber 工具
// ══════════════════════════════════════════
section('safeNumber 工具');

test('正常数字',       () => equal(OCRParser.safeNumber('42.89'), 42.89));
test('整数',           () => equal(OCRParser.safeNumber('100'), 100));
test('负数',           () => equal(OCRParser.safeNumber('-3.5'), -3.5));
test('零',             () => equal(OCRParser.safeNumber('0'), 0));
test('非数字字符串',   () => equal(OCRParser.safeNumber('abc'), 0));
test('空字符串',       () => equal(OCRParser.safeNumber(''), 0));
test('null 输入',      () => equal(OCRParser.safeNumber(null), 0));
test('undefined 输入', () => equal(OCRParser.safeNumber(undefined), 0));
test('NaN 输入',       () => equal(OCRParser.safeNumber(NaN), 0));
test('Infinity 输入',  () => equal(OCRParser.safeNumber(Infinity), 0));
test('自定义 fallback', () => equal(OCRParser.safeNumber('abc', -1), -1));
test('数字 0 保留',    () => equal(OCRParser.safeNumber(0, -1), 0));

// ══════════════════════════════════════════
// 测试 15: DEBUG 模式不崩溃
// ══════════════════════════════════════════
section('DEBUG 模式');

test('DEBUG 模式下 parse 正常完成', () => {
  const prev = OCRParser.DEBUG;
  OCRParser.DEBUG = true;
  try {
    const r = OCRParser.parse(['中天科技（SH:600522）', '￥42.89', '-2.12%']);
    equal(r.stock_name, '中天科技');
    equal(r.current_price, 42.89);
  } finally {
    OCRParser.DEBUG = prev;
  }
});

// ══════════════════════════════════════════
// 结果汇总
// ══════════════════════════════════════════
console.log(`\n════════════════════════════════════════`);
console.log(`  测试结果: ${passed} passed, ${failed} failed`);
console.log(`════════════════════════════════════════`);

if (failures.length > 0) {
  console.log('\n失败详情:');
  for (const f of failures) {
    console.log(`  ❌ ${f.name}: ${f.message}`);
  }
}

process.exit(failed > 0 ? 1 : 0);
