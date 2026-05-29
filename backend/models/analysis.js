const db = require('../db/database');

/**
 * 安全序列化 JSON 字段
 */
function safeJSON(val, fallback = null) {
  if (val === null || val === undefined) return fallback;
  try { return JSON.stringify(val); } catch { return fallback; }
}

/**
 * 安全解析 JSON 字段
 */
function parseJSON(val, fallback = null) {
  if (!val) return fallback;
  try { return JSON.parse(val); } catch { return fallback; }
}

class AnalysisModel {

  /**
   * 保存分析记录（完整字段）
   */
  static async save(analysis) {
    const sql = `
      INSERT INTO analyses (
        id, stock_code, stock_name, price, change, change_percent,
        support, resistance, macd, signal, macd_histogram,
        crossover, crossover_type, analysis, recommendation, risk,
        image_path, kline_data,
        market_name, data_source, data_updated_at,
        trend_direction, trend_strength, avg_volume,
        key_points,
        signal_trend, signal_strength, signal_risk,
        signals, signal_summary, signal_factors,
        sector, related_stocks,
        strategy_bias, strategy_confidence,
        strategy_stop_loss, strategy_take_profit, strategy_position,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      analysis.id,
      analysis.stock_code || '',
      analysis.stock_name || '',
      analysis.price || 0,
      analysis.change || 0,
      analysis.change_percent || 0,
      analysis.support || 0,
      analysis.resistance || 0,
      analysis.macd || 0,
      analysis.signal || 0,
      analysis.macd_histogram || 0,
      analysis.crossover || '无',
      analysis.crossover_type || 'none',
      analysis.analysis || '',
      analysis.recommendation || '中性',
      analysis.risk || '中等',
      analysis.image_path || '',
      safeJSON(analysis.kline_data, '[]'),
      // 新增
      analysis.market_name || '',
      analysis.data_source || '',
      analysis.data_updated_at || '',
      analysis.trend_direction || '',
      analysis.trend_strength || '',
      analysis.avg_volume || 0,
      safeJSON(analysis.key_points, '[]'),
      analysis.signal_trend || '',
      analysis.signal_strength || 50,
      analysis.signal_risk || 'medium',
      safeJSON(analysis.signals, '[]'),
      analysis.signal_summary || '',
      safeJSON(analysis.signal_factors, '{}'),
      safeJSON(analysis.sector, '{}'),
      safeJSON(analysis.related_stocks, '[]'),
      analysis.strategy_bias || '观望',
      analysis.strategy_confidence || 50,
      analysis.strategy_stop_loss || 0,
      analysis.strategy_take_profit || 0,
      analysis.strategy_position || '轻仓',
      new Date().toISOString(),
      new Date().toISOString()
    ];

    await db.run(sql, params);

    // 保存 K 线明细
    if (analysis.kline_data && Array.isArray(analysis.kline_data)) {
      for (const kline of analysis.kline_data) {
        await this._saveKline(analysis.id, kline);
      }
    }

    return analysis.id;
  }

  static async _saveKline(analysisId, kline) {
    const sql = `INSERT INTO klines (analysis_id, date, open, high, low, close, volume)
      VALUES (?, ?, ?, ?, ?, ?, ?)`;
    await db.run(sql, [
      analysisId, kline.date, kline.open || 0,
      kline.high || 0, kline.low || 0, kline.close || 0, kline.volume || 0
    ]);
  }

  /**
   * 获取历史记录（增强版）
   */
  static async getHistory(limit = 10, offset = 0) {
    const sql = `SELECT
        id, stock_code, stock_name, price, change, change_percent,
        support, resistance, macd, signal, macd_histogram,
        crossover, crossover_type, analysis, recommendation, risk,
        market_name, signal_trend, signal_strength, signal_risk,
        signal_summary, strategy_bias, strategy_confidence,
        trend_direction, trend_strength, data_source,
        created_at
      FROM analyses ORDER BY created_at DESC LIMIT ? OFFSET ?`;

    const rows = await db.all(sql, [limit, offset]);

    const countResult = await db.get('SELECT COUNT(*) as total FROM analyses');

    return {
      data: (rows || []).map(r => ({
        ...r,
        key_points: parseJSON(r.key_points, []),
        signals: parseJSON(r.signals, []),
        sector: parseJSON(r.sector, {}),
        related_stocks: parseJSON(r.related_stocks, []),
      })),
      total: countResult?.total || 0,
      limit,
      offset
    };
  }

  /**
   * 获取单条记录（完整字段）
   */
  static async getById(id) {
    const sql = `SELECT * FROM analyses WHERE id = ?`;
    const row = await db.get(sql, [id]);
    if (!row) return null;

    // 解析 JSON 字段
    row.kline_data = parseJSON(row.kline_data, []);
    row.key_points = parseJSON(row.key_points, []);
    row.signals = parseJSON(row.signals, []);
    row.signal_factors = parseJSON(row.signal_factors, {});
    row.sector = parseJSON(row.sector, {});
    row.related_stocks = parseJSON(row.related_stocks, []);

    // 获取 K 线明细
    const klines = await db.all(
      `SELECT date, open, high, low, close, volume FROM klines WHERE analysis_id = ? ORDER BY date ASC`,
      [id]
    );
    row.klines = klines || [];

    return row;
  }

  /**
   * 搜索
   */
  static async search(stockCode, limit = 10, offset = 0) {
    const sql = `SELECT
        id, stock_code, stock_name, price, change_percent,
        crossover, crossover_type, analysis, recommendation,
        signal_trend, signal_strength, signal_risk,
        created_at
      FROM analyses
      WHERE stock_code LIKE ?
      ORDER BY created_at DESC LIMIT ? OFFSET ?`;

    return db.all(sql, [`%${stockCode}%`, limit, offset]);
  }

  /**
   * 删除
   */
  static async delete(id) {
    await db.run('DELETE FROM klines WHERE analysis_id = ?', [id]);
    return db.run('DELETE FROM analyses WHERE id = ?', [id]);
  }
}

module.exports = AnalysisModel;
