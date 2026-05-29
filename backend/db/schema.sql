-- SnapVision 分析记录表（完整版）
CREATE TABLE IF NOT EXISTS analyses (
  id TEXT PRIMARY KEY,
  stock_code TEXT NOT NULL,
  stock_name TEXT,
  price REAL DEFAULT 0,
  change REAL DEFAULT 0,
  change_percent REAL DEFAULT 0,
  support REAL DEFAULT 0,
  resistance REAL DEFAULT 0,
  macd REAL DEFAULT 0,
  signal REAL DEFAULT 0,
  macd_histogram REAL DEFAULT 0,
  crossover TEXT DEFAULT '无',
  crossover_type TEXT DEFAULT 'none',
  analysis TEXT DEFAULT '',
  recommendation TEXT DEFAULT '中性',
  risk TEXT DEFAULT '中等',
  image_path TEXT DEFAULT '',
  kline_data JSON,
  -- 新增字段（第二阶段）
  market_name TEXT DEFAULT '',
  data_source TEXT DEFAULT '',
  data_updated_at TEXT DEFAULT '',
  trend_direction TEXT DEFAULT '',
  trend_strength TEXT DEFAULT '',
  avg_volume REAL DEFAULT 0,
  key_points JSON,
  signal_trend TEXT DEFAULT '',
  signal_strength INTEGER DEFAULT 50,
  signal_risk TEXT DEFAULT 'medium',
  signals JSON,
  signal_summary TEXT DEFAULT '',
  signal_factors JSON,
  sector JSON,
  related_stocks JSON,
  strategy_bias TEXT DEFAULT '观望',
  strategy_confidence INTEGER DEFAULT 50,
  strategy_stop_loss REAL DEFAULT 0,
  strategy_take_profit REAL DEFAULT 0,
  strategy_position TEXT DEFAULT '轻仓',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- K线数据表
CREATE TABLE IF NOT EXISTS klines (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  analysis_id TEXT NOT NULL,
  date TEXT NOT NULL,
  open REAL NOT NULL,
  high REAL NOT NULL,
  low REAL NOT NULL,
  close REAL NOT NULL,
  volume INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(analysis_id) REFERENCES analyses(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_analyses_stock_code ON analyses(stock_code);
CREATE INDEX IF NOT EXISTS idx_analyses_created_at ON analyses(created_at);
CREATE INDEX IF NOT EXISTS idx_klines_analysis_id ON klines(analysis_id);
