const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const DB_PATH = process.env.DB_PATH || './db/snapvision.db';

class Database {
  constructor() {
    this.db = null;
  }

  // Initialize database connection and create tables
  async init() {
    return new Promise((resolve, reject) => {
      // Create db directory if not exists
      const dbDir = path.dirname(DB_PATH);
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
      }

      this.db = new sqlite3.Database(DB_PATH, (err) => {
        if (err) {
          console.error('Database connection error:', err);
          reject(err);
        } else {
          console.log(`✅ Connected to database: ${DB_PATH}`);
          this.createTables()
            .then(() => resolve())
            .catch(reject);
        }
      });
    });
  }

  // Create tables + auto-migrate
  async createTables() {
    const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8');
    const statements = schema.split(';').filter(s => s.trim());

    return new Promise((resolve, reject) => {
      const runAll = async () => {
        for (const statement of statements) {
          const stmt = statement.trim();
          if (!stmt) continue;
          await this.run(stmt).catch(err => {
            // 表已存在不是错误
            if (!err.message.includes('already exists')) {
              console.error('Schema error:', err.message);
            }
          });
        }

        // ── 自动迁移：补齐缺失的列 ──
        await this._migrateColumns();

        console.log('📋 Database tables created/verified');
        resolve();
      };
      runAll().catch(reject);
    });
  }

  // 自动添加 schema 中有但表中缺失的列
  async _migrateColumns() {
    const newColumns = [
      { name: 'change',              type: 'REAL DEFAULT 0' },
      { name: 'risk',                type: 'TEXT DEFAULT \'中等\'' },
      { name: 'market_name',         type: 'TEXT DEFAULT \'\'' },
      { name: 'data_source',         type: 'TEXT DEFAULT \'\'' },
      { name: 'data_updated_at',     type: 'TEXT DEFAULT \'\'' },
      { name: 'trend_direction',     type: 'TEXT DEFAULT \'\'' },
      { name: 'trend_strength',      type: 'TEXT DEFAULT \'\'' },
      { name: 'avg_volume',          type: 'REAL DEFAULT 0' },
      { name: 'key_points',          type: 'JSON' },
      { name: 'signal_trend',        type: 'TEXT DEFAULT \'\'' },
      { name: 'signal_strength',     type: 'INTEGER DEFAULT 50' },
      { name: 'signal_risk',         type: 'TEXT DEFAULT \'medium\'' },
      { name: 'signals',             type: 'JSON' },
      { name: 'signal_summary',      type: 'TEXT DEFAULT \'\'' },
      { name: 'signal_factors',      type: 'JSON' },
      { name: 'sector',              type: 'JSON' },
      { name: 'related_stocks',      type: 'JSON' },
      { name: 'strategy_bias',       type: 'TEXT DEFAULT \'观望\'' },
      { name: 'strategy_confidence', type: 'INTEGER DEFAULT 50' },
      { name: 'strategy_stop_loss',  type: 'REAL DEFAULT 0' },
      { name: 'strategy_take_profit',type: 'REAL DEFAULT 0' },
      { name: 'strategy_position',   type: 'TEXT DEFAULT \'轻仓\'' },
    ];

    for (const col of newColumns) {
      try {
        await this.run(`ALTER TABLE analyses ADD COLUMN ${col.name} ${col.type}`);
      } catch (err) {
        // 列已存在 → 忽略
        if (!err.message.includes('duplicate column')) {
          console.warn(`  ⚠ 迁移列 ${col.name} 失败:`, err.message);
        }
      }
    }
  }

  // Execute a single query
  run(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) reject(err);
        else resolve({ id: this.lastID, changes: this.changes });
      });
    });
  }

  // Fetch one row
  get(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  // Fetch all rows
  all(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
  }

  // Close database connection
  close() {
    return new Promise((resolve, reject) => {
      if (this.db) {
        this.db.close((err) => {
          if (err) reject(err);
          else {
            console.log('📊 Database connection closed');
            resolve();
          }
        });
      } else {
        resolve();
      }
    });
  }
}

module.exports = new Database();
