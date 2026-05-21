const { v4: uuidv4 } = require('uuid');
const AnalysisModel = require('../models/analysis');
const Indicators = require('../utils/indicators');
const KlineParser = require('../utils/klineParser');

class AnalysisController {
  /**
   * 分析上传的图片
   * POST /api/analyze
   */
  static async analyze(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({ error: '请上传图片文件' });
      }

      // Extract stock info from filename
      const stockInfo = KlineParser.extractStockInfo(req.file.originalname);

      // Generate mock analysis data
      const mockData = KlineParser.generateMockAnalysis(
        stockInfo.code,
        stockInfo.name
      );

      // Calculate technical indicators
      const macdData = Indicators.macd(mockData.klines.map(k => k.close));
      const crossover = Indicators.getCrossover(macdData);
      const supportResistance = Indicators.getSupportResistance(mockData.klines);
      const analysisText = Indicators.generateAnalysis(
        mockData.klines,
        {
          macd: macdData.macd,
          signal: macdData.signal,
          histogram: macdData.histogram,
          ...supportResistance
        }
      );

      // Create analysis object
      const analysis = {
        id: uuidv4(),
        stock_code: mockData.stock_code,
        stock_name: mockData.stock_name,
        price: mockData.price,
        change_percent: mockData.change_percent,
        support: supportResistance.support,
        resistance: supportResistance.resistance,
        macd: macdData.macd,
        signal: macdData.signal,
        macd_histogram: macdData.histogram,
        crossover: crossover.crossover,
        crossover_type: crossover.type,
        analysis: analysisText.analysis,
        recommendation: analysisText.recommendation,
        image_path: `/uploads/${req.file.filename}`,
        kline_data: mockData.klines
      };

      // Save to database
      await AnalysisModel.save(analysis);

      // Return response (exclude internal fields)
      const { kline_data, ...responseData } = analysis;
      res.json({
        ...responseData,
        kline: kline_data,
        message: '分析完成'
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
