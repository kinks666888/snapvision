const db = require('../db/database');

class AnalysisModel {
  /**
   * 保存分析结果
   */
  static async save(analysis) {
    const sql = `
      INSERT INTO analyses (
        id, stock_code, stock_name, price, change_percent,
        support, resistance, macd, signal, macd_histogram,
        crossover, crossover_type, analysis, recommendation,
        image_path, kline_data, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      analysis.id,
      analysis.stock_code,
      analysis.stock_name,
      analysis.price,
      analysis.change_percent,
      analysis.support,
      analysis.resistance,
      analysis.macd,
      analysis.signal,
      analysis.macd_histogram,
      analysis.crossover,
      analysis.crossover_type,
      analysis.analysis,
      analysis.recommendation,
      analysis.image_path,
      JSON.stringify(analysis.kline_data),
      new Date().toISOString(),
      new Date().toISOString()
    ];

    await db.run(sql, params);

    // Save kline data to klines table
    if (analysis.kline_data && Array.isArray(analysis.kline_data)) {
      for (const kline of analysis.kline_data) {
        await this.saveKline(analysis.id, kline);
      }
    }

    return analysis.id;
  }

  /**
   * 保存 K 线数据
   */
  static async saveKline(analysisId, kline) {
    const sql = `
      INSERT INTO klines (analysis_id, date, open, high, low, close, volume)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      analysisId,
      kline.date,
      kline.open,
      kline.high,
      kline.low,
      kline.close,
      kline.volume || 0
    ];

    return db.run(sql, params);
  }

  /**
   * 获取分析历史记录
   */
  static async getHistory(limit = 10, offset = 0) {
    const sql = `
      SELECT 
        id, stock_code, stock_name, price, change_percent,
        support, resistance, macd, signal, macd_histogram,
        crossover, crossover_type, analysis, recommendation,
        created_at
      FROM analyses
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `;

    const analyses = await db.all(sql, [limit, offset]);

    // Get total count
    const countSql = 'SELECT COUNT(*) as total FROM analyses';
    const countResult = await db.get(countSql);

    return {
      data: analyses,
      total: countResult.total,
      limit,
      offset
    };
  }

  /**
   * 获取单个分析记录
   */
  static async getById(id) {
    const sql = `
      SELECT 
        id, stock_code, stock_name, price, change_percent,
        support, resistance, macd, signal, macd_histogram,
        crossover, crossover_type, analysis, recommendation,
        image_path, kline_data, created_at, updated_at
      FROM analyses
      WHERE id = ?
    `;

    const analysis = await db.get(sql, [id]);

    if (analysis && analysis.kline_data) {
      analysis.kline_data = JSON.parse(analysis.kline_data);
    }

    // Also fetch from klines table
    if (analysis) {
      const klinesql = `
        SELECT date, open, high, low, close, volume
        FROM klines
        WHERE analysis_id = ?
        ORDER BY date ASC
      `;
      analysis.klines = await db.all(klinesql, [id]);
    }

    return analysis;
  }

  /**
   * 删除分析记录
   */
  static async delete(id) {
    const sql = 'DELETE FROM analyses WHERE id = ?';
    return db.run(sql, [id]);
  }

  /**
   * 搜索分析记录
   */
  static async search(stockCode, limit = 10, offset = 0) {
    const sql = `
      SELECT 
        id, stock_code, stock_name, price, change_percent,
        support, resistance, macd, signal, macd_histogram,
        crossover, crossover_type, analysis, recommendation,
        created_at
      FROM analyses
      WHERE stock_code LIKE ?
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `;

    return db.all(sql, [`%${stockCode}%`, limit, offset]);
  }
}

module.exports = AnalysisModel;
