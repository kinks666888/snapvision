const db = require('../db/database');

class WatchlistModel {

  /**
   * 获取全部关注列表（按添加时间倒序）
   */
  static async getAll() {
    const sql = `SELECT * FROM watchlists ORDER BY created_at DESC`;
    return db.all(sql);
  }

  /**
   * 添加关注
   * @param {Object} item - { stock_code, stock_name, signal_strength, signal_risk, signal_trend, analysis_id }
   * @returns {number} 新增记录的 id
   */
  static async add(item) {
    // 检查是否已存在（同股票代码去重）
    const existing = await db.get(
      `SELECT id FROM watchlists WHERE stock_code = ?`,
      [item.stock_code]
    );
    if (existing) {
      // 已存在则更新评分信息
      await db.run(
        `UPDATE watchlists SET
          signal_strength = ?, signal_risk = ?, signal_trend = ?,
          analysis_id = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?`,
        [
          item.signal_strength || 0,
          item.signal_risk || 'medium',
          item.signal_trend || '',
          item.analysis_id || null,
          existing.id
        ]
      );
      return existing.id;
    }

    const sql = `
      INSERT INTO watchlists (stock_code, stock_name, signal_strength, signal_risk, signal_trend, analysis_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    const result = await db.run(sql, [
      item.stock_code,
      item.stock_name || '',
      item.signal_strength || 0,
      item.signal_risk || 'medium',
      item.signal_trend || '',
      item.analysis_id || null
    ]);
    return result.id;
  }

  /**
   * 取消关注
   * @param {number} id
   */
  static async remove(id) {
    return db.run(`DELETE FROM watchlists WHERE id = ?`, [id]);
  }

  /**
   * 根据 ID 查询
   */
  static async getById(id) {
    return db.get(`SELECT * FROM watchlists WHERE id = ?`, [id]);
  }

  /**
   * 根据股票代码查询
   */
  static async findByStockCode(code) {
    return db.get(`SELECT * FROM watchlists WHERE stock_code = ?`, [code]);
  }
}

module.exports = WatchlistModel;
