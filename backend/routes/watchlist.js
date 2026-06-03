const express = require('express');
const router = express.Router();
const WatchlistModel = require('../models/watchlist');

// GET /api/watchlist — 获取全部关注
router.get('/watchlist', async (req, res, next) => {
  try {
    const items = await WatchlistModel.getAll();
    res.json({ data: items });
  } catch (err) {
    next(err);
  }
});

// POST /api/watchlist — 添加关注
router.post('/watchlist', async (req, res, next) => {
  try {
    const { stock_code, stock_name, signal_strength, signal_risk, signal_trend, analysis_id } = req.body;

    if (!stock_code) {
      return res.status(400).json({ error: '股票代码不能为空' });
    }

    const id = await WatchlistModel.add({
      stock_code,
      stock_name,
      signal_strength,
      signal_risk,
      signal_trend,
      analysis_id
    });

    res.json({ success: true, id });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/watchlist/:id — 取消关注
router.delete('/watchlist/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: '无效的 ID' });
    }
    await WatchlistModel.remove(id);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
