import React, { useState, useRef, useCallback, useEffect } from 'react';
import imageCompression from 'browser-image-compression';
import { RegionType, analyzeImage, AnalysisResponse } from './api';

// ─── Constants ────────────────────────────────────────────────
const MAX_WIDTH = 800;
const MAX_HEIGHT = 800;
const COMPRESSION_QUALITY = 0.7;

const REGION_COLORS: Record<RegionType, string> = {
  kline: '#3b82f6',
  macd: '#f97316',
};

const REGION_LABELS: Record<RegionType, string> = {
  kline: 'K 线图区',
  macd: 'MACD 区',
};

// ─── Types ────────────────────────────────────────────────────
interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface Region {
  type: RegionType;
  rect: Rect;
}

// ─── Helpers ──────────────────────────────────────────────────
function safeNumber(value: unknown, fallback = 0): number {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function clampNumber(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

// ─── Components ───────────────────────────────────────────────

// ------ Toast Notification ------
function Toast({
  message,
  type,
  onClose,
}: {
  message: string;
  type: 'error' | 'success';
  onClose: () => void;
}) {
  useEffect(() => {
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div
      className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-xl text-sm font-medium shadow-2xl animate-slide-in
        ${type === 'error' ? 'bg-red-500/90 text-white' : 'bg-emerald-500/90 text-white'}`}
    >
      {message}
    </div>
  );
}

// ------ Result Card ------
function ResultCard({
  title,
  value,
  confidence,
  cached,
  colorClass,
}: {
  title: string;
  value: string;
  confidence: number | null | undefined;
  cached: boolean;
  colorClass: string;
}) {
  const confidenceNum = confidence == null ? null : Number(confidence);
  const hasConfidence = confidenceNum !== null && Number.isFinite(confidenceNum);

  const confidencePercent = hasConfidence
    ? clampNumber(confidenceNum * 100, 0, 100)
    : 0;

  return (
    <div className="glass-card p-6 glow-blue transition-all duration-300 hover:scale-[1.01]">
      <div className="flex items-center justify-between mb-3">
        <span className="text-dark-300 text-xs uppercase tracking-widest">{title}</span>
        {cached && (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
            缓存
          </span>
        )}
      </div>

      <div className={`text-3xl font-bold ${colorClass} mb-2`}>{value}</div>

      {hasConfidence && (
        <div className="flex items-center gap-2 mt-3">
          <div className="flex-1 h-1.5 rounded-full bg-dark-700 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${
                colorClass.includes('text-') ? colorClass.replace('text-', 'bg-') : 'bg-blue-400'
              }`}
              style={{ width: `${confidencePercent.toFixed(0)}%` }}
            />
          </div>
          <span className="text-dark-400 text-xs tabular-nums w-10 text-right">
            {confidencePercent.toFixed(0)}%
          </span>
        </div>
      )}
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────
export default function App() {
  // State
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [imageDimensions, setImageDimensions] = useState<{ w: number; h: number } | null>(null);

  const [regions, setRegions] = useState<Region[]>([]);
  const [activeRegionType, setActiveRegionType] = useState<RegionType>('kline');

  const [isDrawing, setIsDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null);
  const [drawCurrent, setDrawCurrent] = useState<{ x: number; y: number } | null>(null);

  const [results, setResults] = useState<Record<string, AnalysisResponse & { _key: string }>>({});
  const [analyzing, setAnalyzing] = useState(false);

  const [toast, setToast] = useState<{ message: string; type: 'error' | 'success' } | null>(null);

  // Refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // ─── Toast helper ──────────────────────────────────────────
  const showToast = useCallback((message: string, type: 'error' | 'success') => {
    setToast({ message, type });
  }, []);

  // Clean up object URL to avoid memory leaks
  useEffect(() => {
    return () => {
      if (imageSrc) URL.revokeObjectURL(imageSrc);
    };
  }, [imageSrc]);

  // ─── Image upload & compression ─────────────────────────────
  const handleFileSelect = useCallback(
    async (file: File) => {
      if (!file.type.startsWith('image/')) {
        showToast('请上传图片文件', 'error');
        return;
      }

      try {
        const compressed = await imageCompression(file, {
          maxSizeMB: 0.5,
          maxWidthOrHeight: MAX_WIDTH,
          useWebWorker: true,
          initialQuality: COMPRESSION_QUALITY,
        });

        setImageFile(compressed);
        const url = URL.createObjectURL(compressed);
        setImageSrc(url);
        setRegions([]);
        setResults({});
        setImageDimensions(null);

        const img = new Image();
        img.onload = () => {
          setImageDimensions({ w: img.naturalWidth, h: img.naturalHeight });
        };
        img.src = url;
      } catch (err) {
        console.error(err);
        showToast('图片压缩失败', 'error');
      }
    },
    [showToast]
  );

  // Drag & Drop handlers
  const [dragOver, setDragOver] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFileSelect(file);
    },
    [handleFileSelect]
  );

  // ─── Canvas drawing helpers ────────────────────────────────
  const getCanvasCoords = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>): { x: number; y: number } => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
      };
    },
    []
  );

  // ─── Redraw canvas ──────────────────────────────────────────
  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img || !imageSrc) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = imageDimensions?.w || img.naturalWidth || 800;
    canvas.height = imageDimensions?.h || img.naturalHeight || 600;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    // Draw saved regions
    for (const region of regions) {
      const { x, y, w, h } = region.rect;
      const color = REGION_COLORS[region.type];

      ctx.strokeStyle = color;
      ctx.lineWidth = 2.5;
      ctx.setLineDash([6, 4]);
      ctx.strokeRect(x, y, w, h);

      // Label background
      ctx.fillStyle = color + 'dd';
      ctx.font = 'bold 12px sans-serif';
      const text = REGION_LABELS[region.type];
      const textMetrics = ctx.measureText(text);
      const textW = textMetrics.width + 12;
      const textH = 22;
      ctx.fillRect(x, y - textH - 4, textW, textH);

      ctx.fillStyle = '#ffffff';
      ctx.fillText(text, x + 6, y - 10);
    }

    // Draw in-progress rectangle
    if (isDrawing && drawStart && drawCurrent) {
      const color = REGION_COLORS[activeRegionType];
      const x = Math.min(drawStart.x, drawCurrent.x);
      const y = Math.min(drawStart.y, drawCurrent.y);
      const w = Math.abs(drawCurrent.x - drawStart.x);
      const h = Math.abs(drawCurrent.y - drawStart.y);

      ctx.strokeStyle = color;
      ctx.lineWidth = 2.5;
      ctx.setLineDash([6, 4]);
      ctx.strokeRect(x, y, w, h);
    }
  }, [regions, isDrawing, drawStart, drawCurrent, activeRegionType, imageDimensions, imageSrc]);

  useEffect(() => {
    redraw();
  }, [redraw]);

  // ─── Mouse event handlers ───────────────────────────────────
  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const coords = getCanvasCoords(e);
      setDrawStart(coords);
      setIsDrawing(true);
    },
    [getCanvasCoords]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!isDrawing) return;
      setDrawCurrent(getCanvasCoords(e));
    },
    [isDrawing, getCanvasCoords]
  );

  const handleMouseUp = useCallback(() => {
    if (!isDrawing || !drawStart || !drawCurrent) {
      setIsDrawing(false);
      return;
    }

    const x = Math.min(drawStart.x, drawCurrent.x);
    const y = Math.min(drawStart.y, drawCurrent.y);
    const w = Math.abs(drawCurrent.x - drawStart.x);
    const h = Math.abs(drawCurrent.y - drawStart.y);

    setIsDrawing(false);
    setDrawStart(null);
    setDrawCurrent(null);

    if (w < 15 || h < 15) return;

    const newRegion: Region = {
      type: activeRegionType,
      rect: { x, y, w, h },
    };

    setRegions((prev) => [...prev, newRegion]);
  }, [isDrawing, drawStart, drawCurrent, activeRegionType]);

  // ─── Crop & analyze ─────────────────────────────────────────
  const cropAndAnalyze = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas || regions.length === 0) return;

    setAnalyzing(true);
    const newResults: Record<string, AnalysisResponse & { _key: string }> = {};

    try {
      for (let i = 0; i < regions.length; i++) {
        const region = regions[i];
        const { x, y, w, h } = region.rect;

        const cropCanvas = document.createElement('canvas');
        cropCanvas.width = w;
        cropCanvas.height = h;

        const cropCtx = cropCanvas.getContext('2d');
        if (!cropCtx) {
          throw new Error('无法创建裁剪画布');
        }

        cropCtx.drawImage(canvas, x, y, w, h, 0, 0, w, h);

        const base64 = cropCanvas.toDataURL('image/jpeg', 0.75).split(',')[1];
        const key = `${region.type}_${i}`;

        try {
          const result = await analyzeImage(base64, region.type);
          newResults[key] = { ...result, _key: key };
        } catch (err: any) {
          newResults[key] = {
            error: err?.message || '分析失败',
            _key: key,
          } as AnalysisResponse & { _key: string };
        }
      }

      setResults(newResults);
      showToast('分析完成', 'success');
    } catch (err: any) {
      showToast(`分析失败: ${err?.message || '未知错误'}`, 'error');
    } finally {
      setAnalyzing(false);
    }
  }, [regions, showToast]);

  // ─── Clear regions ──────────────────────────────────────────
  const clearRegions = useCallback(() => {
    setRegions([]);
    setResults({});
  }, []);

  // ─── Render ─────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-dark-950">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <header className="relative overflow-hidden border-b border-dark-800/50">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 via-purple-600/10 to-pink-600/10" />
        <div className="relative max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center text-xl shadow-lg shadow-blue-500/20">
              📈
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                SnapVision
              </h1>
              <p className="text-dark-400 text-xs">智能股票图表分析</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-dark-400 text-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            系统就绪
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        {!imageSrc ? (
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`
              glass-card p-16 flex flex-col items-center justify-center gap-6 cursor-pointer
              transition-all duration-300
              ${dragOver ? 'border-blue-400 scale-[1.01] glow-blue' : 'hover:border-dark-600'}
            `}
          >
            <div
              className={`w-24 h-24 rounded-3xl flex items-center justify-center text-4xl
                transition-all duration-500 ${dragOver ? 'gradient-primary scale-110 shadow-2xl' : 'bg-dark-700'}`}
            >
              📁
            </div>
            <div className="text-center space-y-1">
              <p className="text-dark-200 text-lg font-semibold">
                {dragOver ? '释放以上传' : '上传股票图表截图'}
              </p>
              <p className="text-dark-400 text-sm">拖拽图片到此处，或点击选择文件</p>
              <p className="text-dark-500 text-xs mt-2">支持 PNG、JPEG · 自动压缩至 800px</p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFileSelect(f);
              }}
            />
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-dark-400 text-xs uppercase tracking-wider">框选区域类型:</span>
                <div className="flex rounded-xl overflow-hidden border border-dark-700">
                  {(['kline', 'macd'] as RegionType[]).map((type) => (
                    <button
                      key={type}
                      onClick={() => setActiveRegionType(type)}
                      className={`px-4 py-2 text-sm font-medium transition-all duration-200 ${
                        activeRegionType === type
                          ? type === 'kline'
                            ? 'bg-blue-500/20 text-blue-300'
                            : 'bg-orange-500/20 text-orange-300'
                          : 'text-dark-400 hover:text-dark-200 hover:bg-dark-800'
                      }`}
                    >
                      {REGION_LABELS[type]}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex-1" />

              <button
                onClick={() => {
                  setImageSrc(null);
                  setImageFile(null);
                  setRegions([]);
                  setResults({});
                  setImageDimensions(null);
                }}
                className="glass-button text-dark-300 hover:text-dark-100 border border-dark-700 hover:border-dark-500"
              >
                重新上传
              </button>
              <button
                onClick={clearRegions}
                disabled={regions.length === 0}
                className="glass-button text-dark-300 hover:text-dark-100 border border-dark-700 hover:border-dark-500"
              >
                清除选框
              </button>
              <button
                onClick={cropAndAnalyze}
                disabled={regions.length === 0 || analyzing}
                className="glass-button gradient-primary text-white shadow-lg shadow-blue-500/25"
              >
                {analyzing ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    分析中...
                  </span>
                ) : (
                  `分析 ${regions.length} 个区域`
                )}
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
              <div className="glass-card p-4 overflow-hidden">
                <div className="relative" ref={containerRef}>
                  <img ref={imageRef} src={imageSrc} alt="Stock chart" className="hidden" draggable={false} />
                  <canvas
                    ref={canvasRef}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={() => {
                      if (isDrawing) {
                        setIsDrawing(false);
                        setDrawStart(null);
                        setDrawCurrent(null);
                      }
                    }}
                    className="w-full cursor-crosshair rounded-lg"
                    style={{ maxHeight: '70vh', objectFit: 'contain' }}
                  />
                  <p className="absolute bottom-3 left-3 text-dark-500 text-[10px] bg-dark-900/60 px-2 py-0.5 rounded">
                    按住鼠标拖拽框选区域 · 当前模式: {REGION_LABELS[activeRegionType]}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-dark-300 text-xs uppercase tracking-widest font-semibold">
                  分析结果 {Object.keys(results).length > 0 && `(${Object.keys(results).length})`}
                </h3>

                {Object.keys(results).length === 0 && !analyzing && (
                  <div className="glass-card p-8 text-center">
                    <div className="text-4xl mb-3 opacity-30">🎯</div>
                    <p className="text-dark-500 text-sm">在图表上框选区域后点击分析</p>
                    <p className="text-dark-600 text-xs mt-1">支持 K 线形态 和 MACD 信号识别</p>
                  </div>
                )}

                {analyzing && (
                  <div className="glass-card p-8 text-center animate-pulse-glow">
                    <div className="w-10 h-10 mx-auto mb-4 rounded-full border-2 border-blue-400 border-t-transparent animate-spin" />
                    <p className="text-dark-300 text-sm">正在调用视觉分析...</p>
                    <p className="text-dark-500 text-xs mt-1">请稍候</p>
                  </div>
                )}

                <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
                  {Object.entries(results).map(([key, result]) => {
                    const regionType = key.split('_')[0] as RegionType;
                    const isKline = regionType === 'kline';

                    if (result.error) {
                      return (
                        <div key={key} className="glass-card p-4 border-red-500/30">
                          <div className="text-red-400 text-sm font-medium">分析失败</div>
                          <div className="text-red-300/60 text-xs mt-1">{result.error}</div>
                        </div>
                      );
                    }

                    return (
                      <ResultCard
                        key={key}
                        title={isKline ? 'K 线形态 · ' + REGION_LABELS[regionType] : 'MACD 信号 · ' + REGION_LABELS[regionType]}
                        value={isKline ? (result.kline_pattern ?? '未知') : (result.macd_signal ?? '未知')}
                        confidence={result.confidence ?? null}
                        cached={result.cached ?? false}
                        colorClass={
                          isKline
                            ? result.kline_pattern === '阳线'
                              ? 'text-emerald-400'
                              : result.kline_pattern === '阴线'
                              ? 'text-red-400'
                              : 'text-amber-400'
                            : result.macd_signal === '金叉'
                            ? 'text-emerald-400'
                            : result.macd_signal === '死叉'
                            ? 'text-red-400'
                            : 'text-dark-300'
                        }
                      />
                    );
                  })}
                </div>
              </div>
            </div>
          </>
        )}
      </main>

      <footer className="border-t border-dark-800/50 mt-12">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between text-dark-500 text-xs">
          <span>SnapVision · 基于视觉识别</span>
          <span>所有分析仅供参考 · 不构成投资建议</span>
        </div>
      </footer>
    </div>
  );
}