const express = require('express');
const router = express.Router();
const upload = require('../utils/multerConfig');
const AnalysisController = require('../controllers/analysisController');

// POST /api/analyze - Upload and analyze
router.post('/analyze', upload.single('file'), AnalysisController.analyze);

// GET /api/history - Get analysis history
router.get('/history', AnalysisController.getHistory);

// GET /api/analysis/:id - Get single analysis
router.get('/analysis/:id', AnalysisController.getAnalysis);

// GET /api/search - Search analysis by stock code
router.get('/search', AnalysisController.search);

module.exports = router;
