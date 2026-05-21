-- Analyses Table (分析记录表)
CREATE TABLE IF NOT EXISTS analyses (
  id TEXT PRIMARY KEY,
  stock_code TEXT NOT NULL,
  stock_name TEXT,
  price REAL,
  change_percent REAL,
  support REAL,
  resistance REAL,
  macd REAL,
  signal REAL,
  macd_histogram REAL,
  crossover TEXT,
  crossover_type TEXT,
  analysis TEXT,
  recommendation TEXT,
  image_path TEXT,
  kline_data JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- K-line Data Table (K线数据表)
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

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_analyses_stock_code ON analyses(stock_code);
CREATE INDEX IF NOT EXISTS idx_analyses_created_at ON analyses(created_at);
CREATE INDEX IF NOT EXISTS idx_klines_analysis_id ON klines(analysis_id);
