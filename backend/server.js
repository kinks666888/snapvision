const express = require('express');
const cors = require('cors');
const path = require('path');
const { spawn, execSync } = require('child_process');
const http = require('http');
require('dotenv').config();

// Import routes and database
const analyzeRoutes = require('./routes/analyze');
const watchlistRoutes = require('./routes/watchlist');
const db = require('./db/database');

const app = express();
const PORT = process.env.PORT || 5001;

// ── Serve frontend static files (eliminates separate frontend server) ──
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// Middleware
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests from:
    const allowedOrigins = [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'http://localhost',
      process.env.FRONTEND_URL
    ];
    
    // Allow file:// protocol for local development
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(null, true); // Allow all for development
    }
  },
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api', analyzeRoutes);
app.use('/api', watchlistRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// ── OCR 常驻服务 ──────────────────────────────────────────────
const OCR_PORT = 5002;
const OCR_URL = `http://127.0.0.1:${OCR_PORT}`;
let ocrProcess = null;

// Check if OCR is healthy
function checkOcrHealth() {
  return new Promise((resolve) => {
    const req = http.get(`${OCR_URL}/health`, (res) => {
      let body = '';
      res.on('data', (c) => (body += c));
      res.on('end', () => {
        try {
          const data = JSON.parse(body);
          resolve(data.model === 'loaded');
        } catch (_) { resolve(false); }
      });
    });
    req.on('error', () => resolve(false));
    req.end();
  });
}

// Wait for OCR to become healthy (polling)
function waitForOcr(maxAttempts = 60) {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    const poll = () => {
      attempts++;
      const req = http.get(`${OCR_URL}/health`, (res) => {
        let body = '';
        res.on('data', (c) => (body += c));
        res.on('end', () => {
          try {
            const data = JSON.parse(body);
            if (data.model === 'loaded') {
              console.log('[Backend] OCR Service Connected');
              resolve();
              return;
            }
          } catch (_) {}
          if (attempts < maxAttempts) setTimeout(poll, 1000);
          else reject(new Error('OCR health check timeout'));
        });
      });
      req.on('error', () => {
        if (attempts < maxAttempts) setTimeout(poll, 1000);
        else reject(new Error('OCR not reachable after 60s'));
      });
      req.end();
    };
    setTimeout(poll, 1000);
  });
}

// Spawn OCR server child process
function spawnOcrProcess() {
  const pythonBin = process.env.PYTHON_BIN || 'python3';
  const ocrScript = path.join(__dirname, 'ocr_server.py');
  console.log(`[Backend] Starting OCR server: ${pythonBin} ${ocrScript}`);

  ocrProcess = spawn(pythonBin, [ocrScript], {
    env: { ...process.env, OCR_PORT: String(OCR_PORT), PYTHONUNBUFFERED: '1' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  ocrProcess.stdout.on('data', (data) => {
    const msg = data.toString().trim();
    if (msg) console.log(`[OCR stdout] ${msg}`);
  });

  ocrProcess.stderr.on('data', (data) => {
    const msg = data.toString().trim();
    if (msg && (msg.includes('Error') || msg.includes('Traceback'))) {
      console.error(`[OCR stderr] ${msg}`);
    }
  });

  ocrProcess.on('error', (err) => {
    console.error(`[Backend] OCR process error: ${err.message}`);
  });

  ocrProcess.on('exit', (code) => {
    console.log(`[Backend] OCR process exited with code ${code}`);
    ocrProcess = null;
  });
}

// Main: ensure OCR is running
async function startOcrServer() {
  // If port 5002 is held by a stale process, kill it first
  const alreadyHealthy = await checkOcrHealth();
  if (alreadyHealthy) {
    console.log('[Backend] OCR Service already running — reusing');
    return;
  }

  // If there's a stale process on 5002 that doesn't respond, kill it
  try {
    require('child_process').execSync('lsof -ti :5002 | xargs kill -9 2>/dev/null', { timeout: 2000 });
  } catch (_) {}

  spawnOcrProcess();
  await waitForOcr();
}

function stopOcrServer() {
  return new Promise((resolve) => {
    if (!ocrProcess) {
      resolve();
      return;
    }
    console.log('[Backend] Stopping OCR server...');

    // 优雅退出：等待 Python 子进程自己退出
    const forceKillTimer = setTimeout(() => {
      if (ocrProcess) {
        console.log('[Backend] OCR graceful shutdown timeout, sending SIGKILL');
        ocrProcess.kill('SIGKILL');
      }
    }, 3000);

    ocrProcess.on('exit', (code) => {
      clearTimeout(forceKillTimer);
      console.log(`[Backend] OCR process exited with code ${code}`);
      ocrProcess = null;
      resolve();
    });

    // 发送 SIGTERM 让 Python 自己优雅退出
    ocrProcess.kill('SIGTERM');
  });
}

// 导出 OCR URL 供控制器使用
module.exports.OCR_URL = OCR_URL;

// Cleanup on exit — 异步等待子进程真正退出后再 exit
process.on('SIGINT', async () => {
  console.log('\n[Backend] Received SIGINT');
  await stopOcrServer();
  process.exit(0);
});
process.on('SIGTERM', async () => {
  console.log('\n[Backend] Received SIGTERM');
  await stopOcrServer();
  process.exit(0);
});

// ── Start ────────────────────────────────────────────────────
// Initialize database and start server
async function startServer() {
  try {
    // Start OCR service first
    await startOcrServer();
    await db.init();
    
    app.listen(PORT, () => {
      console.log(`🚀 SnapVision API Server running at http://localhost:${PORT}`);
      console.log(`📊 Frontend: http://localhost:${PORT}`);
      console.log(`📡 OCR: http://localhost:${OCR_PORT}`);
      console.log(`✅ Database ready!`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    stopOcrServer();
    process.exit(1);
  }
}

startServer();

module.exports = app;
