const OCRParser = require('../utils/ocrParser');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✅ ${name}`);
    passed++;
  } catch (e) {
    console.error(`❌ ${name}: ${e.message}`);
    failed++;
  }
}

function equal(actual, expected, msg) {
  if (actual !== expected) {
    throw new Error(`${msg}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

// ── 主测试：中天科技范例 ──
const main = OCRParser.parse([
  '中天科技（SH:600522）',
  '￥42.89',
  '-2.12%',
  'MA5:43.71 MA10:43.53 MA20:39.94',
  'DIF:3.32DEA:3.43MACD:-0.20'
]);

test('stock_name', () => equal(main.stock_name, '中天科技'));
test('stock_code', () => equal(main.stock_code, '600522'));
test('current_price', () => equal(main.current_price, 42.89));
test('change_percent', () => equal(main.change_percent, -2.12));
test('ma5', () => equal(main.ma5, 43.71));
test('ma10', () => equal(main.ma10, 43.53));
test('ma20', () => equal(main.ma20, 39.94));
test('dif', () => equal(main.dif, 3.32));
test('dea', () => equal(main.dea, 3.43));
test('macd', () => equal(main.macd, -0.20));

// ── 边界：SZ 市场 ──
const sz = OCRParser.parse(['万科A（SZ:000002）', '￥15.60', '+1.23%']);
test('SZ stock_code', () => equal(sz.stock_code, '000002'));
test('SZ stock_name', () => equal(sz.stock_name, '万科A'));
test('SZ price', () => equal(sz.current_price, 15.60));
test('SZ change', () => equal(sz.change_percent, 1.23));

// ── 边界：MACD 带空格 ──
const macdSpaced = OCRParser.parse(['DIF: 3.32 DEA: 3.43 MACD: -0.20', '贵州茅台（SH:600519）']);
test('MACD spaced dif', () => equal(macdSpaced.dif, 3.32));
test('MACD spaced dea', () => equal(macdSpaced.dea, 3.43));
test('MACD spaced macd', () => equal(macdSpaced.macd, -0.20));

// ── 边界：混合行 ──
const mixed = OCRParser.parse(['贵州茅台（SH:600519） ￥1800.50 -2.35%']);
test('mixed stock_name', () => equal(mixed.stock_name, '贵州茅台'));
test('mixed stock_code', () => equal(mixed.stock_code, '600519'));
test('mixed price', () => equal(mixed.current_price, 1800.50));
test('mixed change', () => equal(mixed.change_percent, -2.35));

// ── 边界：空输入 ──
const empty = OCRParser.parse([]);
test('empty stock_name null', () => equal(empty.stock_name, null));
test('empty dif null', () => equal(empty.dif, null));

// ── 边界：中文括号 ──
const cnParen = OCRParser.parse(['比亚迪（SZ:002594）', '￥268.00']);
test('cn paren name', () => equal(cnParen.stock_name, '比亚迪'));
test('cn paren code', () => equal(cnParen.stock_code, '002594'));

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
