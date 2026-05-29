const OCRParser = require('../utils/ocrParser');
const { execFile } = require('child_process');
const path = require('path');
const sharp = require('sharp');
const { promisify } = require('util');
const { v4: uuidv4 } = require('uuid');

const AnalysisModel = require('../models/analysis');
const Indicators = require('../utils/indicators');
const KlineParser = require('../utils/klineParser');
const marketService = require('../services/marketService');
const AIAnalysisService = require('../services/aiAnalysisService');
const SignalEngine = require('../services/signalEngine');
const sectorService = require('../services/sectorService');
const relatedStockService = require('../services/relatedStockService');

// ══ AI 推理层（新架构） ══
const TrendAnalyzer   = require('../ai/trendAnalyzer');
const RiskAnalyzer    = require('../ai/riskAnalyzer');
const AI_SignalEngine = require('../ai/signalEngine');
const StrategyEngine  = require('../ai/strategyEngine');
const ReportGenerator = require('../ai/reportGenerator');

const execFileAsync = promisify(execFile);

function parseOcrTexts(stdout) {
  const text = String(stdout || '').trim();
  if (!text) return [];

  // 1) 尝试直接解析纯 JSON
  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) {
      return parsed.map(item => String(item).trim()).filter(Boolean);
    }
  } catch {
    // 继续尝试其他方式
  }

  // 2) OCR 日志可能污染 stdout — 尝试提取 JSON 数组
  //    匹配最后一个完整的 JSON 数组
  const arrayMatch = text.match(/\[.*\]/s);
  if (arrayMatch) {
    try {
      const parsed = JSON.parse(arrayMatch[0]);
      if (Array.isArray(parsed)) {
        console.log('⚠️ OCR stdout 含有非JSON日志，已自动提取数组');
        return parsed.map(item => String(item).trim()).filter(Boolean);
      }
    } catch {
      // 提取失败，继续
    }
  }

  // 3) 彻底失败
  console.warn('⚠️ OCR stdout 无法解析:', text.substring(0, 200));
  return [];
}

function safeNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

class AnalysisController {
  /**
   * 分析上传的图片
   * POST /api/analyze
   */
  static async analyze(req, res) {
    try {
      console.log('🔥 analyze API triggered');

      if (!req.file) {
        return res.status(400).json({ error: '请上传图片文件' });
      }

      // ── 步骤1: OCR 识别 ──
      const fileStockInfo = KlineParser.extractStockInfo(req.file.originalname);
      const imagePath = path.resolve(__dirname, '..', req.file.path);
      const ocrPath = path.resolve(__dirname, '..', 'ocr.py');

      // 压缩图片，降低 OCR 内存占用
      const compressedPath = `${imagePath}_small.jpg`;
      await sharp(imagePath)
        .resize(1280, 1280, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 80 })
        .toFile(compressedPath);

      const pythonBin = process.env.PYTHON_BIN || 'python3';

      const { stdout, stderr } = await execFileAsync(
        pythonBin,
        [ocrPath, compressedPath],
        {
          maxBuffer: 10 * 1024 * 1024,
          env: {
            ...process.env,
            PYTHONUNBUFFERED: '1'
          }
        }
      );

      if (stderr && process.env.NODE_ENV === 'development') {
        console.error('OCR stderr:', stderr);
      }

      const ocrTexts = parseOcrTexts(stdout);
      console.log('📷 OCR Result:', ocrTexts);

      const parsedData = OCRParser.parse(ocrTexts);
      console.log('📋 Parsed Data:', JSON.stringify(parsedData));

      // ── 步骤2: 确定股票代码 ──
      const stockName = parsedData.stock_name !== '未知股票'
        ? parsedData.stock_name
        : (fileStockInfo.name || '未知股票');

      const stockCode = parsedData.stock_code !== '000000'
        ? parsedData.stock_code
        : (fileStockInfo.code || '000000');

      console.log(`🎯 Initial stock: ${stockName} (${stockCode})`);

      // ── 步骤3: 获取真实行情数据 ──
      let klines = [];
      let quote = null;
      let marketFetchError = null;

      try {
        console.log(`📡 正在获取真实行情: ${stockCode}...`);

        // 并行获取 K 线和实时行情
        const [klineResult, quoteResult] = await Promise.allSettled([
          marketService.getKlineData(stockCode, 60),
          marketService.getRealtimeQuote(stockCode),
        ]);

        if (klineResult.status === 'fulfilled') {
          klines = klineResult.value || [];
          console.log(`✅ K线获取成功: ${klines.length} 条`);
        } else {
          marketFetchError = klineResult.reason?.message || 'K线获取失败';
          console.warn(`⚠️ K线获取失败: ${marketFetchError}`);
        }

        if (quoteResult.status === 'fulfilled') {
          quote = quoteResult.value;
          console.log(`✅ 实时行情: ${quote.name} ¥${quote.price} ${quote.change_pct > 0 ? '+' : ''}${quote.change_pct}%`);
        } else {
          console.warn(`⚠️ 行情获取失败: ${quoteResult.reason?.message}`);
        }
      } catch (err) {
        marketFetchError = err.message;
        console.warn(`⚠️ 行情服务异常: ${err.message}`);
      }

      // ── 步骤4: 技术指标计算（基于真实数据） ──
      const closePrices = klines.length > 0
        ? klines.map(k => safeNumber(k.close)).filter(v => v > 0)
        : [];

      const volumes = klines.length > 0
        ? klines.map(k => safeNumber(k.volume))
        : [];

      // 真实 MACD
      const macdData = closePrices.length >= 26
        ? Indicators.macd(closePrices)
        : { macd: 0, signal: 0, histogram: 0, macdLine: [], signalLine: [], histogramArray: [] };

      const crossover = Indicators.getCrossover(macdData);

      // 支撑压力位
      const supportResistance = klines.length >= 5
        ? Indicators.getSupportResistance(klines)
        : { support: 0, resistance: 0 };

      // 多周期 MA
      const mas = closePrices.length >= 60
        ? Indicators.calculateAllMA(closePrices)
        : { ma5: 0, ma10: 0, ma20: 0, ma60: 0 };

      // 价格趋势
      const trend = closePrices.length >= 10
        ? Indicators.priceTrend(closePrices.slice(-20))
        : { direction: '横盘', strength: '弱' };

      // 均量
      const avgVol = volumes.length >= 10
        ? Indicators.avgVolume(volumes)
        : 0;

      console.log(`📊 指标计算完成 — MACD:${macdData.macd.toFixed(3)} 趋势:${trend.direction}/${trend.strength}`);

      // ── 步骤5: 名称与价格修正 ──
      // 行情 API 返回的名称最可靠，覆盖 OCR/文件名
      let finalStockName = stockName;
      if (quote && quote.name && quote.name !== '未知' && !/^\d{6}$/.test(quote.name)) {
        finalStockName = quote.name;
        console.log(`🔧 名称已从行情API修正: "${stockName}" → "${finalStockName}"`);
      }
      console.log(`🎯 Final stock: ${finalStockName} (${stockCode})`);

      // 优先级: 实时行情 > OCR 识别 > 0
      const price = quote && quote.price > 0
        ? quote.price
        : (parsedData.current_price || 0);

      const changePercent = quote
        ? safeNumber(quote.change_pct)
        : safeNumber(parsedData.change_percent);

      const changeAmount = quote
        ? safeNumber(quote.change)
        : safeNumber(parsedData.change);

      // MACD 字段映射: OCR 值作为参考，真实计算值优先
      const macdLine   = macdData.macd !== 0   ? macdData.macd   : safeNumber(parsedData.dif);
      const signalLine = macdData.signal !== 0 ? macdData.signal : safeNumber(parsedData.dea);
      const histogram  = macdData.histogram !== 0 ? macdData.histogram : safeNumber(parsedData.macd);

      // ── 步骤6: AI 分析报告 ──
      const aiReport = AIAnalysisService.generateReport({
        stockInfo: {
          code: stockCode,
          name: finalStockName,
          marketName: marketService.resolveMarket(stockCode).marketName,
        },
        quote: quote || {
          price, change: changeAmount, change_pct: changePercent,
          volume: klines.length > 0 ? klines[klines.length - 1].volume : 0,
          amount: 0, turnover: 0, preclose: 0,
        },
        klines,
        indicators: {
          macd: macdLine,
          signal: signalLine,
          histogram,
          support: supportResistance.support,
          resistance: supportResistance.resistance,
          crossover: crossover.crossover,
          crossover_type: crossover.type,
        },
        mas,
        ocrPrice: parsedData.current_price || 0,
      });

      console.log(`🤖 AI分析: ${aiReport.recommendation}`);

      // ── 步骤6.5: AI 信号引擎 ──
      const signal = SignalEngine.generate({
        price,
        change_pct: changePercent,
        mas,
        macd: macdLine,
        signal: signalLine,
        histogram,
        crossover_type: crossover.type,
        support: supportResistance.support,
        resistance: supportResistance.resistance,
        trend_dir: trend.direction,
        trend_strength: trend.strength,
        klines,
        latest_volume: klines.length > 0 ? (klines[klines.length - 1].volume || 0) : 0,
        avg_volume: avgVol,
      });
      console.log(`📡 信号引擎: ${signal.trend} | 强度:${signal.signal_strength} | 风险:${signal.risk_level}`);

      // ── 步骤6.6: 板块 + 相关股票 ──
      let sector = { industry:'', change_percent:0, heat:'中性', description:'', concepts:[], region:'' };
      let relatedStocks = [];
      try {
        sector = await sectorService.getSectorInfo(stockCode);
        relatedStocks = await relatedStockService.getRelatedStocks(stockCode, sector.industry);
        console.log(`📊 板块: ${sector.industry} | 相关股票: ${relatedStocks.length}只`);
      } catch (err) {
        console.warn(`⚠️ 板块信息获取失败: ${err.message}`);
      }

      // ═══════════════════════════════════════
      // ── AI 推理层（新架构） ──
      // ═══════════════════════════════════════

      // 步骤 A: 趋势分析
      const closes = klines.map(k => k.close).filter(v => v > 0);
      const trendAnalysis = TrendAnalyzer.analyze({ price, mas, closes });
      console.log(`📈 [AI/趋势] ${trendAnalysis.direction} ${trendAnalysis.strength} (${trendAnalysis.score})`);

      // 步骤 B: 风险分析
      const riskAnalysis = RiskAnalyzer.analyze({
        price, changePct: changePercent,
        support: supportResistance.support, resistance: supportResistance.resistance,
        histogram, crossoverType: crossover.type,
        latestVol: klines.length > 0 ? (klines[klines.length-1]?.volume || 0) : 0,
        avgVol, klines,
      });
      console.log(`⚠️ [AI/风险] ${riskAnalysis.level} (${riskAnalysis.score})`);

      // 步骤 C: 综合信号（新引擎）
      const aiSignal = AI_SignalEngine.generate({
        price, change_pct: changePercent, mas,
        macd: macdLine, signal: signalLine, histogram,
        crossover_type: crossover.type,
        support: supportResistance.support, resistance: supportResistance.resistance,
        klines,
        latest_volume: klines.length > 0 ? (klines[klines.length-1]?.volume || 0) : 0,
        avg_volume: avgVol,
      });

      // 步骤 D: 策略建议
      const strategy = StrategyEngine.generate(trendAnalysis, riskAnalysis, {
        price, support: supportResistance.support, resistance: supportResistance.resistance,
        signalStrength: aiSignal.signal_strength,
      });
      console.log(`🎯 [AI/策略] ${strategy.bias} 置信度:${strategy.confidence}`);

      // 步骤 E: 报告生成（统一数据结构）
      const unifiedData = {
        stock: { name: finalStockName, code: stockCode, price, change_percent: changePercent },
        indicators: {
          ma5: mas.ma5, ma10: mas.ma10, ma20: mas.ma20, ma60: mas.ma60,
          dif: macdLine, dea: signalLine, macd: histogram,
          support: supportResistance.support, resistance: supportResistance.resistance,
          crossover_type: crossover.type,
        },
        market: { sector: sector.industry || '', related_stocks: relatedStocks },
        signals: {
          trend: aiSignal.trend,
          signal_strength: aiSignal.signal_strength,
          risk_level: aiSignal.risk_level,
          active_signals: aiSignal.signals,
          summary: aiSignal.summary,
        },
        strategy: {
          bias: strategy.bias, confidence: strategy.confidence,
          stopLoss: strategy.stopLoss, takeProfit: strategy.takeProfit,
          position: strategy.position, reasoning: strategy.reasoning,
        },
      };
      const aiReportV2 = ReportGenerator.generate(unifiedData);

      // ── 步骤7: 指标分析摘要（保留兼容） ──
      const indicatorSummary = closePrices.length > 0
        ? Indicators.generateAnalysis(klines, {
            macd: macdLine,
            signal: signalLine,
            histogram,
            support: supportResistance.support,
            resistance: supportResistance.resistance,
            crossover_type: crossover.type,
          })
        : { analysis: '', recommendation: '中性' };

      // ── 步骤8: 组装响应 ──
      const analysis = {
        id: uuidv4(),
        stock_code: stockCode,
        stock_name: finalStockName,
        price: safeNumber(price),
        change: safeNumber(changeAmount),
        change_percent: safeNumber(changePercent),
        support: safeNumber(supportResistance.support),
        resistance: safeNumber(supportResistance.resistance),
        macd: safeNumber(macdLine),
        signal: safeNumber(signalLine),
        macd_histogram: safeNumber(histogram),
        crossover: crossover.crossover || '无',
        crossover_type: crossover.type || 'none',
        // 优先使用 AI 分析（新引擎），回退到旧引擎，再回退到指标摘要
        analysis: aiReportV2.analysis || aiReport.analysis || indicatorSummary.analysis || '分析完成',
        recommendation: aiReportV2.recommendation || aiReport.recommendation || indicatorSummary.recommendation || '中性',
        risk: aiReportV2.risk || aiReport.risk || '中等',
        // ── 策略建议（新） ──
        strategy_bias: strategy.bias || '观望',
        strategy_confidence: strategy.confidence || 50,
        strategy_stop_loss: strategy.stopLoss || 0,
        strategy_take_profit: strategy.takeProfit || 0,
        strategy_position: strategy.position || '轻仓',
        key_points: aiReportV2.keyPoints || aiReport.keyPoints || [],
        // ── AI 信号引擎 ──
        signal_trend: signal.trend,
        signal_strength: signal.signal_strength,
        signal_risk: signal.risk_level,
        signals: signal.signals || [],
        signal_summary: signal.summary || '',
        signal_factors: signal.factors || {},
        // ── 板块 + 相关股票 ──
        sector: {
          name: sector.industry || '',
          change_percent: safeNumber(sector.change_percent),
          heat: sector.heat || '中性',
          description: sector.description || '',
          concepts: sector.concepts || [],
          region: sector.region || '',
        },
        related_stocks: (relatedStocks || []).map(s => ({
          name: s.name || '',
          code: s.code || '',
          price: safeNumber(s.price),
          change_percent: safeNumber(s.change_pct),
          tag: s.tag || '',
        })),
        // 附加信息
        market_name: marketService.resolveMarket(stockCode).marketName,
        trend_direction: trend.direction,
        trend_strength: trend.strength,
        avg_volume: avgVol,
        data_source: klines.length > 0 ? '东方财富实时行情' : '行情获取失败',
        data_updated_at: quote?.updated_at || new Date().toISOString(),
        image_path: `/uploads/${req.file.filename}`,
        kline_data: klines,
        // 保留 OCR 原始数据用于调试
        _ocr_texts: ocrTexts,
        _parsed_data: parsedData,
      };

      await AnalysisModel.save(analysis);

      const { kline_data, _ocr_texts, _parsed_data, ...responseData } = analysis;

      res.json({
        ...responseData,
        kline: kline_data,
        ocr_texts: ocrTexts,
        parsed_data: parsedData,
        message: marketFetchError
          ? `分析完成（行情获取失败：${marketFetchError}，部分数据可能不准确）`
          : '分析完成',
      });
    } catch (error) {
      console.error('Analysis error:', error);
      res.status(500).json({
        error: error.message || '分析过程中出错'
      });
    }
  }

  /**
   * 获取分析历史
   * GET /api/history?limit=10&offset=0
   */
  static async getHistory(req, res) {
    try {
      const limit = Math.min(parseInt(req.query.limit) || 10, 100);
      const offset = parseInt(req.query.offset) || 0;

      const result = await AnalysisModel.getHistory(limit, offset);

      res.json({
        data: result.data,
        pagination: {
          total: result.total,
          limit: result.limit,
          offset: result.offset,
          pages: Math.ceil(result.total / result.limit)
        }
      });
    } catch (error) {
      console.error('History error:', error);
      res.status(500).json({
        error: error.message || '获取历史记录失败'
      });
    }
  }

  /**
   * 获取单个分析记录
   * GET /api/analysis/:id
   */
  static async getAnalysis(req, res) {
    try {
      const analysis = await AnalysisModel.getById(req.params.id);

      if (!analysis) {
        return res.status(404).json({ error: '分析记录不存在' });
      }

      res.json(analysis);
    } catch (error) {
      console.error('Get analysis error:', error);
      res.status(500).json({
        error: error.message || '获取分析记录失败'
      });
    }
  }

  /**
   * 搜索分析记录
   * GET /api/search?code=600519&limit=10
   */
  static async search(req, res) {
    try {
      const stockCode = req.query.code;
      if (!stockCode) {
        return res.status(400).json({ error: '请提供股票代码' });
      }

      const limit = Math.min(parseInt(req.query.limit) || 10, 100);
      const offset = parseInt(req.query.offset) || 0;

      const results = await AnalysisModel.search(stockCode, limit, offset);

      res.json({
        data: results,
        query: stockCode
      });
    } catch (error) {
      console.error('Search error:', error);
      res.status(500).json({
        error: error.message || '搜索失败'
      });
    }
  }
}

module.exports = AnalysisController;
