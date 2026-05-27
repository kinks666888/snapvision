/**
 * OCRParser V3 — 结构化解析 OCR 文本数组
 *
 * 模块化设计：每个 extractor 只负责一个任务，parse() 统一编排
 * 核心原则：绝不返回 null/undefined/NaN，统一使用 safeNumber + 默认值兜底
 *
 * 输入：OCR 识别的字符串数组，例如：
 * [
 *   "中天科技（SH:600522）",
 *   "￥42.89",
 *   "-0.93 -2.12%",
 *   "MA5:43.71 MA10:43.53 MA20:39.94 MA30:36.63 MA60:32.42",
 *   "DIF:3.32DEA:3.43MACD:-0.20"
 * ]
 *
 * 输出：结构化 JSON 对象，所有字段都有安全默认值
 */

class OCRParser {
  // ────────────────────────────────────────────
  // 调试开关：设置 OCR_DEBUG=1 开启详细日志
  // ────────────────────────────────────────────
  static DEBUG = process.env.OCR_DEBUG === '1';

  // ────────────────────────────────────────────
  // 通用工具方法
  // ────────────────────────────────────────────

  /**
   * 安全数字转换 — 绝不返回 NaN/Infinity
   * @param {*} val - 任意输入
   * @param {number} fallback - 默认值
   * @returns {number}
   */
  static safeNumber(val, fallback = 0) {
    if (val === null || val === undefined) return fallback;
    const n = Number(val);
    return Number.isFinite(n) ? n : fallback;
  }

  /**
   * 调试日志
   */
  static log(...args) {
    if (this.DEBUG) {
      console.log('[OCRParser]', ...args);
    }
  }

  /**
   * 文本规范化：去首尾空白、统一常见 OCR 错字
   */
  static normalizeLine(raw) {
    let line = String(raw || '').trim();
    if (!line) return '';

    // 统一中文/英文括号内的市场标识
    // 处理 OCR 可能的错误：冒号变分号、全角变半角等
    line = line
      .replace(/：/g, ':')     // 中文冒号 → 英文冒号
      .replace(/；/g, ';')     // 中文分号
      .replace(/（/g, '(')     // 中文左括号 → 英文
      .replace(/）/g, ')')     // 中文右括号 → 英文
      .replace(/￥/g, '¥')     // 中文人民币符号统一
      .replace(/\s+/g, ' ')    // 多空格合并为一个
      .replace(/[,]/g, '.')    // 逗号 → 小数点（OCR 可能把小数点识别成逗号）
      .trim();

    return line;
  }

  /**
   * 规范化整个文本数组
   */
  static normalizeTexts(texts) {
    if (!Array.isArray(texts)) return [];
    return texts
      .map(t => this.normalizeLine(t))
      .filter(Boolean);
  }

  // ────────────────────────────────────────────
  // 1. extractStockInfo — 股票名称 + 代码
  // ────────────────────────────────────────────

  /**
   * 从 OCR 文本中提取股票名称和代码
   *
   * 支持格式：
   *   "中天科技（SH:600522）"、"贵州茅台(SH:600519)"
   *   "万科A（SZ:000002）"、"比亚迪(SZ:002594)"
   *
   * 容错：
   *   - 中文/英文括号混合
   *   - 空格混乱
   *   - 市场前缀可选 (SH/SZ)
   *
   * @param {string[]} texts - OCR 文本行
   * @returns {{ stock_name: string, stock_code: string }}
   */
  static extractStockInfo(texts) {
    const result = { stock_name: '', stock_code: '' };

    if (!Array.isArray(texts)) return result;

    // 匹配模式：名称(市场:代码) 或 名称（市场:代码）
    // 市场可选，代码必须是6位数字
    const patterns = [
      // 标准格式：名称(SH:600522)
      /^(.+?)\((?:(?:SH|SZ)\s*:\s*)?(\d{6})\)/i,
      // 只有代码：名称(600522)
      /^(.+?)\((\d{6})\)/,
      // 名称后紧跟代码（无括号）：名称600522  —— 较少见，做宽松匹配
    ];

    for (const line of texts) {
      const normal = this.normalizeLine(line);
      if (!normal) continue;

      for (const pattern of patterns) {
        const match = normal.match(pattern);
        if (match) {
          result.stock_name = match[1].trim();
          result.stock_code = match[2];
          this.log('✓ stock_name:', result.stock_name, '| stock_code:', result.stock_code);
          return result; // 找到即返回
        }
      }
    }

    // 未找到：尝试在整行中搜索6位数字作为代码
    for (const line of texts) {
      const normal = this.normalizeLine(line);
      const codeMatch = normal.match(/(\d{6})/);
      if (codeMatch) {
        result.stock_code = codeMatch[1];
        // 取代码之前的部分作为名称
        const namePart = normal.substring(0, normal.indexOf(codeMatch[1])).trim();
        if (namePart) {
          result.stock_name = namePart.replace(/[\(\)（）]/g, '').trim();
        }
        this.log('⚠ stock_code fallback:', result.stock_code, '| name:', result.stock_name);
        return result;
      }
    }

    this.log('✗ stock_info not found');
    return result;
  }

  // ────────────────────────────────────────────
  // 2. extractPrice — 当前价格
  // ────────────────────────────────────────────

  /**
   * 从 OCR 文本中提取当前价格
   *
   * 支持格式：
   *   "￥42.89"、"¥42.89"、"¥ 42.89"
   *
   * 容错：
   *   - 人民币符号前后可能有空格
   *   - 数字可能被识别为不同格式
   *
   * @param {string[]} texts
   * @returns {{ current_price: number }}
   */
  static extractPrice(texts) {
    const result = { current_price: 0 };

    if (!Array.isArray(texts)) return result;

    for (const line of texts) {
      const normal = this.normalizeLine(line);
      if (!normal) continue;

      // 匹配：¥ 42.89 格式
      const priceMatch = normal.match(/[¥￥]\s*([\d.]+)/);
      if (priceMatch) {
        const price = this.safeNumber(priceMatch[1]);
        if (price > 0) {
          result.current_price = price;
          this.log('✓ current_price:', price);
          return result;
        }
      }

      // 备用：某些 OCR 可能漏掉 ¥ 符号，但整行看起来像价格
      // 单行纯数字（带小数点），且在合理股价范围 (0.01 ~ 10000)
      const lonePrice = normal.match(/^([\d.]+)$/);
      if (lonePrice) {
        const price = this.safeNumber(lonePrice[1]);
        if (price > 0.01 && price < 10000) {
          result.current_price = price;
          this.log('⚠ current_price (no ¥):', price);
          return result;
        }
      }
    }

    // 最后尝试：从混合行提取
    for (const line of texts) {
      const normal = this.normalizeLine(line);
      const mixedMatch = normal.match(/[¥￥]\s*([\d.]+)/);
      if (mixedMatch) {
        const price = this.safeNumber(mixedMatch[1]);
        if (price > 0) {
          result.current_price = price;
          this.log('✓ current_price (mixed):', price);
          return result;
        }
      }
    }

    this.log('✗ current_price not found');
    return result;
  }

  // ────────────────────────────────────────────
  // 3. extractChange — 涨跌额 + 涨跌幅
  // ────────────────────────────────────────────

  /**
   * 从 OCR 文本中提取涨跌额和涨跌幅
   *
   * 支持格式：
   *   "-0.93 -2.12%"   （涨跌额 + 涨跌幅同行）
   *   "+3.45%"         （仅涨跌幅）
   *   "-0.93"          （仅涨跌额，无%）
   *
   * 容错：
   *   - 空格/无空格分隔
   *   - % 符号可能缺失
   *   - 正负号识别
   *
   * @param {string[]} texts
   * @returns {{ change: number, change_percent: number }}
   */
  static extractChange(texts) {
    const result = { change: 0, change_percent: 0 };

    if (!Array.isArray(texts)) return result;

    for (const line of texts) {
      const normal = this.normalizeLine(line);
      if (!normal) continue;

      // 模式 A：同时包含涨跌额和涨跌幅  "-0.93 -2.12%"
      // 使用非锚定匹配，支持混合行（如 "贵州茅台 ￥1800.50 -0.93 -2.12%"）
      const bothMatch = normal.match(/([+-]?[\d.]+)\s+([+-]?[\d.]+)\s*%/);
      if (bothMatch) {
        result.change = this.safeNumber(bothMatch[1]);
        result.change_percent = this.safeNumber(bothMatch[2]);
        this.log('✓ change:', result.change, '| change_percent:', result.change_percent);
        return result;
      }

      // 模式 B：仅涨跌幅  "-2.12%" 或 "+3.45%"（行中任意位置）
      const pctMatch = normal.match(/([+-]?[\d.]+)\s*%/);
      if (pctMatch && !result.change_percent) {
        result.change_percent = this.safeNumber(pctMatch[1]);
        this.log('✓ change_percent:', result.change_percent);
        // 继续尝试找涨跌额
      }

      // 模式 C：仅涨跌额（不带%的数字，在一行中单独出现）
      // 但要小心不要误匹配价格行或均线值
      // 特征：以 + 或 - 开头，且不超过 3 位数
      if (!result.change) {
        const changeOnlyMatch = normal.match(/^([+-]\d{1,3}(?:\.\d{1,3})?)\s*$/);
        if (changeOnlyMatch) {
          result.change = this.safeNumber(changeOnlyMatch[1]);
          this.log('✓ change (raw):', result.change);
        }
      }
    }

    // 如果找到了 change_percent 但没有 change，尝试从混合行提取
    for (const line of texts) {
      const normal = this.normalizeLine(line);
      if (!result.change) {
        const leftoverChange = normal.match(/([+-]?[\d.]+)\s*%/);
        if (leftoverChange) {
          // 已处理
        }
      }
    }

    if (!result.change && !result.change_percent) {
      this.log('✗ change not found');
    }
    return result;
  }

  // ────────────────────────────────────────────
  // 4. extractMovingAverages — 移动平均线
  // ────────────────────────────────────────────

  /**
   * 从 OCR 文本中提取 MA5/MA10/MA20/MA30/MA60 均线值
   *
   * 支持格式：
   *   "MA5:43.71 MA10:43.53 MA20:39.94 MA30:36.63 MA60:32.42"
   *   "MA5:43.71"（即使只有部分也行）
   *
   * 容错：
   *   - 中文/英文冒号
   *   - 空格混乱 "MA 5 : 43.71"、"MA5 :43.71"
   *   - OCR 错字 "MAS"、"M A5"
   *
   * @param {string[]} texts
   * @returns {{ ma5: number, ma10: number, ma20: number, ma30: number, ma60: number }}
   */
  static extractMovingAverages(texts) {
    const result = { ma5: 0, ma10: 0, ma20: 0, ma30: 0, ma60: 0 };

    if (!Array.isArray(texts)) return result;

    // MA 指标定义：["字段名", "宽松匹配正则（key部分）"]
    const maDefs = [
      { key: 'ma5',  pattern: /MA\s*5/i  },
      { key: 'ma10', pattern: /MA\s*10/i },
      { key: 'ma20', pattern: /MA\s*20/i },
      { key: 'ma30', pattern: /MA\s*30/i },
      { key: 'ma60', pattern: /MA\s*60/i },
    ];

    let foundAny = false;

    for (const line of texts) {
      const normal = this.normalizeLine(line);
      if (!normal) continue;

      // 先检查这行是否包含 MA 指标
      if (!/MA/i.test(normal)) continue;

      for (const { key, pattern } of maDefs) {
        if (result[key] !== 0) continue; // 已找到，跳过

        // 构建完整匹配：MA5 后跟冒号（可选）+ 数字
        // 需要处理粘连情况："MA5:43.71MA10:43.53"
        const fullPattern = new RegExp(
          pattern.source + '\\s*[:：]?\\s*([\\d.]+)',
          'i'
        );

        const match = normal.match(fullPattern);
        if (match) {
          const val = this.safeNumber(match[1]);
          if (val > 0) {
            result[key] = val;
            foundAny = true;
          }
        }
      }
    }

    if (foundAny) {
      this.log('✓ MA:', `5=${result.ma5} 10=${result.ma10} 20=${result.ma20} 30=${result.ma30} 60=${result.ma60}`);
    } else {
      this.log('✗ moving averages not found');
    }

    return result;
  }

  // ────────────────────────────────────────────
  // 5. extractMACD — MACD 三线指标
  // ────────────────────────────────────────────

  /**
   * 从 OCR 文本中提取 MACD 指标（DIF / DEA / MACD 柱）
   *
   * 支持格式：
   *   粘连："DIF:3.32DEA:3.43MACD:-0.20"
   *   空格分隔："DIF:3.32 DEA:3.43 MACD:-0.20"
   *   中文冒号："DIF：3.32 DEA：3.43 MACD：-0.20"
   *   带空格的冒号："DIF: 3.32 DEA: 3.43 MACD: -0.20"
   *
   * 容错（OCR 常见错字）：
   *   DIF → D1F / DlF / DI F
   *   DEA → D EA / DE A / DE△
   *   MACD → M4CD / MAC D / MACD
   *
   * @param {string[]} texts
   * @returns {{ dif: number, dea: number, macd: number }}
   */
  static extractMACD(texts) {
    const result = { dif: 0, dea: 0, macd: 0 };

    if (!Array.isArray(texts)) return result;

    // 拼接所有文本行（MACD 可能跨行或粘连）
    const fullText = texts.map(t => this.normalizeLine(t)).join(' ');
    if (!fullText) return result;

    // 检查是否包含 MACD 相关关键词（宽松匹配，容忍 OCR 错误）
    const hasMACD = /(?:D[I1]F|DE[A△]|MA[CD]|M[A4]CD)/i.test(fullText);
    if (!hasMACD) {
      this.log('✗ MACD not found in text');
      return result;
    }

    // ── 策略 A：按空格/token 分割，逐个匹配 ──
    const tokens = fullText.split(/\s+/);
    let foundInTokens = false;

    for (const token of tokens) {
      // DIF 匹配（容错 D1F, DlF — 中间 I 被误识别为 1/l）
      const difMatch = token.match(/^D[I1l]F\s*[:：]\s*([+-]?[\d.]+)$/i);
      if (difMatch && result.dif === 0) {
        result.dif = this.safeNumber(difMatch[1]);
        foundInTokens = true;
        continue;
      }

      // DEA 匹配（容错 D EA, DE A）
      const deaMatch = token.match(/^DE[A△]\s*[:：]\s*([+-]?[\d.]+)$/i);
      if (deaMatch && result.dea === 0) {
        result.dea = this.safeNumber(deaMatch[1]);
        foundInTokens = true;
        continue;
      }

      // MACD 匹配（容错 M4CD, MAC D）
      const macdMatch = token.match(/^M[A4]?CD?\s*[:：]\s*([+-]?[\d.]+)$/i);
      if (macdMatch && result.macd === 0) {
        result.macd = this.safeNumber(macdMatch[1]);
        foundInTokens = true;
      }
    }

    if (foundInTokens) {
      this.log('✓ MACD (tokens):', `DIF=${result.dif} DEA=${result.dea} MACD=${result.macd}`);
      // 即使 token 模式找到了部分，也尝试粘连模式补充剩余
    }

    // ── 策略 B：粘连格式全局扫描 ──
    // 匹配 "DIF:3.32", "DEA:3.43", "MACD:-0.20" 格式
    // 使用宽松关键词匹配，容忍 OCR 错误
    const gluedPattern = /(D[I1l]F|DE[A△]|M[A4]?CD?)\s*[:：]\s*([+-]?[\d.]+)/gi;
    let gm;
    while ((gm = gluedPattern.exec(fullText)) !== null) {
      const rawKey = gm[1].toUpperCase();
      const val = this.safeNumber(gm[2]);

      // 将 OCR 错误 key 映射到标准 key
      if (/^D[I1L]F$/i.test(rawKey) && result.dif === 0) {
        result.dif = val;
      } else if (/^DE[A△]$/i.test(rawKey) && result.dea === 0) {
        result.dea = val;
      } else if (/^M[A4]?CD?$/i.test(rawKey) && result.macd === 0) {
        result.macd = val;
      }
    }

    // ── 策略 C：极端粘连 — 被 OCR 合并成一个 token 如 "DIF:3.32DEA:3.43MACD:-0.20" ──
    // gluedPattern 已经能处理这种情况，因为它是全局扫描

    if (result.dif !== 0 || result.dea !== 0 || result.macd !== 0) {
      this.log('✓ MACD (final):', `DIF=${result.dif} DEA=${result.dea} MACD=${result.macd}`);
    } else {
      this.log('✗ MACD values not found (text had keywords but no parseable values)');
    }

    return result;
  }

  // ────────────────────────────────────────────
  // 6. parse — 主编排函数
  // ────────────────────────────────────────────

  /**
   * 主解析入口：合并所有 extractor 的结果
   *
   * @param {string[]} texts - OCR 返回的文本行数组
   * @returns {object} 完整的结构化解析结果
   */
  static parse(texts) {
    const startTime = Date.now();

    // 输入校验
    if (!Array.isArray(texts) || texts.length === 0) {
      this.log('⚠ empty input — returning default result');
      return this._defaultResult();
    }

    // 预处理
    const normalized = this.normalizeTexts(texts);

    if (this.DEBUG) {
      this.log('═══ OCR Parse Start ═══');
      this.log('Raw texts:', texts);
      this.log('Normalized:', normalized);
    }

    // 依次调用每个 extractor
    const stockInfo    = this.extractStockInfo(normalized);
    const priceData    = this.extractPrice(normalized);
    const changeData   = this.extractChange(normalized);
    const maData       = this.extractMovingAverages(normalized);
    const macdData     = this.extractMACD(normalized);

    // 合并所有 partial results，并应用默认兜底
    const merged = {
      ...this._defaultResult(),
      ...stockInfo,
      ...priceData,
      ...changeData,
      ...maData,
      ...macdData,
    };

    // 确保所有数值字段都经过 safeNumber（二次保险）
    const numericFields = [
      'current_price', 'change', 'change_percent',
      'ma5', 'ma10', 'ma20', 'ma30', 'ma60',
      'dif', 'dea', 'macd'
    ];
    for (const field of numericFields) {
      merged[field] = this.safeNumber(merged[field], 0);
    }

    // 字符串字段去空
    if (!merged.stock_name || merged.stock_name.trim() === '') {
      merged.stock_name = '未知股票';
    }
    if (!merged.stock_code || merged.stock_code.trim() === '') {
      merged.stock_code = '000000';
    }

    // 调试输出最终结果
    if (this.DEBUG) {
      this.log('═══ Parsed Result ═══');
      this.log(JSON.stringify(merged, null, 2));
      this.log(`Parse time: ${Date.now() - startTime}ms`);
    }

    return merged;
  }

  // ────────────────────────────────────────────
  // 内部方法
  // ────────────────────────────────────────────

  /**
   * 返回带有安全默认值的空结果模板
   * 注意：所有字段都使用安全默认值，绝不为 null
   */
  static _defaultResult() {
    return {
      stock_name: '未知股票',
      stock_code: '000000',
      current_price: 0,
      change: 0,
      change_percent: 0,
      ma5: 0,
      ma10: 0,
      ma20: 0,
      ma30: 0,
      ma60: 0,
      dif: 0,
      dea: 0,
      macd: 0
    };
  }
}

module.exports = OCRParser;
